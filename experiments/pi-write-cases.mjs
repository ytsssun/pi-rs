import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SessionManager } from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';

// Independent acceptance sequences derived from pinned SessionManager, not Rust's diff.
const user = { role: 'user', content: [{ type: 'text', text: 'fixed user' }], timestamp: 1 };
const assistant = { role: 'assistant', content: [{ type: 'text', text: 'fixed assistant' }], api: 'fixture', provider: 'fixture', model: 'fixture', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop', timestamp: 2 };
const header = { type: 'session', version: 3, id: 'write-case-session', timestamp: '2026-01-01T00:00:00.000Z', cwd: '/workspace/pi-write-case' };
const seeded = { type: 'message', id: 'seed-user', parentId: null, timestamp: header.timestamp, message: user };
const read = path => existsSync(path) ? readFileSync(path, 'utf8') : null;
const parse = path => read(path)?.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) ?? null;
function normalize(entries, all) {
  if (entries === null) return null;
  const ids = new Map(all.filter(e => e.type !== 'session').map((e, i) => [e.id, `entry-${i}`]));
  return entries.map(e => {
    const result = structuredClone(e);
    if (result.type === 'session') result.id = 'session';
    else {
      result.id = ids.get(result.id);
      result.parentId = result.parentId === null ? null : ids.get(result.parentId) ?? result.parentId;
    }
    result.timestamp = '<generated>';
    return result;
  });
}
export const upstreamFactory = ({ path, cwd }) => SessionManager.open(path, dirname(path), cwd);
export async function runWriteCases(factory) {
  const root = mkdtempSync(join(tmpdir(), 'pi-write-cases-'));
  const results = [];
  async function scenario(name, initial, body) {
    const path = join(root, `${name}.jsonl`);
    if (initial !== null) writeFileSync(path, initial.map(e => JSON.stringify(e)).join('\n') + '\n');
    let store;
    const open = async (mode = 'open') => {
      if (store?.close) await store.close();
      store = await factory({ path, cwd: header.cwd, mode });
      return store;
    };
    const capture = async () => {
      const all = await store.getEntries();
      return { entries: normalize(all, all), branch: normalize(await store.getBranch(), all), disk: normalize(parse(path), all) };
    };
    try {
      await open(initial === null ? 'create' : 'open');
      assert.equal(await store.getSessionFile(), path);
      const observations = await body({ get store() { return store; }, open, capture, path });
      results.push({ name, observations });
    } finally { if (store?.close) await store.close(); }
  }
  try {
    await scenario('delayed-first-flush', null, async ctx => {
      assert.equal(read(ctx.path), null);
      await ctx.store.appendCustomEntry('state', { nested: { id: 'must-not-normalize' } });
      await ctx.store.appendMessage(user);
      const before = await ctx.capture();
      assert.equal(before.disk, null);
      assert.equal(before.entries.length, 2);
      await ctx.store.appendMessage(assistant);
      const after = await ctx.capture();
      assert.equal(after.disk.length, 4);
      assert.deepEqual(after.disk.slice(1), after.entries);
      return { before, after };
    });
    await scenario('branch-append-reopen', [header, seeded], async ctx => {
      const first = await ctx.store.appendMessage(assistant);
      const oldTip = await ctx.store.appendCustomEntry('state', { lane: 'old' });
      const original = read(ctx.path);
      await ctx.store.branch('seed-user');
      assert.equal(read(ctx.path), original, 'branch navigation must not write history');
      const branched = await ctx.capture();
      assert.equal(branched.branch.length, 1);
      await ctx.open();
      assert.equal((await ctx.store.getBranch()).at(-1).id, oldTip, 'reopen selects disk tip, not last navigation');
      await ctx.store.branch(first);
      const newTip = await ctx.store.appendCustomEntry('state', { lane: 'new' });
      assert.ok(read(ctx.path).startsWith(original), 'append must preserve existing bytes');
      await ctx.open();
      assert.equal((await ctx.store.getBranch()).at(-1).id, newTip);
      const after = await ctx.capture();
      assert.equal(after.entries.length, 4);
      assert.equal(after.branch.length, 3);
      assert.equal(after.branch.at(-1).data.lane, 'new');
      return { branched, after };
    });
    await scenario('reset-new-root', [header, seeded], async ctx => {
      const original = read(ctx.path);
      await ctx.store.resetLeaf();
      assert.equal(read(ctx.path), original);
      assert.deepEqual(await ctx.store.getBranch(), []);
      await ctx.store.appendCustomEntry('root', { count: 1 });
      await ctx.open();
      const after = await ctx.capture();
      assert.equal(after.branch.length, 1);
      assert.equal(after.branch[0].parentId, null);
      assert.equal(after.entries.length, 2);
      return after;
    });
    await scenario('existing-without-assistant', [header, seeded], async ctx => {
      const original = read(ctx.path);
      await ctx.store.appendCustomEntry('state', { ready: true });
      assert.ok(read(ctx.path).startsWith(original));
      assert.equal(parse(ctx.path).length, 3, 'opened files append immediately without assistant');
      await ctx.open();
      return await ctx.capture();
    });
    await scenario('unknown-entry-preserved', [header, seeded, { type: 'future_feature', id: 'unknown', parentId: 'seed-user', timestamp: header.timestamp, nested: { unicode: '😀', id: 'payload-id', parentId: 'payload-parent' } }], async ctx => {
      const original = read(ctx.path);
      await ctx.store.appendCustomEntry('state', { ok: true });
      assert.ok(read(ctx.path).startsWith(original));
      await ctx.open();
      const after = await ctx.capture();
      assert.equal(after.entries[1].type, 'future_feature');
      assert.equal(after.entries[1].nested.id, 'payload-id');
      assert.equal(after.branch.length, 3);
      return after;
    });
    await scenario('invalid-branch-preserves-state', [header, seeded], async ctx => {
      const before = await ctx.capture();
      const original = read(ctx.path);
      await assert.rejects(async () => await ctx.store.branch('missing-id'));
      assert.equal(read(ctx.path), original);
      assert.deepEqual(await ctx.capture(), before);
      return before;
    });
    await scenario('first-flush-collision-memory', null, async ctx => {
      await ctx.store.appendMessage(user);
      writeFileSync(ctx.path, 'concurrent-owner\n');
      await assert.rejects(async () => await ctx.store.appendMessage(assistant));
      assert.equal(read(ctx.path), 'concurrent-owner\n', 'exclusive first flush must not overwrite existing bytes');
      const entries = await ctx.store.getEntries();
      assert.equal(entries.length, 2, 'upstream advances memory before failed persistence');
      assert.equal(entries.at(-1).message.role, 'assistant');
      return { entries: normalize(entries, entries), branch: normalize(await ctx.store.getBranch(), entries), diskPreserved: true };
    });
    return results;
  } finally { rmSync(root, { recursive: true, force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const upstream = await runWriteCases(upstreamFactory);
  if (process.argv[2]) {
    const { createStoreBackend } = await import(pathToFileURL(process.argv[2]).href);
    const rust = await runWriteCases(createStoreBackend);
    assert.deepEqual(rust, upstream);
    console.log(JSON.stringify({ passed: rust.length, upstream, rust }, null, 2));
  } else console.log(JSON.stringify({ referenceCases: upstream.length, upstream }, null, 2));
}

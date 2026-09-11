// External process and persisted-byte acceptance; deterministic stream, no live model.
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';

const [mode, path, scenario] = process.argv.slice(2);
if (mode) {
  const manager = await createBackend({path, mode, cwd: '/identity-fixture'});
  try {
    const before = manager.snapshot();
    let executed = 0;
    let modelCalls = 0;
    if (scenario === 'drive') {
      const {createHost, tsBackend} = await import('../prototype/real-plugin-host.mjs');
      const {drive} = await import('../prototype/architecture/native-runtime-driver.mjs');
      const host = await createHost(tsBackend(['clock_probe']), {sessionManager: manager, extensionPaths: [], factories: [pi => {
        pi.registerTool({name: 'clock_probe', label: 'Clock', description: 'Timestamp acceptance',
          parameters: {type: 'object', properties: {}},
          execute: async () => {executed++; return {content: [{type: 'text', text: 'clock-ok'}], details: {}};}});
      }]});
      const stream = async () => {
        modelCalls++;
        assert.ok(modelCalls <= 2, 'unexpected extra provider request');
        const message = {role: 'assistant', content: modelCalls === 1
          ? [{type: 'toolCall', id: `clock-${mode}`, name: 'clock_probe', arguments: {}}]
          : [{type: 'text', text: 'done'}], stopReason: modelCalls === 1 ? 'toolUse' : 'stop',
          timestamp: Date.now(), api: 'fixture', provider: 'fixture', model: 'fixture',
          usage: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
            cost: {input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0}}};
        return {async *[Symbol.asyncIterator]() {yield {type: 'done'};}, async result() {return message;}};
      };
      await drive({manager, host, prompt: `clock ${mode}`, stream});
      assert.equal(executed, 1);
      assert.equal(modelCalls, 2);
      assert.deepEqual(host.errors, []);
    } else {
      manager.appendMessage({role: 'assistant', content: [{type: 'text', text: mode}], timestamp: Date.now()});
    }
    const after = manager.snapshot();
    console.log(JSON.stringify({before, after, id: manager.getSessionId(), executed, modelCalls}));
  } finally {manager.close();}
} else {
  const directory = mkdtempSync(join(tmpdir(), 'pi-session-identity-'));
  const run = (mode, path, scenario = 'direct') => {
    const start = Date.now();
    const child = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(import.meta.url), mode, path, scenario], {encoding: 'utf8', timeout: 30000});
    const end = Date.now();
    assert.equal(child.status, 0, `${mode}: ${child.stderr} ${child.stdout}`);
    return {...JSON.parse(child.stdout), start, end};
  };
  const current = (value, {start, end}) => {
    assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const ms = Date.parse(value);
    assert.equal(new Date(ms).toISOString(), value);
    assert.ok(ms >= start && ms <= end, `${value} outside ${start}..${end}`);
  };
  try {
    const firstPath = join(directory, 'first.jsonl');
    const first = run('create', firstPath);
    const second = run('create', join(directory, 'second.jsonl'));
    assert.notEqual(first.id, second.id);
    for (const created of [first, second]) {
      // Upstream assertValidSessionId accepts this alphabet. We generate UUID v4;
      // pinned upstream generates v7, so generation-version parity is not claimed.
      assert.match(created.id, /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/);
      assert.match(created.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.equal(created.after.header.id, created.id);
      assert.equal(created.after.header.type, 'session');
      assert.equal(created.after.header.version, 3);
      assert.equal(created.after.header.cwd, '/identity-fixture');
      current(created.after.header.timestamp, created);
      assert.equal(created.after.entries.length, 1);
      current(created.after.entries[0].timestamp, created);
    }
    const prefix = readFileSync(firstPath);
    const resumed = run('open', firstPath);
    assert.equal(resumed.id, first.id);
    assert.deepEqual(resumed.before.header, first.after.header);
    assert.deepEqual(resumed.after.header, first.after.header);
    assert.deepEqual(resumed.before.entries, first.after.entries);
    assert.equal(resumed.after.entries.length, 2);
    assert.deepEqual(resumed.after.entries.slice(0, 1), first.after.entries);
    current(resumed.after.entries[1].timestamp, resumed);
    const persisted = readFileSync(firstPath);
    assert.ok(persisted.length > prefix.length);
    assert.deepEqual(persisted.subarray(0, prefix.length), prefix);
    assert.deepEqual(persisted.toString().trimEnd().split('\n').map(JSON.parse), [resumed.after.header, ...resumed.after.entries]);
    const drivePath = join(directory, 'drive.jsonl');
    const driven = run('create', drivePath, 'drive');
    const drivePrefix = readFileSync(drivePath);
    const continued = run('open', drivePath, 'drive');
    assert.equal(continued.id, driven.id);
    assert.deepEqual(continued.before, driven.after);
    assert.deepEqual(continued.after.header, driven.after.header);
    assert.deepEqual(continued.after.entries.slice(0, driven.after.entries.length), driven.after.entries);
    const driveBytes = readFileSync(drivePath);
    assert.ok(driveBytes.length > drivePrefix.length);
    assert.deepEqual(driveBytes.subarray(0, drivePrefix.length), drivePrefix);
    current(driven.after.header.timestamp, driven);
    for (const report of [driven, continued]) {
      assert.equal(report.executed, 1);
      assert.equal(report.modelCalls, 2);
      const appended = report.after.entries.slice(report.before.entries.length);
      assert.ok(appended.length >= 4);
      for (const entry of appended) current(entry.timestamp, report);
      const messages = appended.filter(e => e.type === 'message').map(e => e.message);
      assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'toolResult', 'assistant']);
      for (const message of messages) {
        assert.ok(Number.isInteger(message.timestamp));
        assert.ok(message.timestamp >= report.start && message.timestamp <= report.end,
          `${message.role} timestamp ${message.timestamp} outside run bounds`);
      }
      const result = messages.find(m => m.role === 'toolResult');
      assert.equal(result.isError, false);
      assert.equal(result.content[0].text, 'clock-ok');
    }
    console.log('PASS: native drive tool round trip and resume clocks; distinct valid IDs, bounded ISO times, fresh-process resume identity/header/history and canonical byte prefix');
  } finally {rmSync(directory, {recursive: true, force: true});}
}

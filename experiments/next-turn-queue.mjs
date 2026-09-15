import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const [stage, path] = process.argv.slice(2);
if (stage) {
  const resume = stage.startsWith('resume');
  const manager = await createBackend({path, mode: resume ? 'open' : 'create'});
  let sent = false;
  const host = await createHost(tsBackend(), {sessionManager: manager, extensionPaths: [], factories: [pi => pi.on('context', () => {
    if (resume || sent) return;
    sent = true;
    for (const text of ['one', 'two']) pi.sendMessage({customType: text, content: text, display: false}, {deliverAs: 'nextTurn'});
  })]});
  const views = [];
  const stream = async (_model, context) => {
    views.push(context.messages);
    return {async *[Symbol.asyncIterator]() {}, async result() {return {role:'assistant', content:[], stopReason:'stop', provider:'fixture', model:'fixture', api:'fixture', timestamp:1};}};
  };
  const custom = () => manager.getEntries().filter(e => e.type === 'custom_message');
  try {
    await drive({manager, host, prompt: 'first', stream});
    if (resume) {
      const expected = stage === 'resume-consumed' ? ['one', 'two'] : [];
      assert.deepEqual(custom().map(e => e.content), expected);
      assert.deepEqual(views[0].filter(m => m.role === 'custom').map(m => m.content), expected);
    } else {
      assert.equal(custom().length, 0);
      assert.equal(views[0].filter(m => m.role === 'custom').length, 0);
      assert.equal(host.pendingMessages.length, 2);
      if (stage === 'consumed') {
        // Invalid admission must leave BOTH history and host queue unchanged.
        const before = JSON.stringify(manager.getEntries());
        const prepare = host.preparePrompt;
        host.preparePrompt = async prompt => ({...await prepare(prompt),messages:[{customType:'invalid',content:'invalid',display:'invalid'}]});
        await assert.rejects(drive({manager, host, prompt: 'invalid', stream}), /invalid nextTurn/);
        assert.equal(JSON.stringify(manager.getEntries()), before);
        assert.equal(host.pendingMessages.length, 2);
        host.preparePrompt = prepare;
        await drive({manager, host, prompt: 'second', stream});
        const entries = manager.getEntries();
        const userIndex = entries.findIndex(e => e.message?.role === 'user' && e.message.content === 'second');
        assert.deepEqual(entries.slice(userIndex + 1, userIndex + 3).map(e => [e.type, e.content]), [['custom_message', 'one'], ['custom_message', 'two']]);
        const context = views[1];
        const contextIndex = context.findIndex(m => m.role === 'user' && m.content === 'second');
        assert.deepEqual(context.slice(contextIndex + 1, contextIndex + 3).map(m => [m.role, m.content]), [['custom', 'one'], ['custom', 'two']]);
        assert.equal(host.pendingMessages.length, 0);
        await drive({manager, host, prompt: 'third', stream});
        assert.deepEqual(custom().map(e => e.content), ['one', 'two']);
        assert.deepEqual(views[2].filter(m => m.role === 'custom').map(m => m.content), ['one', 'two']);
      }
    }
    assert.deepEqual(host.errors, []);
  } finally {manager.close();}
} else {
  const directory = mkdtempSync(join(tmpdir(), 'pi-next-turn-'));
  try {
    for (const scenario of ['pending', 'consumed']) for (const phase of [scenario, `resume-${scenario}`]) {
      const child = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(import.meta.url), phase, join(directory, `${scenario}.jsonl`)], {encoding:'utf8'});
      assert.equal(child.status, 0, `${phase}: ${child.stderr}`);
    }
    console.log(JSON.stringify({passed:true, scope:'native user/custom FIFO, once-only nextTurn, rejected begin preserves queue/history, real subprocess pending loss and consumed recovery'}));
  } finally {rmSync(directory, {recursive:true, force:true});}
}

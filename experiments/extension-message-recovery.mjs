import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const [stage, path] = process.argv.slice(2);
if (stage) {
  const manager = await createBackend({path, mode: stage === 'seed' ? 'create' : 'open'});
  try {
    const host = await createHost(tsBackend(), {sessionManager: manager, extensionPaths: [], factories: [pi => {
      if (stage === 'seed') pi.on('context', () => {
        pi.sendMessage({customType: 'audit-note', content: 'remember this', display: false, details: {step: 1}}, {triggerTurn: false, deliverAs: 'nextTurn'});
      });
    }]});
    let requests = 0;
    const stream = async (_model, context) => {
      requests++;
      const notes = context.messages.filter(m => m.role === 'custom');
      assert.equal(notes.length, stage === 'seed' ? 0 : 1);
      if (stage === 'resume') {
        assert.equal(notes[0].customType, 'audit-note');
        assert.equal(notes[0].content, 'remember this');
        assert.deepEqual(notes[0].details, {step: 1});
      }
      return {async *[Symbol.asyncIterator]() {}, async result() {return {role: 'assistant', content: [{type: 'text', text: 'done'}], stopReason: 'stop', provider: 'fixture', model: 'fixture', api: 'fixture', timestamp: 1};}};
    };
    await drive({manager, host, prompt: stage, stream});
    assert.equal(requests, 1, 'triggerTurn:false must not start another model turn');
    assert.deepEqual(host.errors, []);
    const entries = manager.getEntries();
    const note = entries.findIndex(e => e.type === 'custom_message');
    assert.ok(note > 0, 'custom message must persist');
    assert.equal(entries[note - 1].message.role, 'assistant');
    assert.equal(entries[note].display, false);
    if (stage === 'resume') {
      host.actions.sendUserMessage('continue', {deliverAs: 'followUp'});
      await drive({manager, host, prompt: 'deferred follow-up', stream});
      assert.equal(host.pendingMessages.length, 0, 'follow-up is persisted for the next turn');
      assert.equal(manager.getEntries().filter(e => e.type === 'message' && e.message.role === 'user').at(-1).message, 'continue');
    }
  } finally {manager.close();}
} else {
  const directory = mkdtempSync(join(tmpdir(), 'pi-custom-message-'));
  try {
    for (const phase of ['seed', 'resume']) {
      const child = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(import.meta.url), phase, join(directory, 'session.jsonl')], {encoding: 'utf8'});
      assert.equal(child.status, 0, `${phase}: ${child.stderr}`);
    }
    console.log(JSON.stringify({passed: true, scope: 'fixture custom message deferred persistence and fresh-process model context'}));
  } finally {rmSync(directory, {recursive: true, force: true});}
}

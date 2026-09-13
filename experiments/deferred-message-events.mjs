import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const directory = mkdtempSync(join(tmpdir(), 'pi-deferred-events-'));
const assistant = (content, stopReason) => ({role:'assistant', content, stopReason, provider:'fixture', model:'fixture', api:'fixture', timestamp:1});
try {
  for (const failAt of [undefined, 'message_start', 'message_end']) {
    const path = join(directory, `${failAt ?? 'success'}.jsonl`);
    const manager = await createBackend({path});
    try {
      let admissionBefore, admissionAfter, executed = 0;
      const events = [];
      const host = await createHost(tsBackend(['notify']), {sessionManager:manager, extensionPaths:[], factories:[pi => {
        pi.registerTool({name:'notify', label:'Notify', description:'queues custom note', parameters:{type:'object', properties:{}}, execute:async () => {
          executed++;
          admissionBefore = Date.now();
          pi.sendMessage({customType:'note', content:'tool note', display:false, details:{origin:'tool'}}, {triggerTurn:false});
          admissionAfter = Date.now();
          assert.equal(manager.getEntries().filter(e => e.type === 'custom_message').length, 0);
          assert.equal(events.length, 0, 'must not emit inside tool execution');
          return {content:[{type:'text', text:'tool completed'}], details:{}};
        }});
      }]});
      const responses = [assistant([{type:'toolCall', id:'notify-1', name:'notify', arguments:{}}], 'toolUse'), assistant([{type:'text', text:'done'}], 'stop')];
      const stream = async () => {
        assert.equal(events.length, 0, 'must wait until completed tool turn');
        const response = responses.shift(); assert.ok(response);
        return {async *[Symbol.asyncIterator]() {}, async result() {return response;}};
      };
      const observerError = new Error('deliberate observer failure');
      const execute = () => drive({manager, host, prompt:'notify', stream, onSessionEvent:event => {
        const disk = readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
        const notes = disk.filter(e => e.type === 'custom_message');
        assert.equal(notes.length, 1, 'canonical append must precede callback');
        const resultIndex = disk.findIndex(e => e.message?.role === 'toolResult');
        assert.ok(resultIndex > disk.findIndex(e => Array.isArray(e.message?.content) && e.message.content.some(c => c.type === 'toolCall')));
        assert.ok(resultIndex < disk.indexOf(notes[0]), 'custom message must not split tool pair');
        assert.equal(event.message.role, 'custom');
        assert.equal(event.message.content, notes[0].content);
        assert.deepEqual(event.message.details, {origin:'tool'});
        assert.ok(event.message.timestamp >= admissionBefore && event.message.timestamp <= admissionAfter);
        events.push(event);
        if (event.type === failAt) throw observerError;
      }});
      if (failAt) await assert.rejects(execute, error => error === observerError);
      else await execute();
      assert.equal(executed, 1);
      assert.equal(responses.length, 0);
      assert.deepEqual(events.map(e => e.type), failAt === 'message_start' ? ['message_start'] : ['message_start','message_end']);
      if (events.length === 2) assert.equal(events[0].message, events[1].message, 'same payload object and timestamp');
      assert.equal(manager.getEntries().filter(e => e.type === 'custom_message').length, 1, 'observer failure must not rollback');
      assert.equal(host.pendingMessages.length, 0, 'observer failure must not replay persisted message');
      await host.waitForIdle();
      assert.deepEqual(host.errors, [], 'subscriber failures do not go through ExtensionRunner');
    } finally {manager.close();}
  }
  console.log('PASS deferred custom session events: tool-pair safety, persistence-first, exactly-once, synchronous error propagation');
} finally {rmSync(directory, {recursive:true, force:true});}

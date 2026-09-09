import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
test('thinking level action roundtrip', async()=>{const h=await createHost(tsBackend(),{extensionPaths:[]}); assert.equal(h.actions.getThinkingLevel(),'off'); h.actions.setThinkingLevel('high'); assert.equal(h.actions.getThinkingLevel(),'high'); assert.deepEqual(h.actions.getCommands(),[]); assert.equal(h.actions.refreshTools(),undefined);});

test('extension API lists registered commands and returns fresh descriptors', async () => {
  let api;
  const host = await createHost(tsBackend(), {extensionPaths: [], factories: [pi => {
    api = pi;
    pi.registerCommand('review-local', {description: 'Review local changes', handler: async () => {}});
  }]});
  const commands = api.getCommands();
  assert.equal(commands.length, 1);
  assert.equal(commands[0].name, 'review-local');
  assert.equal(commands[0].description, 'Review local changes');
  assert.equal(commands[0].source, 'extension');
  assert.deepEqual(commands[0].sourceInfo, host.runner.getRegisteredCommands()[0].sourceInfo);
  commands[0].name = 'corrupted';
  assert.equal(api.getCommands()[0].name, 'review-local');
});

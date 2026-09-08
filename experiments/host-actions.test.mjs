import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
test('thinking level action roundtrip', async()=>{const h=await createHost(tsBackend(),{extensionPaths:[]}); assert.equal(h.actions.getThinkingLevel(),'off'); h.actions.setThinkingLevel('high'); assert.equal(h.actions.getThinkingLevel(),'high'); assert.deepEqual(h.actions.getCommands(),[]); assert.equal(h.actions.refreshTools(),undefined);});

import assert from 'node:assert/strict';
import { createHost, tsBackend } from '../prototype/real-plugin-host.mjs';
const host = await createHost(tsBackend(), { extensionPaths: [], factories: [pi => {
  pi.registerProvider('demo', { models: [{ id: 'alpha', name: 'Alpha' }, { modelId: 'beta', name: 'Beta' }] });
}] });
assert.deepEqual(host.modelRegistry?.find?.('demo', 'alpha'), { id: 'alpha', name: 'Alpha' });
assert.equal(host.modelRegistry?.find?.('demo', 'missing'), undefined);
assert.deepEqual(host.contextActions?.getScopedModels?.(), []);
console.log(JSON.stringify({passed:true, scope:'deterministic provider model lookup'}));

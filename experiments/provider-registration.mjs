import assert from 'node:assert/strict';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
const host=await createHost(tsBackend(),{extensionPaths:[],factories:[pi=>{pi.registerProvider('probe-provider',{baseUrl:'https://example.invalid',api:'openai-completions',stream:async()=>{}});}]});
assert.deepEqual([...host.providers.keys()],['probe-provider']);
host.runner.bindCore({},{}); // registration is runtime-bound by initial bindCore only; probe remains recorded
assert.equal(host.providers.get('probe-provider').baseUrl,'https://example.invalid');
console.log(JSON.stringify({passed:true,providers:[...host.providers.keys()],scope:'provider registration registry only; network/model selection unverified'}));

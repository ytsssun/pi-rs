import assert from 'node:assert/strict';
import { composeProviderRequest } from '../prototype/architecture/provider-composer.mjs';
const r=composeProviderRequest({provider:'custom',id:'demo',baseUrl:'http://fixture/'},[{role:'user',content:'hi'}],[{name:'echo'}],{reasoningEffort:'low'});
assert.equal(r.url,'http://fixture/chat/completions'); assert.equal(r.body.model,'demo'); assert.equal(r.body.reasoning_effort,'low');
assert.throws(()=>composeProviderRequest({id:'x'},[]),/baseUrl/);
console.log('provider composer: pass');

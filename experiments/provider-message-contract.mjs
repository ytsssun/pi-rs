import assert from 'node:assert/strict';
import {toPiAssistant} from '../prototype/architecture/native-provider-stream.mjs';
const raw={role:'assistant',content:'checking',tool_calls:[{id:'c1',function:{name:'read',arguments:'{"path":"a"}'}}],_provider_usage:{total_tokens:8}};
const saved=structuredClone(raw);
const pi=toPiAssistant(raw,'fixture');
assert.deepEqual(pi.content,[{type:'text',text:'checking'},{type:'toolCall',id:'c1',name:'read',arguments:{path:'a'}}]);
assert.equal(pi.stopReason,'toolUse');
assert.deepEqual(pi.usage,raw._provider_usage);
assert.deepEqual(raw,saved);
assert.equal(toPiAssistant({role:'assistant',content:'done'},'fixture').stopReason,'stop');
for(const argumentsText of ['{broken','null','[]']) {
  assert.throws(()=>toPiAssistant({...raw,tool_calls:[{id:'c1',function:{name:'read',arguments:argumentsText}}]},'fixture'));
}
console.log('Pi adapter: mixed text/tool, usage, input preservation, malformed arguments passed');

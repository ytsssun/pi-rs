import assert from 'node:assert/strict';
import { openaiEvents } from '../prototype/architecture/openai-stream-adapter.mjs';
import { StreamAssembler } from '../prototype/architecture/stream-assembler.mjs';
const state=new Map(), a=new StreamAssembler();
const chunks=[{choices:[{delta:{content:'ok'}}]},{choices:[{delta:{tool_calls:[{index:0,id:'c1',function:{name:'echo',arguments:'{"text":"hi"}'}}]}}]},{choices:[{delta:{},finish_reason:'tool_calls'}]}];
for(const c of chunks) for(const e of openaiEvents(c,state)) a.push(e);
a.push({type:'done',reason:'toolUse'}); const out=a.finish();
assert.equal(out.content[0].text,'ok'); assert.deepEqual(out.content[1].arguments,{text:'hi'}); console.log(JSON.stringify({verified:true,canonicalToolCall:true}));

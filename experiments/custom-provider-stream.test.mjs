import test from 'node:test'; import assert from 'node:assert/strict';
import {assembleOpenAIChunks} from '../prototype/architecture/native-stream-bridge.mjs';
test('custom OpenAI-compatible SSE chunks map to Pi canonical tool call',()=>{
 const r=assembleOpenAIChunks([
  {choices:[{delta:{content:'hi'}}]},
  {choices:[{delta:{tool_calls:[{index:0,id:'c1',function:{name:'write',arguments:'{"path":"x"'}}}]}}]},
  {choices:[{delta:{tool_calls:[{index:0,function:{arguments:',"content":"ok"}'}}]}}]},
  {choices:[{finish_reason:'tool_calls'}]},
 ]);
 assert.deepEqual(r.content,[{type:'text',text:'hi'},{type:'toolCall',id:'c1',name:'write',arguments:{path:'x',content:'ok'}}]);
});

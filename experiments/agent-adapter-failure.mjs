import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
const model={id:'fixture',api:'fixture',provider:'fixture'};
const dir=mkdtempSync(join(tmpdir(),'pi-adapter-failure-'));
async function run(native,stage,abort){
 let agent,calls=0;const events=[];
 const streamFn=async(_model,_context,{signal})=>{
  calls++;assert.equal(signal.aborted,false,'Each prompt must receive a fresh signal');
  const message={role:'assistant',api:'fixture',provider:'fixture',model:'fixture',content:[{type:'text',text:'partial'}],stopReason:'stop'};
  const fail=()=>{if(abort)agent.abort();throw Error('fixture stream failure');};
  if(calls===1&&stage==='create')fail();
  return {async *[Symbol.asyncIterator](){yield {type:'start',partial:message};yield {type:'text_delta',partial:message,delta:'partial',contentIndex:0};if(calls===1&&stage==='iterate')fail();},async result(){if(calls===1&&stage==='result')fail();return message;}};
 };
 agent=native?new RustAgentAdapter({scratchPath:join(dir,`${stage}-${abort}.jsonl`),cwd:dir,initialState:{model},streamFn}):new Agent({initialState:{model},streamFn});
 agent.subscribe(e=>events.push(structuredClone(e)));
 await agent.prompt({role:'user',content:[{type:'text',text:'first'}]});
 assert.equal(agent.state.isStreaming,false);assert.equal(agent.state.messages.length,2);
 assert.equal(agent.state.messages[1].stopReason,abort?'aborted':'error');assert.equal(agent.state.messages[1].errorMessage,'fixture stream failure');
 assert.ok(agent.state.streamingMessage==null);assert.ok(agent.state.streamMessage==null);
 await agent.prompt({role:'user',content:[{type:'text',text:'second'}]});
 assert.equal(agent.state.messages.length,4);assert.equal(agent.state.messages[3].stopReason,'stop');
 if(native){assert.equal(agent.store.getBranch().filter(e=>e.type==='message').length,4);agent.store.close();}
 return events.map(e=>[e.type,e.message?.role,e.message?.stopReason,e.assistantMessageEvent?.type]);
}
for(const stage of ['create','iterate','result'])for(const abort of [false,true]){
 const expected=await run(false,stage,abort);const actual=await run(true,stage,abort);assert.deepEqual(actual,expected,`${stage}/${abort}`);
}
console.log('Six upstream/native provider failure and same-Agent recovery comparisons PASS');

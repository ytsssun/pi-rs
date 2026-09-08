// Independent reviewer fixture: original upstream loop vs native Rust-owned driver.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runAgentLoop} from '../vendor/pi-mono/packages/agent/src/agent-loop.ts';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
const directory=mkdtempSync(join(tmpdir(),'pi-independent-runtime-'));
const assistant=(stopReason='stop')=>({role:'assistant',content:stopReason==='stop'?[{type:'text',text:'done'}]:[{type:'toolCall',id:'t',name:'test',arguments:{}}],stopReason,timestamp:1});
const normalize=messages=>JSON.parse(JSON.stringify(messages.map(({timestamp,...m})=>m)));
async function exercise(kind,mode) {
  const manager=await createBackend({path:join(directory,kind+'-'+mode+'.jsonl')});let calls=0;const requests=[];
  const host=await createHost(tsBackend(['test']),{sessionManager:manager,extensionPaths:[],factories:[pi=>pi.registerTool({name:'test',label:'Test',description:'independent fixture',parameters:{type:'object',properties:{}},execute:async()=>{calls++;if(mode==='reject')throw Error('fixture failure');return {details:{ok:true}};}})]});
  const responses=[assistant(['aborted','error','length'].includes(mode)?mode:'toolUse'),assistant()];
  const stream=async(_model,context)=>{requests.push(normalize(context.messages));const response=responses.shift();assert.ok(response,'unexpected extra request');return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return response;}};};
  try {
    let messages;
    if(kind==='ts') {
      const tool=wrapRegisteredTool(host.runner.getAllRegisteredTools()[0],host.runner);
      messages=await runAgentLoop([{role:'user',content:'go',timestamp:0}],{messages:[],tools:[tool]}, {model:{provider:'fixture'},apiKey:'fixture',toolExecution:'sequential',convertToLlm:m=>m},()=>{},undefined,stream);
    } else {await drive({manager,host,prompt:'go',stream});messages=manager.getBranch().filter(e=>e.type==='message').map(e=>e.message);}
    assert.deepEqual(host.errors,[]);
    return {calls,requests,messages:normalize(messages)};
  } finally {manager.close();}
}
try {
  const reports=[];
  for(const mode of ['reject','no-content','aborted','error','length']) {
    const reference=await exercise('ts',mode),native=await exercise('rust',mode);
    assert.deepEqual(native,reference,mode+' canonical messages and request views');
    reports.push({mode,calls:native.calls,modelRequests:native.requests.length,canonicalParity:true,providerViewParity:true});
  }
  for(const mode of ['aborted','error']) {
    const reopened=await createBackend({path:join(directory,'rust-'+mode+'.jsonl'),mode:'open'});
    const next=request({op:'runtime',handle:reopened.handle,event:'begin',prompt:'continue after stopped model'});
    assert.equal(next.type,'model','stopped model tool calls must not become unresolved replay');
    reopened.close();
  }
  const manager=await createBackend({path:join(directory,'correlation.jsonl')});
  const step=r=>request({op:'runtime',handle:manager.handle,...r});
  const action=step({event:'begin',prompt:'original branch'});const before=manager.snapshot();
  assert.throws(()=>step({event:'model_result',requestId:action.requestId+'old',message:assistant()}),/mismatched/);
  assert.deepEqual(manager.snapshot(),before,'stale completion changes no state');
  assert.throws(()=>manager.resetLeaf(),/pending|await|active/,'pending branch switch must reject');
  assert.deepEqual(manager.snapshot(),before,'rejected branch changes no state');
  assert.throws(()=>manager.appendMessage(assistant()),/pending|await|active/,'external message append must reject while pending');
  assert.deepEqual(manager.snapshot(),before,'rejected message append changes no state');
  assert.equal(step({event:'model_result',requestId:action.requestId,message:assistant()}).type,'done');
  manager.close();
  console.log(JSON.stringify({reports,staleCompletionRejected:true,pendingBranchRejected:true,externalMessageAppendRejected:true,stoppedModelReopen:true,scope:'deterministic sequential canonical messages/provider views; no streaming event, live model or full compatibility claim'},null,2));
} finally {rmSync(directory,{recursive:true,force:true});}

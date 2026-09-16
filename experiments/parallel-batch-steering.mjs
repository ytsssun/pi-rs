// Same real tool body and scripted provider for pinned Agent and native host.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
const texts=ms=>ms.filter(m=>m.role==='user').map(m=>typeof m.content==='string'?m.content:m.content[0]?.text);
const dir=mkdtempSync(join(tmpdir(),'pi-tool-steer-'));
const reports=[];
try {
 for(const toolCount of [1,2]) for(const mode of ["one-at-a-time","all"]) {
 const pair=[];
 for(const native of [false,true]) {
  const contexts=[],events=[],signals=[];let calls=0,toolRuns=0,enqueue,manager;
  const tool={name:'work',label:'Work',description:'one tool',parameters:{type:'object',properties:{}},execute:async(_id,_args,signal)=>{
   toolRuns++;events.push('body_enter');signals.push(signal?.aborted);
   if(toolRuns===1){enqueue('during-tool','steer');enqueue('second-steer','steer');enqueue('follow-tool','followUp');}
   await Promise.resolve();signals.push(signal?.aborted);events.push('body_return');
   return {content:[{type:'text',text:'done'}],details:{}};
  }};
  const stream=async(_m,c)=>{
   contexts.push(texts(c.messages));events.push('model_request');const i=calls++;
   const message={role:'assistant',content:i===0?Array.from({length:toolCount},(_,j)=>({type:'toolCall',name:'work',id:'w'+j,arguments:{}})):[],stopReason:i===0?'toolUse':'stop',timestamp:1};
   return {async *[Symbol.asyncIterator](){yield {type:'done',message};},async result(){return message;}};
  };
  try {
   if(native){
    manager=await createBackend({path:join(dir,`native-${toolCount}-${mode}.jsonl`)});
    manager.setQueueModes({steeringMode:mode});
    const host=await createHost(tsBackend(['work']),{sessionManager:manager,extensionPaths:[],factories:[pi=>pi.registerTool(tool)]});
    enqueue=(text,mode)=>host.actions.sendUserMessage(text,{deliverAs:mode});
    const trace=[];await drive({manager,host,prompt:'initial',stream,trace});
    pair.push({native,contexts,events,signals,toolRuns,trace:trace.map(e=>e.type)});
   }else{
    const agent=new Agent({initialState:{model:{id:'x',provider:'x',api:'x'},tools:[tool]},streamFn:stream,steeringMode:mode,toolExecution:'parallel'});
    enqueue=(text,mode)=>agent[mode](user(text));agent.subscribe(e=>events.push(e.type));
    await agent.prompt(user('initial'));
    pair.push({native,contexts,events,signals,toolRuns});
   }
   assert.equal(toolRuns,toolCount);assert.deepEqual(signals,Array(toolCount*2).fill(false));
  }finally{manager?.close();}
 }
 assert.deepEqual(pair[1].contexts,pair[0].contexts);
 assert.ok(pair[0].events.includes('tool_execution_start'));assert.ok(pair[0].events.includes('tool_execution_end'));
 reports.push({toolCount,mode,pair});
 }
 console.log(JSON.stringify({boundaryMatches:true,reports,fixture:true}));
}finally{rmSync(dir,{recursive:true,force:true});}

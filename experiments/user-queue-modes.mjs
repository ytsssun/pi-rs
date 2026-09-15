import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
const texts=messages=>messages.filter(m=>m.role==='user').map(m=>typeof m.content==='string'?m.content:m.content[0].text);
const dir=mkdtempSync(join(tmpdir(),'pi-modes-'));
try {
 for(const mode of ['one-at-a-time','all']) for(const stopReason of ['stop','error','aborted']) {
  const results=[];
  for(const native of [false,true]) {
   const contexts=[];let enqueue,agent,manager,host;
   const stream=async(_m,ctx)=>{
    contexts.push(texts(ctx.messages));
    if(contexts.length===1)for(const [text,kind] of [['f1','followUp'],['s1','steer'],['f2','followUp'],['s2','steer']])enqueue(text,kind);
    const message={role:'assistant',content:[],stopReason:contexts.length===1?stopReason:'stop',timestamp:1};
    return {async *[Symbol.asyncIterator](){yield {type:message.stopReason==='stop'?'done':'error',message};},async result(){return message;}};
   };
   if(native){manager=await createBackend({path:join(dir,`${mode}-${stopReason}.jsonl`)});assert.deepEqual(manager.getQueueModes(),{steeringMode:'one-at-a-time',followUpMode:'one-at-a-time'});manager.setQueueModes({steeringMode:mode,followUpMode:mode});host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[]});enqueue=(text,kind)=>host.actions.sendUserMessage(text,{deliverAs:kind});await drive({manager,host,prompt:'initial',stream});}
   else {agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'}},streamFn:stream});agent.steeringMode=mode;agent.followUpMode=mode;enqueue=(text,kind)=>agent[kind](user(text));await agent.prompt(user('initial'));}
   results.push({contexts,pending:native?manager.pendingUsers().length>0:agent.hasQueuedMessages()});manager?.close();
  }
  assert.deepEqual(results[1],results[0]);
  if(stopReason==='stop')assert.deepEqual(results[0].contexts,mode==='all'?[['initial'],['initial','s1','s2'],['initial','s1','s2','f1','f2']]:[['initial'],['initial','s1'],['initial','s1','s2'],['initial','s1','s2','f1'],['initial','s1','s2','f1','f2']]);
  else assert.deepEqual(results[0],{contexts:[['initial']],pending:true});
  console.log(JSON.stringify({mode,stopReason,...results[0],fixture:true}));
 }
}finally{rmSync(dir,{recursive:true,force:true});}

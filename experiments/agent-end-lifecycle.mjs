import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-agent-end-'));const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
const normalize=messages=>JSON.parse(JSON.stringify(messages.map(({timestamp,...m})=>({...m,...(m.role==='user'&&typeof m.content==='string'?{content:[{type:'text',text:m.content}]}:{})}))));
try{for(const terminal of ['stop','error','aborted']){
 const reports=[];
 for(const native of [false,true]){
  let manager,enqueue,calls=0;const events=[],ends=[];
  const tool={name:'work',label:'Work',description:'effect',parameters:{type:'object',properties:{}},execute:async()=>{enqueue('follow','followUp');return {content:[{type:'text',text:'effect'}],details:{}};}};
  const end=async e=>{events.push('agent_end');ends.push(normalize(e.messages));await Promise.resolve();enqueue('end-steer','steer');enqueue('end-follow','followUp');};
  const stream=async()=>{const first=calls++===0;const message={role:'assistant',content:first&&terminal==='stop'?[{type:'toolCall',id:'w',name:'work',arguments:{}}]:[],stopReason:first&&terminal==='stop'?'toolUse':terminal,timestamp:1};return {async *[Symbol.asyncIterator](){yield {type:terminal==='stop'?'done':'error',message};},async result(){return message;}};};
  try{
   if(native){manager=await createBackend({path:join(dir,terminal+'.jsonl')});const host=await createHost(tsBackend(['work']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{pi.registerTool(tool);for(const t of ['agent_start','turn_start','turn_end'])pi.on(t,()=>events.push(t));pi.on('agent_end',end);}]});enqueue=(text,mode)=>host.actions.sendUserMessage(text,{deliverAs:mode});await drive({manager,host,prompt:'initial',stream});reports.push({events,ends,calls,pending:manager.pendingUsers().map(q=>q.message)});assert.throws(()=>request({op:'runtime',handle:manager.handle,event:'lifecycle_ack',requestId:'stale'}),/no lifecycle/);}
   else{const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'},tools:[tool]},streamFn:stream});enqueue=(text,mode)=>agent[mode](user(text));agent.subscribe(async e=>{if(e.type==='agent_end')await end(e);else if(['agent_start','turn_start','turn_end'].includes(e.type))events.push(e.type);});await agent.prompt('initial');assert.equal(agent.hasQueuedMessages(),true);reports.push({events,ends,calls,pending:['end-steer','end-follow']});}
  }finally{manager?.close();}
 }
 assert.deepEqual(reports[1],reports[0]);assert.equal(reports[0].ends.length,1);assert.equal(reports[0].events.filter(e=>e==='agent_start').length,1);assert.equal(reports[0].events.at(-1),'agent_end');
 console.log(JSON.stringify({terminal,report:reports[0],fixture:true,scope:'core Agent run; Session automatic continuation remains separate'}));
}}finally{rmSync(dir,{recursive:true,force:true});}

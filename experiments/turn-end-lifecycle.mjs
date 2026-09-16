import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';import {createBackend} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-end-'));const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
const texts=ms=>ms.filter(m=>m.role==='user').map(m=>typeof m.content==='string'?m.content:m.content[0].text);
try{for(const parallel of [false,true])for(const terminal of ['stop','error','aborted']){
 const pair=[];
 for(const native of [false,true]){
  const events=[],contexts=[],order=[];let n=0,index=0,sent=false,enqueue,manager,executions=0;
  const callback=async e=>{order.push('turn_end');events.push({index:e.turnIndex,message:e.message,tools:e.toolResults.map(m=>({role:m.role,id:m.toolCallId,content:m.content,isError:m.isError}))});if(!sent){sent=true;await Promise.resolve();enqueue('from-end');}};
  const tool={name:'work',label:'Work',description:'effect',parameters:{type:'object',properties:{}},execute:async()=>{order.push("tool");executions++;return {content:[{type:'text',text:'effect'}],details:{}};}};
  const stream=async(_m,c)=>{order.push("model");contexts.push(texts(c.messages));const first=n++===0;const message={role:'assistant',content:first&&terminal==='stop'?[{type:'toolCall',id:'a',name:'work',arguments:{}},{type:'toolCall',id:'b',name:'work',arguments:{}}]:[],stopReason:first&&terminal==='stop'?'toolUse':terminal,timestamp:1};return {async *[Symbol.asyncIterator](){yield {type:terminal==='stop'?'done':'error',message};},async result(){return message;}};};
  try{
   if(native){manager=await createBackend({path:join(dir,`${parallel}-${terminal}.jsonl`)});const host=await createHost(tsBackend(['work']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{pi.registerTool(tool);pi.on('turn_end',callback);}]});enqueue=text=>host.actions.sendUserMessage(text,{deliverAs:'steer'});await drive({manager,host,prompt:'initial',stream,parallel});pair.push({events,contexts,order,executions,pending:manager.pendingUsers().length});assert.deepEqual(host.errors,[]);}
   else{const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'},tools:[tool]},streamFn:stream,toolExecution:parallel?'parallel':'sequential'});enqueue=text=>agent.steer(user(text));agent.subscribe(async e=>{if(e.type==='turn_end')await callback({...e,turnIndex:index++});});await agent.prompt(user('initial'));pair.push({events,contexts,order,executions,pending:agent.hasQueuedMessages()?1:0});}
  }finally{manager?.close();}
 }
 assert.deepEqual(pair[1],pair[0]);assert.equal(pair[0].executions,terminal==='stop'?2:0);
 if(terminal==='stop')assert.deepEqual(pair[0].contexts,[['initial'],['initial','from-end']]);
 else assert.equal(pair[0].pending,1);
 console.log(JSON.stringify({parallel,terminal,report:pair[0],fixture:true}));
}}finally{rmSync(dir,{recursive:true,force:true});}

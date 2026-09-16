import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-start-life-'));
try{for(const phase of ['agent_start','turn_start']){
 const manager=await createBackend({path:join(dir,phase+'.jsonl')});const events=[],contexts=[];let sent=false,calls=0;
 try{
 const host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[pi=>{
  for(const name of ['agent_start','turn_start'])pi.on(name,async e=>{events.push({type:e.type,index:e.turnIndex});if(name===phase&&!sent){sent=true;await Promise.resolve();pi.sendUserMessage('callback',{deliverAs:'steer'});pi.sendUserMessage('follow',{deliverAs:'followUp'});}});
 }]});
 const stream=async(_m,c)=>{calls++;contexts.push(c.messages.filter(m=>m.role==='user').map(m=>typeof m.content==='string'?m.content:m.content[0].text));return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[],stopReason:'stop',timestamp:1};}};};
 await drive({manager,host,prompt:'initial',stream});
 assert.deepEqual(contexts,[['initial','callback'],['initial','callback','follow']]);assert.equal(calls,2);
 assert.deepEqual(events,[{type:'agent_start',index:undefined},{type:'turn_start',index:0},{type:'turn_start',index:1}]);
 const failure=await drive({manager,host,prompt:'failure',stream:async()=>{throw Error('provider failed');}});assert.equal(failure.action.message.stopReason,'error');assert.match(failure.action.message.errorMessage,/provider failed/);
 assert.equal(host.contextActions.isIdle(),true);
 assert.throws(()=>request({op:'runtime',handle:manager.handle,event:'lifecycle_ack',requestId:'stale'}),/no lifecycle/);
 await drive({manager,host,prompt:'recover',stream});
 assert.equal(events.filter(e=>e.type==='agent_start').length,3);assert.equal(events.at(-1).index,0);
 const abort=new AbortController();abort.abort();const before=calls;
 await drive({manager,host,prompt:'aborted',signal:abort.signal,stream});assert.equal(calls,before);
 await drive({manager,host,prompt:'after-abort',stream});assert.equal(calls,before+1);
 assert.deepEqual(host.errors,[]);console.log('PASS native start lifecycle '+phase+': automatic callback admission, followUp indices, provider error and abort recovery');
 }finally{manager.close();}
}}finally{rmSync(dir,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const text=m=>typeof m.content==='string'?m.content:m.content.filter(c=>c.type==='text').map(c=>c.text).join('');
const users=entries=>entries.filter(e=>e.message?.role==='user').map(e=>text(e.message));
const directory=mkdtempSync(join(tmpdir(),'pi-steer-'));
try {
 for(const reason of ['stop','error','aborted']) {
  const path=join(directory,reason+'.jsonl'),manager=await createBackend({path});
  try {
   let api;const host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[pi=>{api=pi;}]});
   const entered=deferred(),release=deferred(),contexts=[],trace=[];let calls=0;
   const stream=async(_model,context)=>{
    const index=calls++;contexts.push(context.messages.filter(m=>m.role==='user').map(text));
    const message={role:'assistant',content:[{type:'text',text:'response'}],stopReason:index===0?reason:'stop',timestamp:1};
    return {async *[Symbol.asyncIterator](){if(index===0){entered.resolve();await release.promise;}},async result(){return message;}};
   };
   const running=drive({manager,host,prompt:'initial',stream,trace});await entered.promise;
   api.sendUserMessage('follow',{deliverAs:'followUp'});
   api.sendUserMessage('one',{deliverAs:'steer'});api.sendUserMessage('two',{deliverAs:'steer'});
   assert.equal(host.contextActions.getSignal().aborted,false);
   assert.equal(host.contextActions.isIdle(),false);assert.equal(calls,1);assert.deepEqual(users(manager.getEntries()),['initial']);
   release.resolve();await running;assert.equal(host.contextActions.isIdle(),true);
   if(reason==='stop') {
    assert.deepEqual(contexts,[['initial'],['initial','one'],['initial','one','two'],['initial','one','two','follow']]);
    assert.equal(trace.filter(e=>e.type==='steer_admitted').length,2);assert.equal(host.pendingMessages.length,0);
   } else {assert.equal(calls,1);assert.equal(host.pendingMessages.length,3);assert.deepEqual(users(manager.getEntries()),['initial']);}
   // Same host retains failed-turn pending messages, then admits each once.
   await drive({manager,host,prompt:'continue',stream});
   const expected=reason==='stop'?['initial','one','two','follow','continue']:['initial','continue','one','two','follow'];
   assert.deepEqual(users(manager.getEntries()),expected);assert.equal(host.pendingMessages.length,0);
   manager.close();
   const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`
    import assert from 'node:assert/strict';import {createBackend} from './prototype/architecture/native-store-backend.mjs';
    const manager=await createBackend({path:process.argv[1],mode:'open'});
    assert.deepEqual(manager.getEntries().filter(e=>e.message?.role==='user').map(e=>e.message.content),JSON.parse(process.argv[2]));manager.close();`,path,JSON.stringify(expected)],{cwd:process.cwd(),encoding:'utf8'});
   assert.equal(child.status,0,child.stderr);
  } catch(error){try{manager.close();}catch{}throw error;}
 }
 console.log('PASS user steer at normal final boundary: no abort/early persistence, FIFO before followUp, error/aborted retention, same-host continuation, native subprocess history');
} finally {rmSync(directory,{recursive:true,force:true});}

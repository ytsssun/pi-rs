import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSessionOwner} from '../prototype/architecture/session-owner.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-owner-failures-'));
const timer=setTimeout(()=>{console.error('owner fixture timeout');process.exit(1);},15000);
try {
 for(const failure of ['makeHost','setup']) {
  const managers=[];
  const owner=await createSessionOwner({path:join(dir,failure+'.jsonl'),cwd:dir,mode:'create',makeHost:async manager=>{
   managers.push(manager);
   if(managers.length===2&&failure==='makeHost') throw Error('injected makeHost failure');
   return createHost(tsBackend(),{cwd:dir,sessionManager:manager,extensionPaths:[]});
  }});
  await owner.start();
  const old=owner.current,ctx=old.host.runner.createCommandContext();
  await assert.rejects(ctx.newSession({setup:async()=>{throw Error('injected setup failure');}}),new RegExp(`injected ${failure} failure`));
  assert.equal(managers.length,2);
  assert.throws(()=>owner.current,/terminal/);
  assert.throws(()=>ctx.cwd,/stale/);
  assert.throws(()=>old.manager.snapshot(),/unknown or closed session/);
  await owner.close();await owner.close();
  for(const manager of managers) assert.throws(()=>manager.snapshot(),/unknown or closed session/);
 }
 let entered,release;
 const enteredPromise=new Promise(r=>entered=r),releasePromise=new Promise(r=>release=r);
 const owner=await createSessionOwner({path:join(dir,'busy.jsonl'),cwd:dir,mode:'create',makeHost:manager=>createHost(tsBackend(),{cwd:dir,sessionManager:manager,extensionPaths:[]})});
 try {
  await owner.start();
  const {host,manager}=owner.current,ctx=host.runner.createCommandContext();
  await ctx.waitForIdle();
  const running=drive({host,manager,prompt:'fixture',stream:async()=>{
   entered();await releasePromise;return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop'};}};
  }});
  await enteredPromise;
  let settled=false;
  const waiting=ctx.waitForIdle().then(()=>{settled=true;});
  await new Promise(r=>setImmediate(r));assert.equal(settled,false);
  await assert.rejects(ctx.newSession(),/idle owner/);
  release();await running;await waiting;assert.equal(settled,true);
 }finally{await owner.close();}
 console.log('PASS real owner: idle waiter waits through drive; busy replacement rejects; makeHost/setup failures terminal, stale, all native handles closed; close idempotent');
}finally{clearTimeout(timer);rmSync(dir,{recursive:true,force:true});}

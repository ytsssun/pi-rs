import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createSessionOwner} from '../prototype/architecture/session-owner.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';

const dir=mkdtempSync(join(tmpdir(),'pi-with-session-'));
const events=[];
let veto=false, callbackCount=0, fresh;
const owner=await createSessionOwner({path:join(dir,'old.jsonl'),cwd:dir,mode:'create',makeHost:manager=>createHost(tsBackend(),{
  cwd:dir,sessionManager:manager,extensionPaths:[],factories:[pi=>{
    pi.on('session_before_switch',()=>veto?{cancel:true}:undefined);
    pi.on('session_start',(event,ctx)=>events.push(`start:${ctx.sessionManager.getSessionId()}`));
  }]
})});
try {
  await owner.start();
  const old=owner.current, ctx=old.host.runner.createCommandContext();
  const files=readdirSync(dir);
  await assert.rejects(ctx.newSession({withSession:42}),/must be a function/);
  assert.deepEqual(readdirSync(dir),files);
  veto=true;
  assert.deepEqual(await ctx.newSession({withSession:async()=>{callbackCount++;}}),{cancelled:true});
  assert.equal(callbackCount,0);assert.equal(owner.current,old);
  assert.deepEqual(readdirSync(dir),files);
  veto=false;
  assert.deepEqual(await ctx.newSession({
    setup:async manager=>{
      events.push(`setup:${manager.getSessionId()}`);
      manager.appendMessage({role:'assistant',content:[{type:'text',text:'setup marker'}],timestamp:1});
    },
    withSession:async next=>{
      callbackCount++;fresh=next;
      const id=next.sessionManager.getSessionId();
      assert.equal(owner.current.manager.getSessionId(),id);
      assert.deepEqual(events.slice(-2),[`start:${id}`,`setup:${id}`]);
      assert.throws(()=>ctx.cwd,/stale/);
      assert.equal(next.cwd,dir);assert.equal(next.isIdle(),true);await next.waitForIdle();
      assert.ok(JSON.stringify(next.sessionManager.getEntries()).includes('setup marker'));
      await next.sendMessage({customType:'callback',content:'persisted in callback',display:false});
      assert.ok(JSON.stringify(next.sessionManager.getEntries()).includes('persisted in callback'));
      const before=JSON.stringify(next.sessionManager.getEntries());
      await assert.rejects(next.sendUserMessage('unsupported'),/scheduling consumer/);
      await assert.rejects(next.sendMessage({customType:'unsupported',content:'x'},{triggerTurn:true}),/scheduling unsupported/);
      assert.equal(JSON.stringify(next.sessionManager.getEntries()),before);
    }
  }),{cancelled:false});
  assert.equal(callbackCount,1);
  const path=owner.current.path, bytes=readFileSync(path);
  // Callback exceptions propagate after replacement commits; fresh owner remains usable.
  await assert.rejects(fresh.newSession({withSession:async next=>{
    assert.equal(next.sessionManager.getSessionId(),owner.current.manager.getSessionId());
    throw Error('callback failure');
  }}),/callback failure/);
  assert.equal(owner.current.host.contextActions.isIdle(),true);
  assert.throws(()=>fresh.cwd,/stale/);
  await assert.rejects(fresh.sendMessage({customType:'stale',content:'no'}),/stale/);
  await assert.rejects(fresh.sendUserMessage('no'),/stale/);
  assert.deepEqual(readFileSync(path),bytes);
  // The replacement after the throwing callback can itself be replaced.
  assert.deepEqual(await owner.current.host.runner.createCommandContext().newSession(),{cancelled:false});
  await owner.close();
  const child=spawnSync(process.execPath,['--input-type=module','-e',`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';const entries=readFileSync(${JSON.stringify(path)},'utf8').trim().split('\n').map(JSON.parse);assert.equal(entries.filter(e=>e.type==='custom_message'&&e.customType==='callback').length,1);assert.ok(JSON.stringify(entries).includes('setup marker'));assert.ok(!JSON.stringify(entries).includes('stale'));`],{encoding:'utf8',timeout:15000});
  assert.equal(child.status,0,child.stderr);
  console.log('PASS withSession: actual native owner, start/setup/callback order, once, veto, guarded lifetime, callback failure recovery, immediate custom persistence and new-process reopen; fixture only');
}finally{await owner.close();rmSync(dir,{recursive:true,force:true});}

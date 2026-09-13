import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const deferred = () => {let resolve; const promise=new Promise(r=>resolve=r); return {promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
const [mode,path]=process.argv.slice(2);
const watchdog=setTimeout(()=>{console.error('cooperative cancellation timed out');process.exit(1);},15000);
if(mode==='reopen') {
  const manager=await createBackend({path,mode:'open'});
  const messages=manager.getEntries().filter(e=>e.message).map(e=>e.message);
  assert.deepEqual(messages.map(m=>m.role),['user','assistant','toolResult','assistant']);
  assert.equal(messages.at(-1).stopReason,'aborted');
  assert.equal(messages[2].toolCallId,'blocking-call');
  assert.equal(messages[2].isError,true);
  manager.close();
} else {
  const dir=mkdtempSync(join(tmpdir(),'pi-tool-cancel-'));
  try {
    for(const source of ['caller','extension']) {
      const file=join(dir,source+'.jsonl');
      const manager=await createBackend({path:file,cwd:dir});
      const entered=deferred(),notified=deferred(),release=deferred();
      let cleaned=false,calls=0,idle=false,executions=0;
      const host=await createHost(tsBackend(['blocking']),{cwd:dir,sessionManager:manager,extensionPaths:[],factories:[pi=>{
        pi.registerTool({name:'blocking',label:'blocking',description:'cooperative controlled tool',parameters:{type:'object',properties:{}},execute:async (_id,_args,signal)=>{
          executions++;
          signal.addEventListener('abort',()=>notified.resolve(),{once:true});
          entered.resolve();
          await release.promise;
          cleaned=true;
          signal.throwIfAborted();
          return {content:[{type:'text',text:'unexpected success'}]};
        }});
      }]});
      const controller=new AbortController();
      const trace=[];
      const before=manager.snapshot();
      await assert.rejects(drive({manager,host,prompt:"rejected",signal:controller.signal,parallel:true}),/does not support parallel/);
      assert.deepEqual(manager.snapshot(),before,"unsupported parallel cancellation cannot append input");
      const running=drive({manager,host,prompt:'call blocking',signal:controller.signal,trace,stream:async()=>{
        calls++;
        assert.equal(calls,1,'no provider request after cancellation');
        return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[{type:'toolCall',id:'blocking-call',name:'blocking',arguments:{}}],stopReason:'toolUse'};}};
      }});
      await entered.promise;
      const waiting=host.waitForIdle().then(()=>{idle=true;});
      if(source==='caller') controller.abort(); else host.contextActions.abort();
      await notified.promise;
      await tick();
      assert.equal(idle,false,'must await actual tool cleanup');
      assert.equal(cleaned,false);
      assert.equal(host.contextActions.isIdle(),false);
      release.resolve();
      const result=await running;
      await waiting;
      assert.equal(result.action.type,'done');
      assert.equal(cleaned,true);
      assert.equal(idle,true);
      assert.equal(executions,1);
      assert.equal(trace.filter(e=>e.type==='tool_result').length,1);
      assert.equal(trace.filter(e=>e.type==='cancel_settled').length,1);
      manager.close();
      const child=spawnSync(process.execPath,['--experimental-strip-types',fileURLToPath(import.meta.url),'reopen',file],{encoding:'utf8'});
      assert.equal(child.status,0,child.stderr);
    }
    console.log(JSON.stringify({passed:true,scope:'cooperative sequential registered tool; caller and extension abort; cleanup before idle; persisted pairing; child reopen; fixture provider only'}));
  } finally {rmSync(dir,{recursive:true,force:true});}
}
clearTimeout(watchdog);

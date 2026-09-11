import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {trySlashCommand} from '../prototype/architecture/command-invocation.mjs';
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise,resolve};
};
const bytes = path => existsSync(path) ? readFileSync(path) : null;
const tick = () => new Promise(resolve => setImmediate(resolve));
const watchdog = setTimeout(() => { console.error('command idle acceptance timed out'); process.exit(1); }, 15000);
const dir = mkdtempSync(join(tmpdir(),'pi-command-idle-'));
try {
  for (const outcome of ['success','provider failure','delivery failure']) {
    const path = join(dir,outcome+'.jsonl');
    const manager = await createBackend({path,cwd:dir});
    try {
      const entered = deferred(), release = deferred(), delivery = deferred(), finishDelivery = deferred();
      let calls = 0, commandEntered = false, commandFinished = false, waiting;
      const host = await createHost(tsBackend(),{cwd:dir,sessionManager:manager,extensionPaths:[],factories:[pi => {
        pi.registerCommand('unsupported',{description:'unsupported operations',handler:async (name,ctx) => ctx[name]('unused')});
        pi.registerCommand('probe',{description:'idle probe',handler:async (args,ctx) => {
          assert.equal(args,'raw args');
          assert.equal(ctx.isIdle(),false);
          assert.equal(ctx.hasPendingMessages(),false);
          commandEntered = true;
          waiting = ctx.waitForIdle();
          await waiting;
          assert.equal(ctx.isIdle(),true);
          commandFinished = true;
        }});
      }]});
      const ctx = host.runner.createCommandContext();
      assert.equal(ctx.isIdle(),true);
      await ctx.waitForIdle();
      const stream = async () => {
        calls++;
        entered.resolve();
        await release.promise;
        if(outcome === 'provider failure') throw Error('fixture provider failure');
        return {async *[Symbol.asyncIterator](){},async result(){return {
          role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop'
        };}};
      };
      const running = drive({manager,host,prompt:'only user input',stream,onMessage:async () => {
        delivery.resolve();
        await finishDelivery.promise;
        if(outcome === 'delivery failure') throw Error('fixture delivery failure');
      }});
      const completion = running.then(value => ({value}),error => ({error}));
      assert.equal(ctx.isIdle(),false,'busy immediately, before provider starts');
      await entered.promise;
      const before = manager.snapshot();
      const fileBefore = bytes(path);
      const command = trySlashCommand('/probe raw args',host.runner);
      assert.equal(commandEntered,true,'slash handler dispatch must be immediate');
      await tick();
      assert.equal(commandFinished,false,'waitForIdle must remain pending');
      assert.deepEqual(manager.snapshot(),before);
      assert.deepEqual(bytes(path),fileBefore);
      assert.equal(calls,1);
      await assert.rejects(drive({manager,host,prompt:'overlap',stream}),/active drive/);
      assert.equal(ctx.isIdle(),false);
      assert.deepEqual(manager.snapshot(),before,'rejected overlap cannot append input');
      for (const name of ['newSession','fork','navigateTree','switchSession','reload']) {
        await assert.rejects(async () => ctx[name]('unused'),new RegExp('Unexercised host binding: '+name));
        assert.deepEqual(manager.snapshot(),before,'unsupported '+name+' mutated history');
        assert.deepEqual(bytes(path),fileBefore);
      }
      if(outcome !== 'provider failure') {
        host.actions.sendMessage({customType:'cleanup',content:[],display:false},{triggerTurn:false});
      }
      release.resolve();
      if(outcome !== 'provider failure') {
        await delivery.promise;
        await tick();
        assert.equal(ctx.isIdle(),false,'delivery cleanup remains part of drive');
        assert.equal(commandFinished,false,'wait cannot finish at provider return');
        finishDelivery.resolve();
      }
      const result = await completion;
      if(outcome === 'success') assert.equal(result.value.action.type,'done');
      else assert.match(result.error?.message ?? '',/fixture (provider|delivery) failure/);
      assert.equal(await command,true);
      assert.equal(commandFinished,true);
      assert.equal(ctx.isIdle(),true);
      assert.equal(calls,1,'command cannot initiate another provider call');
      assert.deepEqual(host.errors,[]);
      for (const name of ['newSession','fork','navigateTree','switchSession','reload']) {
        const snapshot = manager.snapshot(), saved = bytes(path), count = host.errors.length;
        assert.equal(await trySlashCommand('/unsupported '+name,host.runner),true);
        assert.equal(host.errors.length,count+1);
        assert.match(host.errors.at(-1).error,new RegExp('Unexercised host binding: '+name));
        assert.deepEqual(manager.snapshot(),snapshot);
        assert.deepEqual(bytes(path),saved);
      }
      const users = manager.snapshot().entries.filter(e => e.type === 'message' && e.message.role === 'user');
      assert.equal(users.length,1,'command cannot append a user entry');
      assert.equal(users[0].message.content,'only user input');
      const after = manager.snapshot(), bytesAfter = bytes(path);
      for(const name of ['newSession','fork','navigateTree','switchSession','reload']) {
        await assert.rejects(async () => ctx[name]('unused'),/Unexercised host binding/);
        assert.deepEqual(manager.snapshot(),after);
        assert.deepEqual(bytes(path),bytesAfter);
      }
      host.actions.sendMessage({customType:'pending',content:[]},{triggerTurn:false});
      assert.equal(ctx.hasPendingMessages(),true);
      assert.equal(ctx.isIdle(),true,'queue state is independent of drive state');
      await ctx.waitForIdle();
      console.log('PASS native drive command lifecycle:',outcome);
    } finally { await manager.close(); }
  }
} finally { clearTimeout(watchdog); rmSync(dir,{recursive:true,force:true}); }

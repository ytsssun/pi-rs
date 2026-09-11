import assert from 'node:assert/strict';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const host=await createHost(tsBackend(),{extensionPaths:[],factories:[pi=>pi.registerCommand('probe',{description:'',handler:async()=>{assert.equal(host.contextActions.isIdle(),false); await host.runner.createCommandContext().waitForIdle();}})]});
const ctx=host.runner.createCommandContext();
const finish=host.beginDrive(); assert.equal(ctx.isIdle(),false); let settled=false; const wait=ctx.waitForIdle().then(()=>settled=true); await new Promise(r=>setTimeout(r,10)); assert.equal(settled,false); finish(); await wait; assert.equal(ctx.isIdle(),true); for(const name of ['newSession','fork','navigateTree','switchSession','reload']) assert.throws(()=>ctx[name](),/Unexercised host binding/); assert.throws(()=>host.beginDrive(),/active drive/); console.log('PASS command context idle lifecycle and explicit unsupported bindings');

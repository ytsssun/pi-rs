// Fault injection at prompt preparation; real host, owner and native store/driver.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {createSessionOwner} from '../prototype/architecture/session-owner.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {request} from '../prototype/architecture/native-store-backend.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-pending-life-'));
const owner=await createSessionOwner({path:join(dir,'old.jsonl'),cwd:dir,makeHost:manager=>createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[]})});
let calls=0;
const stream=async()=>{calls++;return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[],stopReason:'stop',timestamp:1};}};};
const send=host=>host.actions.sendMessage({customType:'identical',content:'same',display:false},{deliverAs:'nextTurn'});
const notes=manager=>manager.getEntries().filter(e=>e.type==='custom_message');
try {
 await owner.start();
 const {host,manager}=owner.current;
 assert.throws(()=>host.actions.sendMessage({customType:"invalid",content:"bad",display:"invalid"},{deliverAs:"nextTurn"}),/invalid nextTurn/);
 assert.equal(request({op:"runtime",handle:manager.handle,event:"pending_custom"}).length,0);
 send(host);send(host);
 assert.equal(request({op:"runtime",handle:manager.handle,event:"pending_custom"}).length,2,"Rust owns pending immediately at send time");
 const view=host.pendingMessages;view[0].message.content="tampered snapshot";
 assert.equal(request({op:"runtime",handle:manager.handle,event:"pending_custom"})[0].message.content,"same");
 const prepare=host.preparePrompt;
 host.preparePrompt=async()=>{throw Error('injected prepare failure');};
 const before=manager.getEntries();
 for(let i=0;i<3;i++){
  await assert.rejects(drive({host,manager,prompt:'retry',stream}),/injected prepare failure/);
  assert.deepEqual(manager.getEntries(),before);assert.equal(host.pendingMessages.length,2);assert.equal(host.contextActions.isIdle(),true);
 }
 assert.equal(calls,0);
 host.preparePrompt=prepare;
 await drive({host,manager,prompt:'retry',stream});
 assert.deepEqual(notes(manager).map(e=>e.content),['same','same']);assert.equal(host.pendingMessages.length,0);
 await drive({host,manager,prompt:'again',stream});assert.equal(notes(manager).length,2);
 // Stage pending work, fail before admission, then replace the idle owner.
 send(host);host.preparePrompt=async()=>{throw Error('injected prepare failure');};
 await assert.rejects(drive({host,manager,prompt:'never',stream}),/injected prepare failure/);
 const oldHandle=manager.handle;
 assert.deepEqual(await host.runner.createCommandContext().newSession(),{cancelled:false});
 assert.throws(()=>request({op:'snapshot',handle:oldHandle}));
 const fresh=owner.current;assert.equal(fresh.host.pendingMessages.length,0);
 await drive({...fresh,prompt:'fresh',stream});assert.deepEqual(notes(fresh.manager),[]);
 assert.equal(fresh.manager.getEntries().some(e=>e.message?.content==='never'),false);
 console.log(JSON.stringify({passed:true,prepareFailures:4,identicalMessagesPersisted:2,retryDuplicates:0,replacementLeaks:0,modelCalls:calls,fixture:true}));
} finally {await owner.close();rmSync(dir,{recursive:true,force:true});}

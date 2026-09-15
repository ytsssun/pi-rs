import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs'; import {tmpdir} from 'node:os'; import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs'; import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs'; import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-follow-budget-')); const manager=await createBackend({path:join(dir,'s.jsonl')}); let pi,calls=0;
const host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[x=>{pi=x;}]});
const stream=async()=>{const n=calls++; if(n<40) pi.sendUserMessage(`follow-${n}`,{deliverAs:'followUp'}); return {async *[Symbol.asyncIterator]() {},async result(){return {role:'assistant',content:[],stopReason:'stop',timestamp:1};}};};
try { await assert.rejects(drive({manager,host,prompt:'initial',stream}),/bounded fixture action limit exceeded/); assert.equal(calls,32,'one drive budget must stop after 32 actions'); assert.equal(host.pendingMessages.length,1,'unadmitted follow-up retained'); console.log(JSON.stringify({calls,pending:host.pendingMessages.length,scope:'drive-level follow-up budget',fixture:true})); } finally {manager.close();rmSync(dir,{recursive:true,force:true});}

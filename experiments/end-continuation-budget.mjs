import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-end-budget-'));let manager;
try{manager=await createBackend({path:join(dir,'session.jsonl')});let calls=0,ends=0;const host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[pi=>pi.on('agent_end',()=>{ends++;pi.sendUserMessage('again',{deliverAs:'followUp'});})]});
 await assert.rejects(drive({manager,host,prompt:'initial',sessionContinuation:true,stream:async()=>{calls++;return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[],stopReason:'stop',timestamp:1};}};}}),/bounded fixture action limit/);
 assert.equal(calls,32);assert.equal(ends,32);assert.equal(manager.pendingUsers().length,1);assert.equal(manager.snapshot().entries.filter(e=>e.message?.role==='user').length,32);
 console.log('PASS repeated end callback bounded at 32 requests, one unadmitted message retained, no duplicate history');
}finally{manager?.close();rmSync(dir,{recursive:true,force:true});}

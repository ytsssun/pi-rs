// Proves existing settlement primitives only; does not cancel an active transport/tool.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-cancel-settlement-'));
let manager;
try {
 const path=join(dir,'session.jsonl');
 manager=await createBackend({path});
 const call=payload=>request({op:'runtime',handle:manager.handle,timestamp:new Date().toISOString(),messageTimestamp:Date.now(),...payload});
 const pending=call({event:'begin',prompt:'probe'});
 assert.equal(pending.type,'model');assert.equal(typeof pending.requestId,'string');
 const completed={event:'model_result',requestId:pending.requestId,message:{role:'assistant',content:[],stopReason:'aborted',errorMessage:'probe settlement',timestamp:Date.now(),provider:'fixture',model:'fixture',api:'fixture'}};
 assert.equal(call(completed).type,'done');
 const frozen=JSON.stringify(manager.snapshot());
 assert.throws(()=>call(completed),/no pending|stale/);
 assert.equal(JSON.stringify(manager.snapshot()),frozen);
 manager.close();manager=undefined;
 manager=await createBackend({path,mode:'open'});
 assert.equal(manager.getEntries().filter(e=>e.message?.stopReason==='aborted').length,1);
 const next=call({event:'begin',prompt:'continue without replay'});
 assert.equal(next.type,'model');
 assert.notEqual(next.requestId,pending.requestId);
 assert.throws(()=>call(completed),/stale|mismatched/);
 assert.equal(manager.getEntries().filter(e=>e.message?.stopReason==='aborted').length,1);
 console.log('PASS existing aborted model settlement: persisted once, reopen, stale completion rejected; NOT active cancellation');
} finally {manager?.close();rmSync(dir,{recursive:true,force:true});}

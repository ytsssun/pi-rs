import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-inflight-')); const path=join(dir,'session.json');
const first=await createBackend({path,mode:'create'});
const marked=first.request?null:null;
// Use the backend's native handle directly through its documented request helper.
import {request} from '../prototype/architecture/native-store-backend.mjs';
request({op:'runtime',handle:first.handle,event:'mark_in_flight',requestId:'r1',toolCallId:'c1',toolName:'write'});
await first.close();
const second=await createBackend({path,mode:'open'});
assert.throws(()=>request({op:'runtime',handle:second.handle,event:'begin',prompt:'resume'}),/unresolved persisted tool calls/);
const resolved=request({op:'runtime',handle:second.handle,event:'resolve_in_flight',requestId:'r1',toolCallId:'c1',toolName:'write',outcome:'operator inspected file'});
assert.equal(resolved.type,'resolved');
console.log(JSON.stringify({verified:true,pendingBlocksReplay:true,explicitResolution:resolved.type}));
await second.close();

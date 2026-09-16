// Executed provider-effect failures against pinned upstream.
import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';import {createBackend} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
for(const stage of ['create','iterate','result']) {
const dir=mkdtempSync(join(tmpdir(),'pi-provider-failure-'));let manager;
const fail=()=>{throw Error('injected transport failure');};const stream=async()=>{if(stage==='create')fail();return {async *[Symbol.asyncIterator](){if(stage==='iterate')fail();},async result(){fail();}};};
const pick=e=>({type:e.type,...(e.type==='agent_end'?{messages:e.messages.map(m=>({role:m.role,stopReason:m.stopReason,errorMessage:m.errorMessage,api:m.api,provider:m.provider,model:m.model,usage:m.usage}))}:{})});
try{
 const upstream=[],native=[];const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'}},streamFn:stream});agent.subscribe(e=>{if(['agent_start','turn_start','turn_end','agent_end'].includes(e.type))upstream.push(pick(e));});await agent.prompt('initial');
 manager=await createBackend({path:join(dir,'session.jsonl')});const host=await createHost(tsBackend([]),{sessionManager:manager,extensionPaths:[],factories:[pi=>{for(const t of ['agent_start','turn_start','turn_end','agent_end'])pi.on(t,e=>native.push(pick(e)));}]});
 host.actions.setModel({id:'fixture',provider:'fixture',api:'fixture'});
 let rejection=null;try{await drive({manager,host,prompt:'initial',stream});}catch(e){rejection=e.message;}
 console.log(JSON.stringify({stage,upstream,native,rejection,fixture:true}));
 assert.deepEqual(native,upstream);assert.equal(rejection,null);
}finally{manager?.close();rmSync(dir,{recursive:true,force:true});}

}

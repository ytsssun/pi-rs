// Characterize the existing dispatch boundary; fixture model, actual native runtime.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-budget-'));
try {
 for(const rounds of [15,16]) {
  const manager=await createBackend({path:join(dir,`${rounds}.jsonl`)});
  try {
   let calls=0,effects=0;
   const host=await createHost(tsBackend(['count']),{sessionManager:manager,extensionPaths:[],factories:[pi=>pi.registerTool({name:'count',label:'Count',description:'count an effect',parameters:{type:'object',properties:{}},execute:async()=>{effects++;return {content:[{type:'text',text:'ok'}]};}})]});
   const stream=async()=>{const index=calls++;return {async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',timestamp:1,stopReason:index<rounds?'toolUse':'stop',content:index<rounds?[{type:'toolCall',name:'count',id:`c${index}`,arguments:{}}]:[{type:'text',text:'done'}]};}};};
   const run=()=>drive({manager,host,prompt:'work',stream});
   if(rounds===15)await run();else await assert.rejects(run,/bounded fixture action limit exceeded/);
   assert.equal(calls,16);assert.equal(effects,rounds);
   assert.equal(manager.getEntries().filter(e=>e.message?.role==='toolResult').length,rounds);
   assert.equal(host.contextActions.isIdle(),true);
   console.log(JSON.stringify({rounds,calls,effects,outcome:rounds===15?'completed':'budget_exhausted',fixture:true}));
  } finally {manager.close();}
 }
} finally {rmSync(dir,{recursive:true,force:true});}

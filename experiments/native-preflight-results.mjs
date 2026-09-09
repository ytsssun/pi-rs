import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-preflight-'));
try {
 for(const parallel of [false,true]) {
  const manager=await createBackend({path:join(dir,`${parallel}.json`)});
  try {
   const executed=[],resultHooks=[];
   const host=await createHost(tsBackend(['write']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{
    pi.registerTool({name:'write',label:'write',description:'fixture mutation',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']},execute:async(id)=>{executed.push(id);throw Error('execution failed');}});
    pi.on('tool_call',event=>event.toolCallId==='blocked'?{block:true,reason:'preflight blocked'}:undefined);
    pi.on('tool_result',event=>{resultHooks.push(event.toolCallId);return {content:[{type:'text',text:'observed execution failure'}]};});
   }]});
   let count=0;
   const stream=async()=>({async *[Symbol.asyncIterator](){},async result(){return ++count===1?{role:'assistant',content:[['blocked',{path:'safe'}],['invalid',{}],['executed',{path:'safe'}]].map(([id,args])=>({type:'toolCall',id,name:'write',arguments:args})),stopReason:'toolUse'}:{role:'assistant',content:[],stopReason:'stop'};}});
   await drive({manager,host,prompt:'fixture',parallel,stream});
   assert.deepEqual(executed,['executed']);
   assert.deepEqual(resultHooks,['executed']);
   const results=manager.snapshot().branch.filter(e=>e.message?.role==='toolResult').map(e=>e.message);
   assert.deepEqual(results.map(r=>r.toolCallId),['blocked','invalid','executed']);
   assert.deepEqual(results.map(r=>r.isError),[true,true,true]);
   assert.equal(results[0].content[0].text,'preflight blocked');
   assert.equal(results[2].content[0].text,'observed execution failure');
   assert.deepEqual(host.errors,[]);
  } finally {await manager.close();}
 }
 console.log(JSON.stringify({fixture:true,passed:['sequential and parallel preflight skip result hooks','executed failures invoke result hooks']}));
} finally {rmSync(dir,{recursive:true,force:true});}

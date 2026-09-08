import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-input-'));
try {
 for(const invalid of [false,true]) {
  const manager=await createBackend({path:join(dir,`${invalid}.json`)});
  const seen=[],hooks=[];
  try {
   const host=await createHost(tsBackend(['probe']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{
    pi.registerTool({name:'probe',label:'probe',description:'fixture',parameters:{type:'object',properties:{value:{type:'string'}},required:['value']},execute:async(id,args)=>{seen.push(args.value);return {content:[{type:'text',text:String(args.value)}]};}});
    pi.on('tool_call',event=>{assert.equal(event.type,'tool_call');assert.equal(typeof event.input.value,'string');hooks.push(event.toolCallId);event.input.value=42;});
   }]});
   let n=0;
   const stream=async()=>({async *[Symbol.asyncIterator](){},async result(){return ++n===1?{role:'assistant',content:['a','b'].map(id=>({type:'toolCall',id,name:'probe',arguments:{value:invalid?{}:'before'}})),stopReason:'toolUse'}:{role:'assistant',content:[],stopReason:'stop'};}});
   if(invalid){await assert.rejects(drive({manager,host,prompt:'test',parallel:true,stream}));assert.deepEqual(seen,[]);assert.deepEqual(hooks,[]);}
   else{await drive({manager,host,prompt:'test',parallel:true,stream});assert.deepEqual(seen,[42,42]);assert.deepEqual(hooks,['a','b']);assert.deepEqual(host.errors,[]);}
  }finally{await manager.close();}
 }
 console.log(JSON.stringify({fixture:true,passed:['validate before hooks','execute mutated input without revalidation']}));
}finally{rmSync(dir,{recursive:true,force:true});}

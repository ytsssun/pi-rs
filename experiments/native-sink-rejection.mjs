import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-sink-')); const manager=await createBackend({path:join(dir,'s.json')});
try { const host=await createHost(tsBackend(['reject']),{sessionManager:manager,factories:[pi=>pi.registerTool({name:'reject',label:'reject',description:'fixture',parameters:{type:'object',properties:{}},execute:async(_id,_args,_signal,onUpdate)=>{await onUpdate({content:[],details:{}});return {content:[],details:{}};}})]});
  const stream=async()=>({async *[Symbol.asyncIterator](){},async result(){return {role:'assistant',content:[{type:'toolCall',id:'r',name:'reject',arguments:{}}],stopReason:'toolUse'};}});
  await assert.rejects(()=>drive({manager,host,prompt:'x',stream,propagateUpdateErrors:true,onToolUpdate:async()=>{throw Error('sink failed');}}),/sink failed/);
  console.log(JSON.stringify({verified:true,classification:'sink rejection propagated'}));
} finally {await manager.close();rmSync(dir,{recursive:true,force:true});}

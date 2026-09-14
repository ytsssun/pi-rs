// Real Rust runtime/store and Pi ExtensionRunner; deterministic provider, no live model.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
for (const parallel of [false,true]) {
 const dir=mkdtempSync(join(tmpdir(),'pi-active-enforcement-'));
 const manager=await createBackend({path:join(dir,'session.jsonl')});
 const effect=join(dir,'forbidden');
 const hooks=[],executed=[];
 try {
  const host=await createHost(tsBackend(['allowed']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{
   for(const name of ['forbidden','allowed']) pi.registerTool({name,label:name,description:name,parameters:{type:'object',properties:{}},execute:async()=>{executed.push(name);if(name==='forbidden')writeFileSync(effect,'unsafe');return {content:[{type:'text',text:name}],details:{}};}});
   pi.on('tool_call',event=>{hooks.push(event.toolName);});
  }]});
  await host.runner.emit({type:'session_start'});
  let calls=0;
  const stream=async(_model,context)=>{
   calls++;
   assert.deepEqual(context.tools.map(t=>t.name),['allowed']);
   if(calls===2){
    const results=context.messages.filter(m=>m.role==='toolResult');
    assert.equal(results.length,2);assert.equal(results[0].isError,true);
    assert.equal(results[0].content[0].text,'Tool forbidden not found');
    assert.equal(results[1].isError,false);
   }
   assert.ok(calls<=2,'no extra provider continuation');
   const message={role:'assistant',content:calls===1?['forbidden','allowed'].map(name=>({type:'toolCall',id:name,name,arguments:{}})):[{type:'text',text:'done'}],stopReason:calls===1?'toolUse':'stop'};
   return {async *[Symbol.asyncIterator](){},async result(){return message}};
  };
  const result=await drive({manager,host,prompt:'test inactive tool',stream,parallel});
  assert.equal(result.action.type,'done');assert.equal(calls,2);
  assert.deepEqual(executed,['allowed']);assert.deepEqual(hooks,['allowed']);assert.equal(existsSync(effect),false);
  const messages=manager.snapshot().branch.filter(e=>e.message?.role==='toolResult').map(e=>e.message);
  assert.deepEqual(messages.map(m=>[m.toolName,m.isError]),[['forbidden',true],['allowed',false]]);
 } finally {await manager.close();rmSync(dir,{recursive:true,force:true});}
}
console.log('PASS inactive tool sequential+parallel: no execute/hook side effect, persisted error, active execution, exactly one continuation');

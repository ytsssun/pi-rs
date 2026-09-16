// Deterministic public CLI acceptance, real Pi loader/provider boundary and Rust store.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-registered-provider-'));
const headerExtension=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/system-prompt-header.ts');
const ext=join(dir,'provider.ts'), session=join(dir,'session.jsonl');
writeFileSync(ext,`export default pi=>{
 pi.on('agent_start',(_event,ctx)=>{if(ctx.hasUI!==false)throw Error('headless runner advertised UI');});
 pi.on('before_agent_start',(event,ctx)=>{
  if(event.systemPrompt!==ctx.getSystemPrompt())throw Error('getter mismatch');
  if(!event.systemPrompt.includes('Current working directory:'))throw Error('no upstream base');
  return {systemPrompt:event.systemPrompt+'\\nCHAIN_MARKER',message:{customType:'hook-proof',content:'hook '+event.prompt,display:false}};
 });
 pi.on('before_agent_start',(event,ctx)=>{
  if(!event.systemPrompt.endsWith('CHAIN_MARKER')||ctx.getSystemPrompt()!==event.systemPrompt)throw Error('chain failed');
  return {systemPrompt:event.systemPrompt+' SECOND_MARKER',message:{customType:'hook-second',content:null,display:false}};
 });
 pi.on('session_start',()=>pi.sendMessage({customType:'pending-proof',content:'pending',display:false},{deliverAs:'nextTurn'}));
 pi.registerProvider('acceptance-provider',{
 api:'acceptance-api',baseUrl:'http://127.0.0.1:1',apiKey:'deterministic-test-token',
 models:[{id:'tiny',name:'Tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context,options){
  if(!context.systemPrompt.includes('- read: Read file contents')||!context.systemPrompt.includes('Use edit for precise changes'))throw Error('missing original tool prompt contributions');
  if(!context.systemPrompt.endsWith('CHAIN_MARKER SECOND_MARKER'))throw Error('hook not called');
  const resumed=context.messages.some(m=>JSON.stringify(m).includes('continue'));

  if(!JSON.stringify(context.messages).includes('hook '))throw Error('custom absent');
  if(model.provider!=='acceptance-provider'||model.id!=='tiny'||model.api!=='acceptance-api')throw Error('wrong model identity');
  if(!options.signal || options.apiKey!=='deterministic-test-token')throw Error('missing stream options');
  if(JSON.stringify(context.messages).includes('FAIL_PROVIDER'))throw Error('deliberate provider failure');
  const results=context.messages.filter(m=>m.role==='toolResult');
  const content=results.length?[{type:'text',text:'tool result consumed '+results.length}]:[{type:'toolCall',id:'write-one',name:'write',arguments:{path:'proof.txt',content:'provider tool effect'}}];
  if(results.some(m=>m.isError))throw Error('tool failed');
  const message={role:'assistant',provider:model.provider,model:model.id,api:model.api,content,stopReason:results.length?'stop':'toolUse',timestamp:1,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
  return {async *[Symbol.asyncIterator](){},async result(){return message}};
 }
});};`);
const run=(args,extension=true)=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,...(extension?['--extension',headerExtension,'--extension',ext]:[]),...args],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
const ok=r=>{assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
try{
 const first=ok(run(['--input','write proof','--model','acceptance-provider/tiny']));
 assert.ok(first.statusUpdates.some(s=>s.key==='system-prompt'&&/^System: \d+ chars$/.test(s.text)));
 assert.deepEqual(first.extensionErrors,[]);assert.equal(first.fixture,false);assert.equal(readFileSync(join(dir,'proof.txt'),'utf8'),'provider tool effect');
 const before=readFileSync(session,'utf8');assert.match(before,/tool result consumed 1/);assert.match(before,/acceptance-provider\/tiny/);
 ok(run(['--resume','--input','continue']));
 assert.ok(readFileSync(session,'utf8').startsWith(before));
 const entriesBefore=before.trim().split('\n').map(JSON.parse);
 const userIndex=entriesBefore.findIndex(e=>e.message?.role==='user');
 const hookIndex=entriesBefore.findIndex(e=>e.customType==='hook-proof');
 assert.ok(hookIndex>userIndex);assert.equal(entriesBefore.filter(e=>e.customType==='hook-proof').length,1);
 assert.equal(entriesBefore[hookIndex-1].customType,'pending-proof');
 assert.equal(entriesBefore[hookIndex+1].customType,'hook-second');
 const restored=readFileSync(session,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(restored.filter(e=>e.customType==='hook-proof').length,2);
 assert.equal(restored.filter(e=>e.message?.role==='assistant').at(-1).message.stopReason,'stop');
 const missing=run(['--resume','--input','continue'],false);assert.notEqual(missing.status,0);assert.match(missing.stderr,/model not found/);
 console.log('PASS formal CLI unchanged system-prompt-header reaction: unchanged header extension, headless status, upstream base, chained prompts/getters, user/nextTurn/hook FIFO, one injection across real tool roundtrip, fresh-process resume/reset; deterministic only');
}finally{rmSync(dir,{recursive:true,force:true})}

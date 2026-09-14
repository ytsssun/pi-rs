// Deterministic public CLI acceptance, real Pi loader/provider boundary and Rust store.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-registered-provider-'));
const home=join(dir,'home'), parent=join(dir,'project'), workspace=join(parent,'child');
for(const p of [home,parent,workspace])mkdirSync(p,{recursive:true});
writeFileSync(join(home,'AGENTS.md'),'GLOBAL_SENTINEL');
writeFileSync(join(parent,'CLAUDE.md'),'ANCESTOR_SENTINEL');
writeFileSync(join(workspace,'AGENTS.md'),'SHADOWED_SENTINEL');
writeFileSync(join(workspace,'AGENTS.override.md'),'PROJECT_SENTINEL');
const pirate=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/pirate.ts');
const ext=join(dir,'provider.ts'), session=join(dir,'session.jsonl');
writeFileSync(ext,`export default pi=>{
 pi.on('before_agent_start',(event,ctx)=>{
  if(!event.systemPrompt.includes('GLOBAL_SENTINEL')||!event.systemPrompt.includes('ANCESTOR_SENTINEL')||!event.systemPrompt.includes('PROJECT_SENTINEL')||event.systemPrompt.includes('SHADOWED_SENTINEL'))throw Error('instructions absent before hook');
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
  const markers=['GLOBAL_SENTINEL','ANCESTOR_SENTINEL','PROJECT_SENTINEL'];
  if(markers.some((m,i)=>context.systemPrompt.split(m).length!==2||(i>0&&context.systemPrompt.indexOf(m)<context.systemPrompt.indexOf(markers[i-1]))))throw Error('instruction order/dedup');
  if(!context.systemPrompt.endsWith('CHAIN_MARKER SECOND_MARKER'))throw Error('hook not called');
  const resumed=context.messages.some(m=>JSON.stringify(m).includes('continue'));
  if(context.systemPrompt.includes('UPDATED_SENTINEL')!==resumed)throw Error('resume did not reread instructions');
  if(context.systemPrompt.includes('PIRATE MODE')===resumed)throw Error('pirate/reset mismatch');
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
const run=(args,extension=true,agentDir=home)=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',workspace,...(extension?['--extension',pirate,'--extension',ext]:[]),...args],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:home,PI_CODING_AGENT_DIR:agentDir}});
const ok=r=>{assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
try{
 const oracle=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {loadProjectContextFiles} from ${JSON.stringify(new URL('../vendor/pi-mono/packages/coding-agent/src/core/resource-loader.ts',import.meta.url).href)}; console.log(JSON.stringify(loadProjectContextFiles({cwd:${JSON.stringify(workspace)},agentDir:${JSON.stringify(parent)}})));`],{encoding:'utf8',env:{PATH:process.env.PATH,HOME:home,PI_CODING_AGENT_DIR:home}});
 assert.equal(oracle.status,0,oracle.stderr);
 const files=JSON.parse(oracle.stdout);
 assert.equal(files.filter(f=>f.content==='ANCESTOR_SENTINEL').length,1);
 assert.deepEqual(files.filter(f=>/SENTINEL/.test(f.content)).map(f=>f.content),['ANCESTOR_SENTINEL','PROJECT_SENTINEL']);

 const first=ok(run(['--command','pirate','--input','write proof','--model','acceptance-provider/tiny']));
 assert.equal(first.fixture,false);assert.equal(readFileSync(join(workspace,'proof.txt'),'utf8'),'provider tool effect');
 const before=readFileSync(session,'utf8');assert.match(before,/tool result consumed 1/);assert.match(before,/acceptance-provider\/tiny/);
 writeFileSync(join(workspace,'AGENTS.override.md'),'PROJECT_SENTINEL UPDATED_SENTINEL');
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
 // Agent directory also being an ancestor must not duplicate its instructions.
 writeFileSync(join(parent,'CLAUDE.md'),'GLOBAL_SENTINEL ANCESTOR_SENTINEL');
 ok(run(['--resume','--input','continue'],true,parent));
 const missing=run(['--resume','--input','continue'],false);assert.notEqual(missing.status,0);assert.match(missing.stderr,/model not found/);
 console.log('PASS project instructions: override precedence, global/ancestor/project order, ancestor agentDir dedup, before-hook visibility, tool continuation, fresh-process reread; deterministic only');
}finally{rmSync(dir,{recursive:true,force:true})}

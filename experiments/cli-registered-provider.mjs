// Deterministic public CLI acceptance, real Pi loader/provider boundary and Rust store.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-registered-provider-'));
const ext=join(dir,'provider.ts'), session=join(dir,'session.jsonl');
writeFileSync(ext,`export default pi=>pi.registerProvider('acceptance-provider',{
 api:'acceptance-api',baseUrl:'http://127.0.0.1:1',apiKey:'deterministic-test-token',
 models:[{id:'tiny',name:'Tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context,options){
  if(model.provider!=='acceptance-provider'||model.id!=='tiny'||model.api!=='acceptance-api')throw Error('wrong model identity');
  if(!options.signal || options.apiKey!=='deterministic-test-token')throw Error('missing stream options');
  if(JSON.stringify(context.messages).includes('FAIL_PROVIDER'))throw Error('deliberate provider failure');
  const results=context.messages.filter(m=>m.role==='toolResult');
  const content=results.length?[{type:'text',text:'tool result consumed '+results.length}]:[{type:'toolCall',id:'write-one',name:'write',arguments:{path:'proof.txt',content:'provider tool effect'}}];
  if(results.some(m=>m.isError))throw Error('tool failed');
  const message={role:'assistant',provider:model.provider,model:model.id,api:model.api,content,stopReason:results.length?'stop':'toolUse',timestamp:1,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
  return {async *[Symbol.asyncIterator](){},async result(){return message}};
 }
});`);
const run=(args,extension=true)=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,...(extension?['--extension',ext]:[]),...args],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
const ok=r=>{assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
try{
 const first=ok(run(['--input','write proof','--model','acceptance-provider/tiny']));
 assert.equal(first.fixture,false);assert.equal(readFileSync(join(dir,'proof.txt'),'utf8'),'provider tool effect');
 const before=readFileSync(session,'utf8');assert.match(before,/tool result consumed 1/);assert.match(before,/acceptance-provider\/tiny/);
 ok(run(['--resume','--input','continue']));
 assert.ok(readFileSync(session,'utf8').startsWith(before));
 const missing=run(['--resume','--input','continue'],false);assert.notEqual(missing.status,0);assert.match(missing.stderr,/model not found/);
 const failure=run(['--resume','--input','FAIL_PROVIDER']);ok(failure);assert.match(readFileSync(session,'utf8'),/deliberate provider failure/);const entries=readFileSync(session,'utf8').trim().split('\n').map(JSON.parse);assert.equal(entries.filter(e=>e.message?.role==='assistant').at(-1).message.stopReason,'error');
 console.log('PASS registered provider formal CLI: model/options, write/result continuation, fresh-process saved-model resume, missing provider rejected, provider failure surfaced; deterministic only');
}finally{rmSync(dir,{recursive:true,force:true})}

// Public CLI, unchanged pinned Pi extension, deterministic registered provider.
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const plugin=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/kimi-deferred-tools.ts');
const hash=()=>createHash('sha256').update(readFileSync(plugin)).digest('hex');
const originalHash=hash();
const dir=mkdtempSync(join(tmpdir(),'pi-cli-dynamic-'));
const session=join(dir,'session.jsonl'), provider=join(dir,'provider.ts'), observations=join(dir,'observations.jsonl');
writeFileSync(provider,`import {appendFileSync} from 'node:fs';
export default pi=>pi.registerProvider('dynamic-test',{
 api:'dynamic-test',baseUrl:'http://127.0.0.1:1',apiKey:'fixture-only',
 models:[{id:'tiny',name:'Tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context){
  const names=context.tools.map(t=>t.name);
  const lastUser=context.messages.findLastIndex(m=>m.role==='user');
  const results=context.messages.slice(lastUser+1).filter(m=>m.role==='toolResult');
  const expected=results.length?['tool_search','Calculator']:['tool_search'];
  if(JSON.stringify(names)!==JSON.stringify(expected))throw Error('wrong active schemas '+JSON.stringify(names));
  if(results.some(r=>r.isError))throw Error('tool execution failed');
  if(results.length && results[0].details?.added?.[0]!=='Calculator')throw Error('tool_search did not synchronously activate Calculator');
  if(results.length===2 && results[1].content[0].text!=='42')throw Error('missing original Calculator result');
  appendFileSync(${JSON.stringify(observations)},JSON.stringify({names,results:results.map(r=>({tool:r.toolName,content:r.content,details:r.details}))})+'\\n');
  const content=results.length===0?[{type:'toolCall',id:'search-'+lastUser,name:'tool_search',arguments:{query:'calc'}}]:results.length===1?[{type:'toolCall',id:'calc-'+lastUser,name:'Calculator',arguments:{expr:'100 + 500'}}]:[{type:'text',text:'original Calculator returned 42'}];
  const message={role:'assistant',provider:model.provider,model:model.id,api:model.api,content,stopReason:results.length<2?'toolUse':'stop',timestamp:1,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
  return {async *[Symbol.asyncIterator](){},async result(){return message}};
 }});`);
const run=resume=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,'--extension',plugin,'--extension',provider,...(resume?['--resume']:['--model','dynamic-test/tiny']),'--input','Use tools to calculate'],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
try {
 let before='';
 for(const resume of [false,true]) {
  const result=run(resume);assert.equal(result.status,0,result.stderr);JSON.parse(result.stdout);
  const history=readFileSync(session,'utf8');assert.ok(history.startsWith(before));before=history;
  const messages=history.trim().split('\n').map(JSON.parse).flatMap(e=>e.message?[e.message]:[]);
  const calc=messages.filter(m=>m.role==='toolResult'&&m.toolName==='Calculator');
  assert.equal(calc.length,resume?2:1);assert.ok(calc.every(m=>!m.isError&&m.content[0].text==='42'));
 }
 const observed=readFileSync(observations,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(observed.length,6);assert.deepEqual(observed.map(o=>o.names),[['tool_search'],['tool_search','Calculator'],['tool_search','Calculator'],['tool_search'],['tool_search','Calculator'],['tool_search','Calculator']]);
 assert.equal(hash(),originalHash);
 console.log(JSON.stringify({passed:true,pluginSha256:originalHash,providerCalls:6,freshProcessResume:true,deterministic:true,scope:'JS active-tool state; Rust loop/store; Calculator fixed 42 is not arithmetic verification'}));
} finally {rmSync(dir,{recursive:true,force:true});}

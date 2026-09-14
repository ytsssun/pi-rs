// Formal CLI + unchanged pinned ExtensionRunner; deterministic provider, no network.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-context-hook-'));
const ext=join(dir,'extension.ts'),session=join(dir,'session.jsonl');
const source=`import {appendFileSync} from 'node:fs';
export default pi=>{
 pi.on('context',event=>{
  if(event.messages.some(m=>m.contextMarker))throw Error('projection leaked into canonical history');
  event.messages.push({role:'user',content:[{type:'text',text:'inplace-marker'}],timestamp:1});
 });
 pi.on('context',event=>{
  if(!JSON.stringify(event.messages.at(-1)).includes('inplace-marker'))throw Error('inplace mutation not chained');
  return {messages:event.messages.map(m=>({...m,contextMarker:'replacement',content:structuredClone(m.content)}))};
 });
 pi.on('context',event=>{
  if(!event.messages.every(m=>m.contextMarker==='replacement'))throw Error('replacement not chained');
  event.messages.at(-1).content[0].text='final-marker';
 });
 pi.registerProvider('context-test',{api:'context-test',baseUrl:'http://127.0.0.1:1',apiKey:'fixture',
 models:[{id:'tiny',name:'Tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context){
  if(!context.messages.every(m=>m.contextMarker==='replacement'))throw Error('provider lost replacement');
  if(context.messages.at(-1).content[0].text!=='final-marker')throw Error('provider lost inplace mutation');
  appendFileSync(new URL('./requests.jsonl',import.meta.url),JSON.stringify(context.messages)+'\\n');
  const results=context.messages.filter(m=>m.role==='toolResult');
  if(results.some(m=>m.isError))throw Error('tool failed');
  const message={role:'assistant',provider:model.provider,model:model.id,api:model.api,
   content:results.length?[{type:'text',text:'consumed-result'}]:[{type:'toolCall',id:'write-context',name:'write',arguments:{path:'proof.txt',content:'context tool effect'}}],
   stopReason:results.length?'stop':'toolUse',timestamp:1,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
  return {async *[Symbol.asyncIterator](){},async result(){return message}};
 }});
};`;
writeFileSync(ext,source);
const run=args=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,'--extension',ext,...args],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
const ok=r=>{assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.deepEqual(out.extensionErrors??[],[]);return out};
try{
 ok(run(['--input','write proof','--model','context-test/tiny']));
 assert.equal(readFileSync(join(dir,'proof.txt'),'utf8'),'context tool effect');
 const before=readFileSync(session,'utf8');
 assert.doesNotMatch(before,/contextMarker|final-marker|inplace-marker/);
 assert.match(before,/consumed-result/);
 ok(run(['--resume','--input','continue']));
 const after=readFileSync(session,'utf8');assert.ok(after.startsWith(before));
 assert.doesNotMatch(after,/contextMarker|final-marker|inplace-marker/);
 const requests=readFileSync(join(dir,'requests.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const oracle=await createHost(tsBackend(),{cwd:dir,extensionPaths:[ext]});
 const canonical=[{role:'user',content:'write proof',timestamp:1}];
 const snapshot=structuredClone(canonical);
 const expected=await oracle.runner.emitContext(canonical);
 assert.deepEqual(canonical,snapshot);assert.deepEqual(oracle.errors,[]);
 // Compare shape/content, excluding request-owned wall-clock timestamps.
 const normalize=ms=>ms.map(({timestamp,...m})=>m);
 assert.deepEqual(normalize(requests[0]),normalize(expected));
 assert.equal(requests.length,3);assert.equal(requests[0].filter(m=>m.role==='toolResult').length,0);
 assert.equal(requests[1].filter(m=>m.role==='toolResult').length,1);assert.equal(requests[2].filter(m=>m.role==='toolResult').length,1);
 assert.ok(requests[2].some(m=>JSON.stringify(m.content).includes('continue')));
 console.log(JSON.stringify({pass:true,scope:'formal CLI chained inplace/replacement context, tool continuation, canonical isolation, subprocess resume; deterministic only',extensionSha256:createHash('sha256').update(source).digest('hex')}));
}finally{rmSync(dir,{recursive:true,force:true})}

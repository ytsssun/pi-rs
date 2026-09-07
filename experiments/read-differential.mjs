// Executes unchanged, pinned upstream read implementation; see write-differential.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstream = path.join(root, 'vendor/pi-mono');
const commit = '9767ba275f3e9a5ee0f5c5342249b629ab1b2282';
assert.equal(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
// Import host namespaces before VM linking. Dynamic import within recursively
// linked VM callbacks crashes Node 22.18 in the clean-checkout repro (T014).
const builtins = new Map();
for (const id of ['fs', 'fs/promises', 'path', 'node:fs', 'node:fs/promises', 'node:os', 'node:path', 'node:url', 'node:child_process']) {
  builtins.set(id, await import(id));
}
const loaded = [], stubs = [], cache = new Map();
let forbiddenStubCalls = 0, textMimeStubCalls = 0;
function synthetic(id, exports) {
  return new vm.SyntheticModule(Object.keys(exports), function() { for (const [k,v] of Object.entries(exports)) this.setExport(k,v); }, {identifier:id});
}
const stubExports = {
  typebox: {Type:{Object:x=>x,String:x=>x,Number:x=>x,Optional:x=>x}},
  'renderers/read.ts': {readRenderers:{}},
  'utils/image-process.ts':{processImage:()=>{forbiddenStubCalls++;throw Error('image processor excluded');}},
  'utils/mime.ts':{detectSupportedImageMimeTypeFromFile:async()=>{textMimeStubCalls++;return null;}},
  'tool-definition-wrapper.ts': {wrapToolDefinition:()=>{forbiddenStubCalls++;throw Error('wrapper must not execute');}},
  'cross-spawn': {default:()=>{forbiddenStubCalls++;throw Error('cross-spawn must not execute');}}
};
async function load(id) {
  if (cache.has(id)) return cache.get(id);
  const key = Object.keys(stubExports).find(k=>id===k || id.endsWith('/'+k));
  let mod;
  if (key) { stubs.push(key); mod=synthetic(id,stubExports[key]); }
  else if (id.startsWith('node:') || ['fs','fs/promises','path'].includes(id)) mod=synthetic(id,builtins.get(id));
  else {
    assert(id.startsWith(upstream+path.sep),`unexpected module ${id}`);
    const relative=path.relative(upstream,id);
    assert.equal(execFileSync('git',['-C',upstream,'status','--porcelain','--',relative],{encoding:'utf8'}).trim(),'');
    loaded.push({path:relative,sha256:createHash('sha256').update(fs.readFileSync(id)).digest('hex'),gitStatus:'clean'});
    mod=new vm.SourceTextModule(stripTypeScriptTypes(fs.readFileSync(id,'utf8')),{identifier:id});
  }
  cache.set(id,mod);
  await mod.link((spec,ref)=>load(spec.startsWith('.') ? path.resolve(path.dirname(ref.identifier),spec):spec));
  return mod;
}
const module=await load(path.join(upstream,'packages/coding-agent/src/core/tools/read.ts'));
await module.evaluate();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pi-read-diff-'));
const casesPath=path.join(root,'experiments/read-cases.json');
const cases=JSON.parse(fs.readFileSync(casesPath,'utf8'));
const originalOnly=process.argv.includes('--original-only');
const hash=x=>createHash('sha256').update(x).digest('hex');
const results=[];
async function runOriginal(dir,args,id) {
 try {return {error:false,text:(await module.namespace.createReadToolDefinition(dir).execute(id,args)).content[0].text};}
 catch(e){return {error:true,text:e.message};}
}
function runRust(dir,args,id,base) {
 const fixture=path.join(base,'fixture.json'),session=path.join(base,'session.json');
 fs.writeFileSync(fixture,JSON.stringify([{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'read',arguments:JSON.stringify(args)}}]},{role:'assistant',content:'fixture complete'}]));
 execFileSync(process.env.PI_RS_BIN||path.join(root,'target/debug/pi-rs'),['--input','read page','--workspace',dir,'--session',session,'--fixture',fixture],{encoding:'utf8'});
 const text=JSON.parse(fs.readFileSync(session)).messages.find(m=>m.role==='tool').content;
 return {error:text.startsWith('ERROR:'),text};
}
try {
 for(const c of cases) {
  const dir=path.join(temp,c.id);fs.mkdirSync(dir);
  const text=c.text??((c.repeat??'').repeat(c.count??0)+(c.tail??''));
  fs.writeFileSync(path.join(dir,'file.txt'),text);
  const args={path:'file.txt',...c.args};
  const original=await runOriginal(dir,args,c.id);
  assert.equal(original.error,!!c.error,`${c.id}: original expected success/error`);
  if(!originalOnly) {
   const rust=runRust(dir,args,c.id,dir);
   assert.equal(rust.error,original.error,`${c.id}: Rust success/error`);
   if(!original.error) assert.equal(rust.text,original.text,`${c.id}: exact tool text`);
  }
  assert.equal(fs.readFileSync(path.join(dir,'file.txt'),'utf8'),text);
  results.push({id:c.id,passed:true,error:original.error,sourceBytes:Buffer.byteLength(text),outputBytes:Buffer.byteLength(original.text),outputSha256:hash(original.text),tail:original.text.slice(-180)});
 }
 const exclusions=[];
 for(const c of [
  {id:'zero-offset',text:'a\nb\n',args:{offset:0}},
  {id:'zero-limit',text:'a\nb\n',args:{limit:0}},
  {id:'source-over-8mib',text:'x'.repeat(8*1024*1024+1),args:{}}
 ]) {
  const dir=path.join(temp,c.id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'file.txt'),c.text);
  const args={path:'file.txt',...c.args}, original=await runOriginal(dir,args,c.id);
  assert.equal(original.error,false);
  let rustRejected=null;
  if(!originalOnly) {const rust=runRust(dir,args,c.id,dir);rustRejected=rust.error;assert.equal(rustRejected,true,`${c.id}: explicit exclusion`);}
  exclusions.push({id:c.id,originalSuccess:true,originalOutput:original.text,rustRejected});
 }
 assert.equal(forbiddenStubCalls,0);
 console.log(JSON.stringify({upstreamCommit:commit,node:process.version,mode:originalOnly?'original-only':'original/Rust text-read differential',casesSha256:hash(fs.readFileSync(casesPath)),loadedOriginalModules:loaded,stubbedModules:stubs,forbiddenStubCalls,textMimeStubCalls,validation:'real filesystem; image detector forced text; no model inference',results,exclusions},null,2));
} finally {fs.rmSync(temp,{recursive:true,force:true});}

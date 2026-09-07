// Executes unchanged, pinned upstream edit implementation; see write-differential.md.
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
const loaded = [], stubs = [], cache = new Map();
let forbiddenStubCalls = 0, renderStubCalls = 0;
function synthetic(id, exports) {
  return new vm.SyntheticModule(Object.keys(exports), function() { for (const [k,v] of Object.entries(exports)) this.setExport(k,v); }, {identifier:id});
}
const stubExports = {
  typebox: {Type:{Object:x=>x,String:x=>x,Array:x=>x}},
  'renderers/edit.ts': {editRenderers:{}},
  diff: {diffLines:()=>{renderStubCalls++; return [];},createTwoFilesPatch:()=>{renderStubCalls++; return '';},FILE_HEADERS_ONLY:0},
  'tool-definition-wrapper.ts': {wrapToolDefinition:()=>{forbiddenStubCalls++;throw Error('wrapper must not execute');}},
  'cross-spawn': {default:()=>{forbiddenStubCalls++;throw Error('cross-spawn must not execute');}}
};
async function load(id) {
  if (cache.has(id)) return cache.get(id);
  const key = Object.keys(stubExports).find(k=>id===k || id.endsWith('/'+k));
  let mod;
  if (key) { stubs.push(key); mod=synthetic(id,stubExports[key]); }
  else if (id.startsWith('node:') || ['fs','fs/promises','path'].includes(id)) mod=synthetic(id,await import(id));
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
const module=await load(path.join(upstream,'packages/coding-agent/src/core/tools/edit.ts'));
await module.evaluate();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pi-edit-diff-'));
const casesPath=process.env.EDIT_CASES || path.join(root,'experiments/edit-cases.json');
const cases=JSON.parse(fs.readFileSync(casesPath,'utf8'));
const originalOnly=process.argv.includes('--original-only');
const results=[];
try {
 for(const c of cases) {
  const pi=path.join(temp,c.id,'pi'),rust=path.join(temp,c.id,'rust'); fs.mkdirSync(pi,{recursive:true});fs.mkdirSync(rust,{recursive:true});
  for(const dir of [pi,rust]) fs.writeFileSync(path.join(dir,'file.txt'),c.before);
  const args={path:'file.txt',edits:c.edits};
  let originalError=null, originalResult=null;
  try { originalResult=await module.namespace.createEditToolDefinition(pi).execute(c.id,structuredClone(args)); } catch(e) {originalError=e.message;}
  const piBytes=fs.readFileSync(path.join(pi,'file.txt'));
  assert.equal(originalError!==null,!!c.error,`${c.id}: original error expectation`);
  assert.deepEqual(piBytes,Buffer.from(c.error?c.before:c.expected),`${c.id}: original expected bytes`);
  let rustResult=null;
  if(!originalOnly){
   const fixture=path.join(temp,c.id,'fixture.json'),session=path.join(temp,c.id,'session.json');
   fs.writeFileSync(fixture,JSON.stringify([{role:'assistant',content:null,tool_calls:[{id:c.id,type:'function',function:{name:'edit',arguments:JSON.stringify(args)}}]},{role:'assistant',content:'fixture complete'}]));
   execFileSync(process.env.PI_RS_BIN||path.join(root,'target/debug/pi-rs'),['--input','edit file','--workspace',rust,'--session',session,'--fixture',fixture,'--allow-mutations'],{encoding:'utf8'});
   rustResult=JSON.parse(fs.readFileSync(session)).messages.find(m=>m.role==='tool').content;
   assert.equal(rustResult.startsWith('ERROR:'),!!c.error,`${c.id}: Rust success/error`);
   assert.deepEqual(fs.readFileSync(path.join(rust,'file.txt')),piBytes,`${c.id}: Rust/Pi bytes`);
  }
  results.push({id:c.id,passed:true,outcome:c.error?'error, original bytes unchanged':'success, bytes matched',originalError,rustResult});
 }
 // Known exclusions: execute original preparation/fuzzy behavior to prove scope boundaries.
 const excluded=[];
 for(const [id,before,raw] of [
  ['fuzzy-smart-quotes','“hello”\n',{path:'file.txt',edits:[{oldText:'"hello"',newText:'goodbye'}]}],
  ['legacy-prepare','abc\n',{path:'file.txt',oldText:'abc',newText:'xyz'}],
  ['string-edits-prepare','abc\n',{path:'file.txt',edits:JSON.stringify([{oldText:'abc',newText:'xyz'}])}]
 ]) {
  const dir=path.join(temp,id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'file.txt'),before);
  const def=module.namespace.createEditToolDefinition(dir);
  const prepared=def.prepareArguments(structuredClone(raw));
  await def.execute(id,prepared);
  let rustRejected=null;
  if(!originalOnly) {
   const rustDir=path.join(dir,'rust');fs.mkdirSync(rustDir);fs.writeFileSync(path.join(rustDir,'file.txt'),before);
   const fixture=path.join(dir,'fixture.json'),session=path.join(dir,'session.json');
   fs.writeFileSync(fixture,JSON.stringify([{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'edit',arguments:JSON.stringify(raw)}}]},{role:'assistant',content:'fixture complete'}]));
   execFileSync(process.env.PI_RS_BIN||path.join(root,'target/debug/pi-rs'),['--input','excluded edit profile','--workspace',rustDir,'--session',session,'--fixture',fixture,'--allow-mutations'],{encoding:'utf8'});
   const result=JSON.parse(fs.readFileSync(session)).messages.find(m=>m.role==='tool').content;
   rustRejected=result.startsWith('ERROR:');assert.equal(rustRejected,true,`${id}: expected explicit unsupported profile`);
   assert.equal(fs.readFileSync(path.join(rustDir,'file.txt'),'utf8'),before);
  }
  excluded.push({id,originalSuccess:true,after:fs.readFileSync(path.join(dir,'file.txt'),'utf8'),rustRejected,rustProfile:'excluded; exact-match array schema only'});
 }
 assert.equal(forbiddenStubCalls,0);
 console.log(JSON.stringify({upstreamCommit:commit,node:process.version,mode:originalOnly?'original-only expected fixture validation':'original/Rust exact-profile differential',casesSha256:createHash('sha256').update(fs.readFileSync(casesPath)).digest('hex'),loadedOriginalModules:loaded,stubbedModules:stubs,forbiddenStubCalls,renderStubCalls,validation:'scripted fixture; real filesystem edits; no model calls; rendering excluded',results,excluded},null,2));
} finally { fs.rmSync(temp,{recursive:true,force:true}); }

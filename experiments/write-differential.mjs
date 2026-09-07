// Executes unchanged, pinned upstream write implementation; see write-differential.md.
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
let forbiddenStubCalls = 0;
function synthetic(id, exports) {
  return new vm.SyntheticModule(Object.keys(exports), function() { for (const [k,v] of Object.entries(exports)) this.setExport(k,v); }, {identifier:id});
}
const stubExports = {
  typebox: {Type:{Object:x=>x,String:x=>x}},
  'renderers/write.ts': {writeRenderers:{}},
  'tool-definition-wrapper.ts': {wrapToolDefinition:()=>{forbiddenStubCalls++;throw Error('wrapper must not execute');}},
  'cross-spawn': {default:()=>{forbiddenStubCalls++;throw Error('cross-spawn must not execute');}}
};
async function load(id) {
  if (cache.has(id)) return cache.get(id);
  const key = Object.keys(stubExports).find(k=>id===k || id.endsWith('/'+k));
  let mod;
  if (key) { stubs.push(key); mod=synthetic(id,stubExports[key]); }
  else if (id.startsWith('node:') || ['fs/promises','path'].includes(id)) mod=synthetic(id,await import(id));
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
const module=await load(path.join(upstream,'packages/coding-agent/src/core/tools/write.ts'));
await module.evaluate();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pi-write-diff-'));
const cases=[{id:'nested',path:'nested/deep/a.txt',content:'created\n'},{id:'overwrite',path:'existing.txt',content:'new content\n',before:'old content\n'},{id:'utf8',path:'unicode.txt',content:'你好 🌍 café\n'},{id:'empty',path:'empty.txt',content:''}];
const results=[];
try {
 for(const c of cases) {
  const pi=path.join(temp,c.id,'pi'),rust=path.join(temp,c.id,'rust'); fs.mkdirSync(pi,{recursive:true});fs.mkdirSync(rust,{recursive:true});
  if(c.before!==undefined) for(const dir of [pi,rust]) fs.writeFileSync(path.join(dir,c.path),c.before);
  const original=await module.namespace.createWriteToolDefinition(pi).execute(c.id,{path:c.path,content:c.content});
  const fixture=path.join(temp,c.id,'fixture.json'),session=path.join(temp,c.id,'session.json');
  fs.writeFileSync(fixture,JSON.stringify([{role:'assistant',content:null,tool_calls:[{id:c.id,type:'function',function:{name:'write',arguments:JSON.stringify({path:c.path,content:c.content})}}]},{role:'assistant',content:'fixture complete'}]));
  execFileSync(path.join(root,'target/debug/pi-rs'),['--input','write file','--workspace',rust,'--session',session,'--fixture',fixture,'--allow-mutations'],{encoding:'utf8'});
  const result=JSON.parse(fs.readFileSync(session)).messages.find(m=>m.role==='tool').content;
  assert.equal(result,original.content[0].text);
  const piBytes=fs.readFileSync(path.join(pi,c.path)),rustBytes=fs.readFileSync(path.join(rust,c.path));
  assert.deepEqual(rustBytes,piBytes);assert.deepEqual(rustBytes,Buffer.from(c.content));
  results.push({id:c.id,passed:true,bytes:rustBytes.length,result});
 }
 assert.equal(forbiddenStubCalls,0);
 console.log(JSON.stringify({upstreamCommit:commit,node:process.version,loadedOriginalModules:loaded,stubbedModules:stubs,forbiddenStubCalls,validation:'scripted fixture; real filesystem writes; no model calls',results},null,2));
} finally { fs.rmSync(temp,{recursive:true,force:true}); }

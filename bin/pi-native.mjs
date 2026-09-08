#!/usr/bin/env node
// Experimental user entry: original Pi tools/extension host, Rust loop/store.
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const args=process.argv.slice(2), options={}, extensions=[];
if(args.includes('--help')) {
  console.log('pi-native --session FILE --workspace DIR --input TEXT (--model ID | --fixture FILE) [--resume] [--extension FILE]');
  process.exit(0);
}
for(let i=0;i<args.length;i++) {
  const key=args[i];
  if(key==='--resume') {if(options[key]) throw Error('duplicate --resume'); options[key]=true; continue;}
  if(!['--session','--workspace','--input','--model','--fixture','--extension'].includes(key)) throw Error(`unknown option ${key}`);
  const value=args[++i]; if(!value||value.startsWith('--')) throw Error(`missing value for ${key}`);
  if(key==='--extension') extensions.push(resolve(value));
  else {if(key in options) throw Error(`duplicate ${key}`); options[key]=value;}
}
for(const key of ['--session','--workspace','--input']) if(!options[key]) throw Error(`${key} required`);
if(Boolean(options['--model'])===Boolean(options['--fixture'])) throw Error('choose exactly one of --model and --fixture');
const path=resolve(options['--session']), cwd=resolve(options['--workspace']);
if(existsSync(path)!==Boolean(options['--resume'])) throw Error('session existence does not match --resume');
let fixture;
if(options['--fixture']) {fixture=JSON.parse(readFileSync(options['--fixture'],'utf8')); if(!Array.isArray(fixture)||fixture.length===0) throw Error('fixture must be a nonempty assistant message array');}
const {createBackend}=await import('../prototype/architecture/native-store-backend.mjs');
const {createHost,tsBackend}=await import('../prototype/real-plugin-host.mjs');
const {drive}=await import('../prototype/architecture/native-runtime-driver.mjs');
const {nativeProviderStream}=await import('../prototype/architecture/native-provider-stream.mjs');
const {createCodingToolDefinitions}=await import('../vendor/pi-mono/packages/coding-agent/src/core/tools/index.ts');
const definitions=createCodingToolDefinitions(cwd);
const manager=await createBackend({path,cwd,mode:options['--resume']?'open':'create'});
try {
  const host=await createHost(tsBackend(definitions.map(t=>t.name)),{cwd,sessionManager:manager,extensionPaths:extensions,factories:[pi=>{for(const tool of definitions) pi.registerTool(tool);} ]});
  let index=0;
  const stream=fixture?async()=>{const message=fixture[index++]; if(!message)throw Error('fixture exhausted');return {async *[Symbol.asyncIterator](){},async result(){return message;}};}:nativeProviderStream({model:options['--model'],streaming:true});
  const result=await drive({manager,host,prompt:options['--input'],stream});
  console.log(JSON.stringify({result,session:path,fixture:Boolean(fixture),extensionErrors:host.errors}));
} finally {await manager.close();}

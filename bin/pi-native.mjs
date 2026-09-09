#!/usr/bin/env node
// Experimental user entry: original Pi tools/extension host, Rust loop/store.
import {readFileSync, existsSync, writeFileSync, appendFileSync} from 'node:fs';
import {basename, resolve} from 'node:path';
const args=process.argv.slice(2), options={}, extensions=[];
// Load project-local .env for provider subprocesses without printing secrets.
try { for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (m && process.env[m[1]]===undefined) process.env[m[1]]=m[2].replace(/^(['\"])(.*)\1$/, '$2'); } } catch {}
if(args.includes('--help')) {
  const invocationName = basename(process.argv[1] ?? 'pi-rs').replace(/\.mjs$/, '');
  console.log(`${invocationName} --session FILE --workspace DIR --input TEXT (--model ID | --fixture FILE) [--resume] [--extension FILE] [--context-tool-chars N|none] [--trace-file FILE] [--command NAME] [--command-args JSON] [--branch ENTRY_ID|--reset-branch]`);
  process.exit(0);
}
for(let i=0;i<args.length;i++) {
  const key=args[i];
  if(key==='--resume' || key==='--reset-branch') {if(options[key]) throw Error(`duplicate ${key}`); options[key]=true; continue;}
  if(!['--session','--workspace','--input','--model','--fixture','--extension','--context-tool-chars','--trace-file','--command','--command-args','--branch','--reset-branch','--compact-summary','--compact-first-kept','--compact-tokens-before','--branch','--reset-branch','--compact-summary','--compact-first-kept','--compact-tokens-before'].includes(key)) throw Error(`unknown option ${key}`);
  const value=args[++i]; if(!value||value.startsWith('--')) throw Error(`missing value for ${key}`);
  if(key==='--extension') extensions.push(resolve(value));
  else {if(key in options) throw Error(`duplicate ${key}`); options[key]=value;}
}
for(const key of ['--session','--workspace']) if(!options[key]) throw Error(`${key} required`);
if(!options['--input'] && !options['--command']) throw Error('one of --input or --command required');
if(options['--command-args']) { try { options['--commandArgsParsed']=JSON.parse(options['--command-args']); } catch { throw Error('--command-args must be JSON'); } }
if (!options['--command'] && Boolean(options['--model'])===Boolean(options['--fixture'])) throw Error('choose exactly one of --model and --fixture');
if (options['--command'] && (options['--model'] || options['--fixture'])) throw Error('--command cannot be combined with --model or --fixture');
if (options['--compact-summary'] && (!options['--compact-first-kept'] || !options['--compact-tokens-before'])) throw Error('--compact-summary requires --compact-first-kept and --compact-tokens-before');
if (options['--compact-summary'] && !options['--resume']) throw Error('compaction requires --resume');
if (options['--branch'] && options['--reset-branch']) throw Error('--branch cannot be combined with --reset-branch');
if ((options['--branch'] || options['--reset-branch']) && !options['--resume']) throw Error('branch selection requires --resume');
const path=resolve(options['--session']), cwd=resolve(options['--workspace']);
if(existsSync(path)!==Boolean(options['--resume'])) throw Error('session existence does not match --resume');
let fixture;
if(options['--fixture']) {fixture=JSON.parse(readFileSync(options['--fixture'],'utf8')); if(!Array.isArray(fixture)||fixture.length===0) throw Error('fixture must be a nonempty assistant message array');}
const {createBackend}=await import('../prototype/architecture/native-store-backend.mjs');
const {createHost,tsBackend}=await import('../prototype/real-plugin-host.mjs');
const {drive}=await import('../prototype/architecture/native-runtime-driver.mjs');
const {nativeProviderStream}=await import('../prototype/architecture/native-provider-stream.mjs');
const {createCodingTools}=await import('../vendor/pi-mono/packages/coding-agent/src/core/tools/index.ts');
const tools=createCodingTools(cwd);
const manager=await createBackend({path,cwd,mode:options['--resume']?'open':'create'});
  if (options['--branch']) await manager.branch(options['--branch']);
  if (options['--reset-branch']) await manager.resetLeaf();
if (options['--compact-summary']) await manager.appendCompaction(options['--compact-summary'], options['--compact-first-kept'], Number(options['--compact-tokens-before']));
try {
  const host=await createHost(tsBackend(tools.map(t=>t.name)),{cwd,sessionManager:manager,extensionPaths:extensions,factories:[pi=>{for(const tool of tools) pi.registerTool(tool);} ]});
  if(options['--context-tool-chars']!==undefined) { const raw=options['--context-tool-chars']; manager.setContextPolicy(raw==='none'?null:Number(raw)); }
  let commandResult;
  if (options['--command']) {
    const command = host.runner.getCommand(options['--command']);
    if (!command) throw Error(`unknown command: ${options['--command']}`);
    const rawArgs = options['--commandArgsParsed'];
    const commandArgs = typeof rawArgs === 'string' ? rawArgs : (rawArgs === undefined ? '' : JSON.stringify(rawArgs));
    let commandError = null;
    try { await command.handler(commandArgs, host.runner.createCommandContext()); } catch (error) { commandError = error instanceof Error ? error.message : String(error); }
    await manager.appendCustomEntry('pi-rs.command.v1', {name: options['--command'], args: commandArgs, ok: commandError === null, error: commandError});
    if (commandError) throw Error(`command ${options['--command']} failed: ${commandError}`);
    commandResult = {name: options['--command'], args: commandArgs, dispatched: true};
  }
  let index=0;
  const stream=fixture?async()=>{const message=fixture[index++]; if(!message)throw Error(`fixture exhausted after ${index} assistant responses; provide the next assistant message for the tool result`);return {async *[Symbol.asyncIterator](){},async result(){return message;}};}:nativeProviderStream({model:options['--model'],streaming:true});
  const result=options['--input'] ? await drive({manager,host,prompt:options['--input'],stream}) : null;
  const report={result,command:commandResult,compaction:options['--compact-summary']?manager.snapshot().contextEntries.find(e=>e.type==='compaction')??null:null,session:path,fixture:Boolean(fixture),extensionErrors:host.errors};
  if(options['--trace-file']) writeFileSync(resolve(options['--trace-file']),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally {await manager.close();}

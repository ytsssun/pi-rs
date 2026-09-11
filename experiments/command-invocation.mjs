import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const dir=mkdtempSync(join(tmpdir(),'pi-rs-command-'));
try {
  const output=join(dir,'args.json');
  const extension=join(dir,'commands.ts');
  writeFileSync(extension,`import {writeFileSync} from 'node:fs'; export default function(pi) { pi.registerCommand('capture',{description:'capture',handler:async args=>writeFileSync(${JSON.stringify(output)},JSON.stringify(args))}); pi.registerCommand('fail',{description:'fail',handler:async()=>{throw Error('expected failure')}}); }`);
  let n=0;
  function run(input, extra=[]) {
    const proc=spawnSync(process.execPath,['--experimental-strip-types',join(root,'bin/pi-native.mjs'),'--workspace',dir,'--session',join(dir,`session-${n++}.jsonl`),'--extension',extension,...(input===null?[]:['--input',input]),...extra],{cwd:dir,encoding:'utf8',timeout:30000});
    assert.equal(proc.status,0,proc.stderr); return JSON.parse(proc.stdout);
  }
  for(const [input,args] of [['/capture',''],['/capture  a\tb  ',' a\tb  ']]) {
    assert.equal(run(input).slashHandled,true); assert.equal(JSON.parse(readFileSync(output)),args);
  }
  const failed=run('/fail'); assert.equal(failed.slashHandled,true); assert.ok(failed.extensionErrors.some(e=>e.error==='expected failure'));
  const fixture=join(dir,'fixture.json');
  writeFileSync(fixture,JSON.stringify([{role:'assistant',content:[{type:'text',text:'fallback'}],api:'openai-completions',provider:'fixture',model:'fixture',stopReason:'stop',timestamp:1,usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}}]));
  for(const input of ['/unknown','/CAPTURE','/capture\targs']) assert.equal(run(input,['--fixture',fixture]).slashHandled,false);
  run(null,['--command','capture','--command-args','"legacy"']); assert.equal(JSON.parse(readFileSync(output)),'legacy');
  // Failed normal/fallback input must leave an existing canonical history intact.
  run('seed',['--fixture',fixture]);
  const session=join(dir,`session-${n-1}.jsonl`), before=readFileSync(session);
  const first=before.toString().split('\n').filter(Boolean).map(JSON.parse).find(e=>e.type==='message').id;
  for(const input of ['hello','/unknown']) for(const change of [
    ['--context-tool-chars','1200'],
    ['--compact-summary','summary','--compact-first-kept',first,'--compact-tokens-before','100']
  ]) {
    const proc=spawnSync(process.execPath,['--experimental-strip-types',join(root,'bin/pi-native.mjs'),'--workspace',dir,'--session',session,'--resume','--input',input,'--model','definitely-not-a-real-model',...change],{cwd:dir,encoding:'utf8',timeout:30000});
    assert.notEqual(proc.status,0); assert.match(proc.stderr,/model not found/);
    assert.deepEqual(readFileSync(session),before,'invalid model mutated canonical history');
  }
  const {createHost,tsBackend}=await import('../prototype/real-plugin-host.mjs');
  const {trySlashCommand}=await import('../prototype/architecture/command-invocation.mjs');
  const seen=[];
  const host=await createHost(tsBackend(),{cwd:dir,extensionPaths:[],factories:[
    pi=>pi.registerCommand('greet',{description:'one',handler:async args=>seen.push([1,args])}),
    pi=>pi.registerCommand('greet',{description:'two',handler:async args=>seen.push([2,args])})
  ]});
  assert.equal(await trySlashCommand('/greet a',host.runner),false);
  assert.equal(await trySlashCommand('/GREET:1 a',host.runner),false);
  assert.equal(await trySlashCommand('/greet:1  raw',host.runner),true);
  assert.equal(await trySlashCommand('/greet:2 x',host.runner),true);
  assert.deepEqual(seen,[[1,' raw'],[2,'x']]);
  console.log('PASS: slash raw args, errors, unknown/case/tab fallback, legacy explicit command (fixture only)');
} finally { rmSync(dir,{recursive:true,force:true}); }

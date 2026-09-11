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
  console.log('PASS: slash raw args, errors, unknown/case/tab fallback, legacy explicit command (fixture only)');
} finally { rmSync(dir,{recursive:true,force:true}); }

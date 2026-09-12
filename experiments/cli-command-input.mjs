import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os'; import {join,resolve} from 'node:path'; import {spawnSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'pi-command-input-')), old=join(d,'old.jsonl'), ext=join(d,'ext.ts'), fixture=join(d,'f.json');
writeFileSync(fixture,JSON.stringify([{role:'assistant',content:[{type:'text',text:'ok'}],stopReason:'stop',timestamp:1,api:'fixture',provider:'fixture',model:'fixture',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}}]));
writeFileSync(ext,`export default pi=>pi.registerCommand('fresh',{handler:async(_,ctx)=>ctx.newSession({parentSession:ctx.sessionManager.getSessionFile()})});`);
const run=a=>{const r=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',a.path,'--workspace',d,'--extension',ext,...a.args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
try { const r=run({path:old,args:['--input','seed','--fixture',fixture]}); const before=readFileSync(old); const n=run({path:old,args:['--resume','--command','fresh','--input','continue','--fixture',fixture]}); assert.notEqual(n.session,old); assert.deepEqual(readFileSync(old),before); assert.ok(readFileSync(n.session,'utf8').includes('continue')); console.log(JSON.stringify({status:'tested',session:n.session})); } finally {rmSync(d,{recursive:true,force:true});}

import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-owner-')), extension=join(dir,'extension.ts');
const fixture=join(dir,'fixture.json'), original=join(dir,'original.jsonl');
writeFileSync(fixture,JSON.stringify([{role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop',timestamp:1,api:'fixture',provider:'fixture',model:'fixture',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}}]));
writeFileSync(extension,`import {appendFileSync} from 'node:fs';
export default pi=>{
 const record=e=>appendFileSync(${JSON.stringify(join(dir,'events'))},JSON.stringify(e)+'\\n');
 pi.on('session_start',(e,ctx)=>record({...e,id:ctx.sessionManager.getSessionId()}));
 pi.on('session_shutdown',e=>record(e));
 pi.on('session_before_switch',()=>process.env.VETO ? {cancel:true}:undefined);
 pi.registerCommand('new',{description:'new',handler:async(_,ctx)=>{
   const result=await ctx.newSession({setup:async manager=>{manager.appendCustomEntry('setup',{fresh:true});manager.appendMessage({role:'assistant',content:[{type:'text',text:'setup history'}],timestamp:1});}});
   let stale=false;try{ctx.cwd;}catch{stale=true;}
   record({result,stale});
 }});
};`);
const run=(path,args,env={})=>{
 const r=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',path,'--workspace',dir,'--extension',extension,...args],{encoding:'utf8',env:{...process.env,...env},timeout:30000});
 assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
};
const entries=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
try {
 run(original,['--input','old input','--fixture',fixture]);
 const prefix=readFileSync(original);
 const before=readdirSync(dir).sort();
 let report=run(original,['--resume','--input','/new'],{VETO:'1'});
 assert.equal(report.session,original);assert.deepEqual(readdirSync(dir).sort(),before);assert.deepEqual(readFileSync(original),prefix);
 report=run(original,['--resume','--input','/new']);
 assert.notEqual(report.session,original);
 assert.deepEqual(readFileSync(original),prefix);
 const fresh=entries(report.session);
 assert.notEqual(fresh[0].id,entries(original)[0].id);
 assert.ok(!JSON.stringify(fresh).includes('old input'));
 const freshPrefix=readFileSync(report.session);
 run(report.session,['--resume','--input','fresh continuation','--fixture',fixture]);
 assert.deepEqual(readFileSync(report.session).subarray(0,freshPrefix.length),freshPrefix);
 assert.ok(readFileSync(report.session,'utf8').includes('fresh continuation'));
 assert.deepEqual(readFileSync(original),prefix);
 const events=entries(join(dir,'events')); 
 assert.ok(events.some(e=>e.stale===true&&e.result.cancelled===false));
 const starts=events.filter(e=>e.type==='session_start' && e.reason !== 'startup' || e.type==='session_start' && e.id===entries(original)[0].id);
 assert.notEqual(starts.at(-1).id,starts[0].id);
 assert.equal(starts.at(-1).reason,'new');
 assert.equal(starts.at(-1).previousSessionFile,original);
 console.log(JSON.stringify({status:'tested',scope:'formal CLI replacement/veto/stale context/distinct identity',newPath:report.session}));
} finally {rmSync(dir,{recursive:true,force:true});}

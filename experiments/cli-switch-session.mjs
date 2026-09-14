import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'pi-switch-')), a=join(d,'a.jsonl'),b=join(d,'b.jsonl'),ext=join(d,'ext.ts');
const done={role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop',timestamp:1};
const seed=join(d,'seed.json'),work=join(d,'work.json');
writeFileSync(seed,JSON.stringify([done]));
writeFileSync(work,JSON.stringify([{...done,stopReason:'toolUse',content:[{type:'toolCall',id:'w',name:'write',arguments:{path:'result.txt',content:'switched'}}]},done]));
writeFileSync(ext,`import assert from 'node:assert/strict';
export default pi=>{
 pi.on('session_before_switch',e=>{assert.equal(e.reason,'resume');assert.equal(e.targetSessionFile,process.env.TARGET);return process.env.VETO==='1'?{cancel:true}:undefined;});
 pi.registerCommand('switch',{handler:async(_,ctx)=>{
  const old=ctx.sessionManager.getSessionId();
  try {
   const r=await ctx.switchSession(process.env.TARGET,{withSession:async next=>{
    assert.throws(()=>ctx.cwd,/stale/);
    assert.equal(next.sessionManager.getSessionFile(),process.env.TARGET);
    assert.equal(next.isIdle(),true);await next.waitForIdle();
    if(process.env.FAIL==='1')throw Error('callback boom');
   }});
   if(r.cancelled)assert.equal(ctx.sessionManager.getSessionId(),old);
  } catch(e) {
   if(process.env.FAIL==='1'){assert.match(e.message,/callback boom/);return;}
   if(process.env.BAD==='1'){assert.equal(ctx.sessionManager.getSessionId(),old);assert.equal(ctx.isIdle(),true);return;}
   throw e;
  }
 }});
};`);
const run=(path,args,env={})=>{const r=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--workspace',d,'--session',path,'--extension',ext,...args],{encoding:'utf8',timeout:30000,env:{...process.env,TARGET:b,VETO:'0',BAD:'0',FAIL:'0',...env}});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
const rows=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
try{
 run(a,['--input','A marker','--fixture',seed]);run(b,['--input','B marker','--fixture',seed]);
 const original=readFileSync(a),bId=rows(b)[0].id,bPrefix=readFileSync(b);
 assert.equal(run(a,['--resume','--input','/switch'],{VETO:'1'}).session,a);
 assert.deepEqual(readFileSync(a),original);assert.deepEqual(readFileSync(b),bPrefix);
 const corrupt=join(d,'corrupt.jsonl');writeFileSync(corrupt,'broken json');
 const foreign=join(d,'foreign.jsonl');writeFileSync(foreign,readFileSync(b,'utf8').replace(JSON.stringify(d),JSON.stringify('/different-workspace')));
 for(const target of [join(d,'absent.jsonl'),corrupt,foreign]){
  assert.equal(run(a,['--resume','--input','/switch'],{TARGET:target,BAD:'1'}).session,a);
  assert.deepEqual(readFileSync(a),original);
 }
 assert.equal(run(a,['--resume','--command','switch','--input','write now','--fixture',work]).session,b);
 assert.equal(readFileSync(join(d,'result.txt'),'utf8'),'switched');
 assert.equal(rows(b)[0].id,bId);assert.deepEqual(readFileSync(b).subarray(0,bPrefix.length),bPrefix);
 assert.deepEqual(readFileSync(a),original);
 run(b,['--resume','--input','continued','--fixture',seed]);
 assert.ok(readFileSync(b,'utf8').includes('continued'));
 assert.equal(run(a,['--resume','--command','switch','--input','after callback failure','--fixture',seed],{FAIL:'1'}).session,b);
 assert.ok(readFileSync(b,'utf8').includes('after callback failure'));assert.deepEqual(readFileSync(a),original);
 console.log('PASS formal CLI idle switchSession: identity, history, veto, invalid targets, guarded callback, callback failure continuation, real write and process resume; fixture only');
}finally{rmSync(d,{recursive:true,force:true});}

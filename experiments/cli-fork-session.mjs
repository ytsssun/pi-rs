import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {SessionManager} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
const d=mkdtempSync(join(tmpdir(),'pi-fork-')),a=join(d,'a.jsonl'),ext=join(d,'ext.ts');
const done={role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop',timestamp:1};
const seed=join(d,'seed.json'),work=join(d,'work.json');
writeFileSync(seed,JSON.stringify([done]));
writeFileSync(work,JSON.stringify([{...done,stopReason:'toolUse',content:[{type:'toolCall',id:'w',name:'write',arguments:{path:'result.txt',content:'forked'}}]},done]));
writeFileSync(ext,`import assert from 'node:assert/strict';export default pi=>{
 pi.on('session_before_fork',e=>{assert.equal(e.entryId,process.env.ENTRY);assert.equal(e.position,process.env.POSITION);if(process.env.VETO==='1')return {cancel:true};});
 pi.registerCommand('fork',{handler:async(_,ctx)=>{
 const old=ctx.sessionManager.getSessionId();
 try{const r=await ctx.fork(process.env.ENTRY,{position:process.env.POSITION,withSession:async next=>{
 assert.throws(()=>ctx.cwd,/stale/);assert.notEqual(next.sessionManager.getSessionId(),old);await next.waitForIdle();
 if(process.env.FAIL==='1')throw Error('callback boom');
 }});if(r.cancelled)assert.equal(ctx.sessionManager.getSessionId(),old);else assert.equal(r.selectedText,process.env.POSITION==='before'?'second':undefined);
 }catch(e){if(process.env.FAIL==='1'){assert.match(e.message,/callback boom/);return;}if(process.env.BAD==='1'){assert.match(e.message,/Invalid entry/);assert.equal(ctx.sessionManager.getSessionId(),old);return;}throw e;}
 }});
};`);
const rows=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const run=(p,args,env={})=>{const r=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--workspace',d,'--session',p,'--extension',ext,...args],{encoding:'utf8',timeout:30000,env:{...process.env,POSITION:'before',...env}});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
try{
 run(a,['--input','first','--fixture',seed]);run(a,['--resume','--input','second','--fixture',seed]);
 const original=readFileSync(a),entries=rows(a).slice(1),selected=entries.find(e=>e.message?.role==='user'&&(e.message.content==='second'||e.message.content[0]?.text==='second'));
 const beforeFiles=readdirSync(d).sort();
 run(a,['--resume','--input','/fork'],{ENTRY:selected.id,VETO:'1'});
 for(const id of ['absent',entries.find(e=>e.message?.role==='assistant').id])run(a,['--resume','--input','/fork'],{ENTRY:id,BAD:'1'});
 assert.deepEqual(readdirSync(d).sort(),beforeFiles);assert.deepEqual(readFileSync(a),original);
 for(const position of ['before','at']){
  const expected=SessionManager.open(a,d);expected.createBranchedSession(position==='at'?selected.id:selected.parentId);
  const output=run(a,['--resume','--command','fork','--input','write now','--fixture',work],{ENTRY:selected.id,POSITION:position});
  const forked=rows(output.session);assert.notEqual(output.session,a);assert.notEqual(forked[0].id,rows(a)[0].id);assert.equal(forked[0].parentSession,a);
  assert.deepEqual(forked.slice(1,1+expected.getEntries().length),expected.getEntries());
  assert.equal(readFileSync(join(d,'result.txt'),'utf8'),'forked');assert.deepEqual(readFileSync(a),original);
  run(output.session,['--resume','--input','continued','--fixture',seed]);assert.ok(readFileSync(output.session,'utf8').includes('continued'));assert.deepEqual(readFileSync(a),original);
 }
 const output=run(a,['--resume','--command','fork','--input','after failure','--fixture',seed],{ENTRY:selected.id,FAIL:'1'});assert.ok(readFileSync(output.session,'utf8').includes('after failure'));assert.deepEqual(readFileSync(a),original);
 console.log('PASS idle fork: upstream branch entries oracle, distinct identity/parent, selectedText, before/at, veto/invalid no files, guarded callback/error, real write, fresh-process native resume; deterministic only');
}finally{rmSync(d,{recursive:true,force:true});}

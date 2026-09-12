// External formal CLI acceptance: real tools, persisted replacement and fresh resume.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'pi-command-input-'));
const old=join(d,'old.jsonl'), ext=join(d,'ext.ts');
const assistant=content=>({role:'assistant',content,stopReason:content.some(x=>x.type==='toolCall')?'toolUse':'stop',timestamp:1});
const done=assistant([{type:'text',text:'done'}]);
const fixture=(name,messages)=>{const p=join(d,name);writeFileSync(p,JSON.stringify(messages));return p;};
const seed=fixture('seed.json',[done]);
const work=fixture('work.json',[
 assistant([{type:'toolCall',id:'write',name:'write',arguments:{path:'result.txt',content:'first'}}]),
 assistant([{type:'toolCall',id:'bash',name:'bash',arguments:{command:'test "$(cat result.txt)" = first'}}]),done]);
const continuation=fixture('resume.json',[
 assistant([{type:'toolCall',id:'edit',name:'edit',arguments:{path:'result.txt',edits:[{oldText:'first',newText:'second'}]}}]),done]);
writeFileSync(ext,`export default pi=>{
 pi.on('session_before_switch',()=>process.env.COMMAND_VETO==='1'?{cancel:true}:undefined);
 pi.registerCommand('fresh',{handler:async(_,ctx)=>ctx.newSession({parentSession:ctx.sessionManager.getSessionFile()})});
 pi.registerCommand('fail',{handler:async()=>{throw Error('deliberate command failure')}});
};`);
const run=(path,args,env={})=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',path,'--workspace',d,'--extension',ext,...args],{encoding:'utf8',timeout:30000,env:{...process.env,COMMAND_VETO:'0',...env}});
const ok=r=>{assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
const rows=p=>readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
try {
 ok(run(old,['--input','old canary','--fixture',seed]));
 const frozen=readFileSync(old);
 for(const extra of [['--command','missing','--fixture',work],['--command','fresh','--model','nonexistent-model'],['--command','fresh']]) {
  const files=readdirSync(d).sort();
  const r=run(old,['--resume','--input','must not run',...extra]);
  assert.notEqual(r.status,0);assert.deepEqual(readFileSync(old),frozen);assert.deepEqual(readdirSync(d).sort(),files);
 }
 const n=ok(run(old,['--resume','--command','fresh','--input','new coding request','--fixture',work]));
 assert.notEqual(n.session,old);assert.equal(n.command.dispatched,true);
 assert.deepEqual(n.extensionErrors,[]);assert.deepEqual(readFileSync(old),frozen);
 assert.equal(readFileSync(join(d,'result.txt'),'utf8'),'first');
 const entries=rows(n.session);assert.equal(entries[0].parentSession,old);
 assert.ok(!JSON.stringify(entries).includes('old canary'));
 const results=entries.filter(e=>e.message?.role==='toolResult').map(e=>e.message);
 assert.deepEqual(results.map(m=>m.toolName),['write','bash']);assert.ok(results.every(m=>m.isError===false));
 const prefix=readFileSync(n.session);
 ok(run(n.session,['--resume','--input','continue coding','--fixture',continuation]));
 assert.equal(readFileSync(join(d,'result.txt'),'utf8'),'second');assert.deepEqual(readFileSync(n.session).subarray(0,prefix.length),prefix);
 assert.deepEqual(readFileSync(old),frozen);
 const failed=run(old,['--resume','--command','fail','--input','must not run','--fixture',work]);
 assert.notEqual(failed.status,0);assert.match(failed.stderr,/deliberate command failure/);
 assert.equal(readFileSync(join(d,'result.txt'),'utf8'),'second');
 assert.ok(!rows(old).some(e=>e.message?.role==='user'&&e.message.content==='must not run'));
 const v=ok(run(old,['--resume','--command','fresh','--input','veto continues here','--fixture',seed],{COMMAND_VETO:'1'}));
 assert.equal(v.session,old);assert.ok(readFileSync(old,'utf8').includes('veto continues here'));
 console.log('PASS command -> unseeded replacement -> write/bash -> fresh-process edit; validation/failure/veto');
}finally{rmSync(d,{recursive:true,force:true});}

// External formal Node CLI acceptance; no manually dispatched lifecycle events.
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'pi-cli-lifecycle-'));
const log = join(dir, 'events.jsonl'), extension = join(dir, 'probe.ts');
writeFileSync(extension, `import {appendFileSync} from 'node:fs';
export default function(pi) {
 const record = value => appendFileSync(${JSON.stringify(log)}, JSON.stringify(value)+'\\n');
 let captured;
 pi.on('session_start', (event, ctx) => {captured=ctx; record(event); pi.appendEntry('lifecycle.start', event);});
 pi.on('before_agent_start', () => record({type:'model_work'}));
 pi.on('tool_call', () => record({type:'tool_work'}));
 pi.registerCommand('probe', {description:'probe', handler:async () => record({type:'command_work'})});
 pi.on('session_shutdown', (event, ctx) => {
   record(event); pi.appendEntry('lifecycle.shutdown', event);
   setImmediate(() => {try {captured.cwd; record({type:'stale', rejected:false});} catch {record({type:'stale', rejected:true});}});
   if (process.env.LIFECYCLE_THROW) throw Error('shutdown fixture failure');
 });
 pi.on('session_shutdown', () => record({type:'shutdown_peer'}));
}`);
const assistant = content => ({role:'assistant', content, stopReason:content[0].type==='toolCall'?'toolUse':'stop', timestamp:1, api:'fixture', provider:'fixture', model:'fixture', usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}});
const fixture = join(dir,'fixture.json');
writeFileSync(fixture,JSON.stringify([assistant([{type:'toolCall',id:'write-one',name:'write',arguments:{path:'out.txt',content:'OK'}}]),assistant([{type:'text',text:'done'}])]));
const run = (session, args=[], env={}) => {
 writeFileSync(log,'');
 const child=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,'--extension',extension,...args],{encoding:'utf8',timeout:30000,env:{...process.env,...env}});
 return {...child,events:readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)};
};
const pair = result => {
 assert.deepEqual(result.events.filter(e=>e.type==='session_start'),[{type:'session_start',reason:'startup'}]);
 assert.deepEqual(result.events.filter(e=>e.type==='session_shutdown'),[{type:'session_shutdown',reason:'quit'}]);
 assert.equal(result.events[0].type,'session_start');

 assert.equal(result.events.filter(e=>e.type==='shutdown_peer').length,1);
 const shutdown=result.events.findIndex(e=>e.type==='session_shutdown');
 for (const [i,event] of result.events.entries()) if (['model_work','tool_work','command_work'].includes(event.type)) assert.ok(i>0&&i<shutdown);
};
try {
 const session=join(dir,'session.jsonl');
 let result=run(session,['--input','write','--fixture',fixture]);
 assert.equal(result.status,0,result.stderr); pair(result);
 assert.ok(result.events.some(e=>e.type==='tool_work'));
 assert.equal(readFileSync(join(dir,'out.txt'),'utf8'),'OK');
 const prefix=readFileSync(session);
 result=run(session,['--resume','--input','write again','--fixture',fixture],{LIFECYCLE_THROW:'1'});
 assert.equal(result.status,0,result.stderr); pair(result);
 assert.ok(JSON.parse(result.stdout).extensionErrors.some(e=>e.event==='session_shutdown'&&e.error.includes('shutdown fixture failure')));
 assert.deepEqual(readFileSync(session).subarray(0,prefix.length),prefix);
 // A fresh reopen after a throwing shutdown proves storage was closed/flushed.
 result=run(session,['--resume','--input','/probe']); assert.equal(result.status,0,result.stderr); pair(result);

 const failFixture=join(dir,'exhausted.json');
 writeFileSync(failFixture,JSON.stringify([assistant([{type:'toolCall',id:'write-fail',name:'write',arguments:{path:'failure.txt',content:'saved'}}])]));
 const failedSession=join(dir,'failed.jsonl');
 result=run(failedSession,['--input','fail','--fixture',failFixture],{LIFECYCLE_THROW:'1'});
 assert.notEqual(result.status,0); assert.match(result.stderr,/fixture exhausted/); pair(result);
 assert.ok(readFileSync(failedSession,'utf8').includes('lifecycle.shutdown'));
 result=run(failedSession,['--resume','--input','/probe']); assert.equal(result.status,0,result.stderr); pair(result);
 for (const args of [['--input','x','--fixture',fixture,'--unknown','x'],['--input','x','--model','nonexistent-model']]) {
 const path=join(dir,'invalid.jsonl'); result=run(path,args); assert.notEqual(result.status,0); assert.deepEqual(result.events,[]); assert.equal(existsSync(path),false);
 }
 const before=readFileSync(session); result=run(session,['--resume','--input','invalid','--model','nonexistent-model','--context-tool-chars','20']);
 assert.notEqual(result.status,0); assert.deepEqual(result.events,[]); assert.deepEqual(readFileSync(session),before);
 console.log('PASS: formal CLI startup/quit once, model/tool/command ordering, success/failure cleanup, throwing shutdown peers/report, stale context, fresh resume prefix, invalid arguments/model preservation');
} finally {rmSync(dir,{recursive:true,force:true});}

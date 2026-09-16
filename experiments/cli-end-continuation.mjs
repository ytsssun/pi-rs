import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-end-continuation-'));
try {
 const log=join(dir,'events.jsonl'),ext=join(dir,'extension.ts'),session=join(dir,'session.jsonl'),fixture=join(dir,'fixture.json');
 writeFileSync(ext,`import {appendFileSync} from 'node:fs';export default pi=>{let sent=false;const log=x=>appendFileSync(${JSON.stringify(log)},JSON.stringify(x)+'\\n');pi.on('context',e=>log({type:'context',messages:e.messages}));pi.on('agent_start',()=>log({type:'start'}));pi.on('agent_end',()=>{log({type:'end'});if(!sent){sent=true;pi.sendUserMessage('conflict report',{deliverAs:'followUp'});}});};`);
 writeFileSync(fixture,JSON.stringify(['reply','follow-up reply'].map(text=>({role:'assistant',content:[{type:'text',text}],stopReason:'stop',timestamp:1}))));
 const child=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--workspace',dir,'--session',session,'--input','hello','--fixture',fixture,'--extension',ext],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
 assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout).extensionErrors,[]);
 const events=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
 assert.deepEqual(events.filter(e=>e.type!=='context').map(e=>e.type),['start','end','start','end']);
 const contexts=events.filter(e=>e.type==='context');assert.equal(contexts.length,2);assert.match(JSON.stringify(contexts[1].messages),/conflict report/);
 const users=readFileSync(session,'utf8').trim().split('\n').map(JSON.parse).filter(e=>e.message?.role==='user').map(e=>e.message.content);
 assert.deepEqual(users,['hello','conflict report']);console.log('PASS formal CLI end callback followUp: two runs, two contexts, persisted users exactly once');
}finally{rmSync(dir,{recursive:true,force:true});}

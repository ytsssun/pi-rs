import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const directory=mkdtempSync(join(tmpdir(),'pi-followup-'));
const assistant=(content,stopReason='stop')=>({role:'assistant',content,stopReason,provider:'fixture',model:'fixture',api:'fixture',timestamp:1});
const tool=(name,id)=>assistant([{type:'toolCall',name,id,arguments:{}}],'toolUse');
const final=text=>assistant([{type:'text',text}]);
const text=message=>typeof message.content==='string'?message.content:message.content.filter(c=>c.type==='text').map(c=>c.text).join('');
try {
 for(const mode of ['success','failure','bounded']) {
  const path=join(directory,mode+'.jsonl'),file=join(directory,mode+'.txt');
  const manager=await createBackend({path});
  try {
   const host=await createHost(tsBackend(['queue','modify']),{sessionManager:manager,extensionPaths:[],factories:[pi=>{
    pi.registerTool({name:'queue',label:'Queue',description:'queue followups',parameters:{type:'object',properties:{}},execute:async()=>{
     pi.sendUserMessage('follow one',{deliverAs:'followUp'});
     if(mode!=='bounded')pi.sendUserMessage('follow two',{deliverAs:'followUp'});
     return {content:[{type:'text',text:'queued'}]};
    }});
    pi.registerTool({name:'modify',label:'Modify',description:'write file',parameters:{type:'object',properties:{}},execute:async()=>{
     writeFileSync(file,'changed');
     return {content:[{type:'text',text:'changed'}]};
    }});
   }]});
   let calls=0;
   const trace=[];
   const responses=[tool('queue','q'),final('initial final'),tool('modify','m'),final('first final'),final('second final')];
   const stream=async (_model,context)=>{
    assert.equal(host.contextActions.isIdle(),false);
    const users=context.messages.filter(m=>m.role==='user').map(text);
    if(calls===2&&mode!=='bounded') {
     assert.deepEqual(users,['initial','follow one']);
     assert.ok(context.messages.some(m=>m.role==='assistant'&&text(m)==='initial final'));
     if(mode==='failure')throw Error('controlled provider failure');
    }
    if(mode==='success'&&calls===4)assert.deepEqual(users,['initial','follow one','follow two']);
    const response=mode==='bounded'?(calls%2===0?tool('queue','q'+calls):final('final')):responses[calls];
    calls++;assert.ok(response);
    return {async *[Symbol.asyncIterator](){},async result(){return response;}};
   };
   const run=()=>drive({manager,host,prompt:'initial',stream,trace});
   if(mode==='success') {
    await run();assert.equal(calls,5);assert.equal(readFileSync(file,'utf8'),'changed');
    assert.equal(host.pendingMessages.length,0);
   } else if(mode==='failure') {
    const failure=await run();assert.equal(failure.action.message.stopReason,'error');assert.match(failure.action.message.errorMessage,/controlled provider failure/);
    assert.equal(host.pendingMessages.length,1);
    assert.equal(host.pendingMessages[0].message,'follow two');
    assert.equal(trace.filter(e=>e.type==='followup_admitted').length,1);
    assert.equal(trace.filter(e=>e.type==='message_consumed').length,0);
   } else {
    await assert.rejects(run,/bounded fixture action limit exceeded/);
    assert.ok(calls<32);
   }
   await host.waitForIdle();
   assert.equal(host.contextActions.isIdle(),true);
   const entries=manager.getEntries();
   if(mode==='success') {
    assert.deepEqual(entries.filter(e=>e.message?.role==='user').map(e=>text(e.message)),['initial','follow one','follow two']);
    manager.close();
    const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',
     `import assert from 'node:assert/strict'; import {createBackend} from './prototype/architecture/native-store-backend.mjs'; const m=await createBackend({path:process.argv[1],mode:'open'}); assert.deepEqual(m.getEntries().filter(e=>e.message?.role==='user').map(e=>e.message.content),['initial','follow one','follow two']); assert.equal(m.getEntries().filter(e=>e.message?.role==='toolResult').length,2); m.close();`,path],{cwd:process.cwd(),encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);
   } else manager.close();
  } catch(error){try{manager.close();}catch{}throw error;}
 }
 console.log('PASS user followUp: Rust continuation, FIFO, actual file effect, provider failure queue, bounded loop, native process reopen');
} finally {rmSync(directory,{recursive:true,force:true});}

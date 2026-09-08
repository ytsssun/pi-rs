import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
const longText=Array.from({length:100},(_,i)=>`row${i}: canonical long output`).join('\n');
const assistant=(content,stopReason='toolUse')=>({role:'assistant',content,stopReason,provider:'fixture',model:'fixture',api:'fixture',timestamp:1});
const call=(id,name,args={})=>({type:'toolCall',id,name,arguments:args});
async function run(path,stage) {
  const manager=await createBackend({path,mode:stage==='seed'?'create':'open'});
  const step=payload=>request({op:'runtime',handle:manager.handle,...payload});
  const executed=[];const requests=[];
  try {
    if(stage==='fork') {
      const anchor=manager.getEntries().find(e=>e.type==='message'&&e.message.role==='assistant'&&e.message.content[0]?.text==='seed complete');
      assert.ok(anchor);manager.branch(anchor.id);manager.appendCustomEntry('integrated-fork',{});
    }
    const host=await createHost(tsBackend(['todo','long_output','explode']),{sessionManager:manager,extensionPaths:[resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/todo.ts')],factories:[pi=>{
      pi.registerTool({name:'long_output',label:'Long',description:'long output fixture',parameters:{type:'object',properties:{}},execute:async(_id,_args,_signal,onUpdate)=>{executed.push('long_output'); if(onUpdate){await new Promise(r=>setTimeout(r,10)); await onUpdate({content:[{type:'text',text:'partial-1'}],details:{}}); await new Promise(r=>setTimeout(r,10)); await onUpdate({content:[{type:'text',text:'partial-2'}],details:{}});} return {content:[{type:'text',text:longText}],details:{lines:100}};}});
      pi.registerTool({name:'explode',label:'Error',description:'error fixture',parameters:{type:'object',properties:{}},execute:async()=>{executed.push('explode');throw Error('deliberate tool failure');}});
      pi.on('context',event=>{for(const m of event.messages)if(m.role==='toolResult')m.content[0].text='plugin:'+m.content[0].text;});
      pi.on('context',event=>({messages:step({event:'project',messages:event.messages})}));
    }]});
    await host.runner.emit({type:'session_start'});
    if(stage==='seed')step({event:'policy',limit:8});
    const responses=stage==='seed'?[assistant([call('a','todo',{action:'add',text:'alpha'}),call('long','long_output'),call('fail','explode')]),assistant([{type:'text',text:'seed complete'}],'stop')]:(stage==='continue'||stage==='fork')?[assistant([call('list','todo',{action:'list'}),call('gamma','todo',{action:'add',text:stage==='fork'?'delta':'gamma'})]),assistant([{type:'text',text:'followup complete'}],'stop')]:[assistant([{type:'text',text:'reset confirmed'}],'stop')];
    const stream=async(_model,context)=>{
      requests.push(structuredClone(context.messages));const response=responses.shift();assert.ok(response,'no extra model request');
      return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return response;}};
    };
    const result=await drive({manager,host,prompt:stage,stream});
    if(stage==='seed') {
      const traceTypes=result.trace.map(e=>e.type);
      const updatePositions=result.trace.map((e,i)=>e.type==='tool_update'?i:-1).filter(i=>i>=0);
      const longResult=result.trace.findIndex(e=>e.type==='tool_result'&&e.tool==='long_output');
      assert.equal(updatePositions.length,2); assert.ok(updatePositions.every(i=>i<longResult));
      assert.throws(()=>step({event:'tool_update',requestId:'5:4',update:{content:[]}}),/no active tool|stale|mismatched/);
    }
    assert.equal(responses.length,0);assert.deepEqual(host.errors,[]);
    const canonical=manager.snapshot().branch.filter(e=>e.type==='message').map(e=>e.message);
    const tools=canonical.filter(m=>m.role==='toolResult');
    const long=tools.find(m=>m.toolName==='long_output');assert.equal(long.content[0].text,longText);
    assert.equal(tools.find(m=>m.toolName==='explode').isError,true);
    assert.equal(tools.filter(m=>m.toolName==='long_output').length,1);
    if(stage!=='reset') {
      for(const view of requests)for(const m of view)if(m.role==='toolResult')assert.ok(m.content[0].text.startsWith('plugin:')&&m.content[0].text.includes('[context view truncated; canonical result retained]'));
    } else assert.equal(requests[0].find(m=>m.toolName==='long_output').content[0].text,'plugin:'+longText);
    if(stage!=='seed') {
      assert.deepEqual(executed,[],'completed previous tools must not replay');
      assert.deepEqual(tools.filter(m=>m.toolName==='todo').at(-1).details.todos.map(t=>[t.id,t.text]),[[1,'alpha'],[2,stage==='fork'?'delta':'gamma']]);
    }
    if(stage==='continue')step({event:'policy',limit:null});
    assert.throws(()=>step({event:'model_result',requestId:'stale',message:assistant([],'stop')}),/no pending|mismatched/);
    return {stage,pid:process.pid,trace:result.trace,executed,requests,canonicalToolCount:tools.length,canonicalLongOutputRetained:true};
  } finally {await manager.close();}
}
if(process.argv[2]==='child') console.log(JSON.stringify(await run(process.argv[3],process.argv[4])));
else {
  const directory=mkdtempSync(join(tmpdir(),'pi-integrated-'));const path=join(directory,'session.jsonl');const reports=[];
  try {
    let prefix='';
    for(const stage of ['seed','continue','reset','fork']) {
      const child=spawnSync(process.execPath,[...process.execArgv,resolve('experiments/native-runtime.mjs'),'child',path,stage],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',TSX_TSCONFIG_PATH:resolve('vendor/pi-mono/tsconfig.json')},timeout:20000});
      assert.equal(child.status,0,child.stderr);reports.push(JSON.parse(child.stdout));const content=readFileSync(path,'utf8');assert.ok(content.startsWith(prefix));prefix=content;
    }
    assert.equal(new Set(reports.map(r=>r.pid)).size,4);for(const r of reports)delete r.pid;
    console.log(JSON.stringify({reports,distinctProcesses:true,canonicalPrefixRetained:true,
      limits:['Deterministic StreamFn-shaped fixture, no live provider or model autonomy','Explicit sequential subset; no parallel scheduling/steering/cancel/stream event compatibility','Unfinished persisted calls reject on reopen, no complete recovery workflow','Prototype projection one text block; full message schema/session aliases unproven','No public CLI integration or full plugin compatibility']},null,2));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

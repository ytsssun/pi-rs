import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
import {AgentSession} from '../vendor/pi-mono/packages/coding-agent/src/core/agent-session.ts';
import {SessionManager} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
import {SettingsManager} from '../vendor/pi-mono/packages/coding-agent/src/core/settings-manager.ts';
import {AuthStorage} from '../vendor/pi-mono/packages/coding-agent/src/core/auth-storage.ts';
import {createTestResourceLoader} from '../vendor/pi-mono/packages/coding-agent/test/utilities.ts';
import {createModelRegistry,getModelRuntime} from '../vendor/pi-mono/packages/coding-agent/test/model-runtime-test-utils.ts';
if(process.argv[2]==='reopen'){
 const manager=SessionManager.open(process.argv[3]);const messages=manager.buildSessionContext().messages;
 assert.equal(messages.length,6);assert.deepEqual(messages.filter(m=>m.role==='user').map(m=>m.content[0].text),['edit fixture','follow up']);
 console.log('fresh-process canonical upstream reopen PASS');process.exit(0);
}
const dir=mkdtempSync(join(tmpdir(),'pi-agent-seam-'));writeFileSync(join(dir,'subject.txt'),'before\n');
const model={id:'fixture',provider:'anthropic',api:'anthropic-messages',contextWindow:200000,maxTokens:1000,reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0}};
let calls=0,session;const contexts=[];
const options={scratchPath:join(dir,'scratch-rust.jsonl'),cwd:dir,model,streamFunction:async(_model,context)=>{
 contexts.push(context);calls++;
 if(calls===1)await session.prompt('follow up',{streamingBehavior:'followUp'});
 const message={role:'assistant',api:model.api,provider:model.provider,model:model.id,timestamp:Date.now(),content:calls===1?[{type:'toolCall',id:'edit-1',name:'edit',arguments:{path:'subject.txt',oldText:'before',newText:'after'}}]:[{type:'text',text:calls===2?'edited':'followed up'}],stopReason:calls===1?'toolUse':'stop',usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
 return {async *[Symbol.asyncIterator](){yield {type:'done',message};},async result(){return message;}};
}};
const upstream=process.argv.includes('--upstream');
const agent=upstream?new Agent({initialState:{model},streamFn:options.streamFunction}):await RustAgentAdapter.create(options);
const manager=SessionManager.create(dir,join(dir,'sessions'));
const settingsManager=SettingsManager.inMemory({compaction:{enabled:false},retry:{enabled:false}});
const registry=await createModelRegistry(AuthStorage.inMemory({anthropic:{type:'api_key',key:'fixture-only'}}));
session=new AgentSession({agent,sessionManager:manager,settingsManager,cwd:dir,modelRuntime:getModelRuntime(registry),resourceLoader:createTestResourceLoader(),initialActiveToolNames:['edit']});
const events=[];session.subscribe(e=>events.push(e.type));
await session.prompt('edit fixture');
assert.equal(readFileSync(join(dir,'subject.txt'),'utf8'),'after\n');assert.equal(calls,3);assert.equal(session.isIdle,true);assert.equal(agent.hasQueuedMessages(),false);
assert.equal(contexts[2].messages.filter(m=>m.role==='user').length,2);
for(const type of ['agent_start','turn_start','message_start','message_end','tool_execution_start','tool_execution_end','turn_end','agent_end','agent_settled'])assert.ok(events.includes(type),type);
if(!upstream){assert.ok(agent.trace.some(t=>t.output==='tool'));assert.equal(agent.trace.filter(t=>t.output==='model').length,3);}
assert.equal(manager.buildSessionContext().messages.length,6);
assert.deepEqual(manager.buildSessionContext().messages,agent.state.messages);
assert.deepEqual(events,['agent_start','turn_start','message_start','message_end','queue_update','message_start','message_end','tool_execution_start','tool_execution_end','message_start','message_end','turn_end','turn_start','message_start','message_end','turn_end','turn_start','queue_update','message_start','message_end','message_start','message_end','turn_end','agent_end','agent_settled']);
const child=spawnSync(process.execPath,['--experimental-strip-types',import.meta.filename,'reopen',manager.getSessionFile()],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);console.log(child.stdout.trim());
writeFileSync(join(dir,'evidence.json'),JSON.stringify({events,trace:agent.trace,canonical:manager.getSessionFile()},null,2));
console.log(JSON.stringify({status:'PASS',dir,events,trace:agent.trace}));agent.store?.close();session.dispose();

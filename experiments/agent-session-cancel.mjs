import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
import {AgentSession} from '../vendor/pi-mono/packages/coding-agent/src/core/agent-session.ts';
import {SessionManager} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
import {SettingsManager} from '../vendor/pi-mono/packages/coding-agent/src/core/settings-manager.ts';
import {AuthStorage} from '../vendor/pi-mono/packages/coding-agent/src/core/auth-storage.ts';
import {createTestResourceLoader} from '../vendor/pi-mono/packages/coding-agent/test/utilities.ts';
import {createModelRegistry,getModelRuntime} from '../vendor/pi-mono/packages/coding-agent/test/model-runtime-test-utils.ts';
const queue=process.argv.includes('--queue');
const upstreamOnly=process.argv.includes('--upstream-only');
const model={id:'fixture',provider:'anthropic',api:'anthropic-messages',contextWindow:200000,maxTokens:1000,reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0}};
async function run(native,cancel){
 const cwd=mkdtempSync(join(tmpdir(),'pi-session-cancel-'));let calls=0,started;
 const ready=new Promise(r=>started=r),events=[];
 const streamFn=async(_model,_context,{signal})=>{
  const first=++calls===1;
  const message={role:'assistant',api:model.api,provider:model.provider,model:model.id,timestamp:Date.now(),content:[{type:'text',text:first?'partial':'recovered'}],stopReason:'stop',usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
  return {async *[Symbol.asyncIterator](){
   yield {type:'start',partial:message};
   if(first){started();if(cancel&&!signal.aborted)await new Promise(r=>signal.addEventListener('abort',r,{once:true}));message.stopReason=cancel?'aborted':'error';message.errorMessage='returned failure';yield {type:'error',error:message};}
   else yield {type:'done',message};
  },async result(){return message;}};
 };
 const agent=native?new RustAgentAdapter({scratchPath:join(cwd,'scratch.jsonl'),cwd,initialState:{model},streamFn}):new Agent({initialState:{model},streamFn});
 const manager=SessionManager.create(cwd,join(cwd,'sessions'));
 const registry=await createModelRegistry(AuthStorage.inMemory({anthropic:{type:'api_key',key:'fixture-only'}}));
 const session=new AgentSession({agent,sessionManager:manager,settingsManager:SettingsManager.inMemory({retry:{enabled:false},compaction:{enabled:false}}),cwd,modelRuntime:getModelRuntime(registry),resourceLoader:createTestResourceLoader()});
 session.subscribe(e=>events.push([e.type,e.message?.role,e.message?.stopReason]));
 const pending=session.prompt('first');await ready;
 if(cancel){if(queue)await session.prompt('queued',{streamingBehavior:'followUp'});await session.abort();assert.equal(session.isIdle,true);assert.equal(agent.hasQueuedMessages(),false);}
 await pending;
 assert.equal(session.isIdle,true);assert.equal(manager.buildSessionContext().messages.length,cancel&&queue?4:2);assert.equal(agent.state.messages.length,cancel&&queue?4:2);
 assert.equal(agent.state.messages[1].stopReason,cancel?'aborted':'error');assert.ok(agent.state.streamingMessage==null);
 await session.prompt('recover');await session.waitForIdle();
 const history=manager.buildSessionContext().messages;
 assert.equal(history.length,cancel&&queue?6:4);assert.equal(agent.hasQueuedMessages(),false);assert.deepEqual(history,agent.state.messages);
 agent.store?.close();session.dispose();return {events,roles:history.map(m=>[m.role,m.stopReason])};
}
for(const cancel of [false,true]){const expected=await run(false,cancel);if(!upstreamOnly)assert.deepEqual(await run(true,cancel),expected);}
console.log(JSON.stringify({status:'PASS',queue,upstreamOnly,scope:'AgentSession returned error and cooperative abort/wait/reuse'}));

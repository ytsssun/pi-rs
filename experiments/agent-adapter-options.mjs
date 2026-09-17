import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-adapter-options-'));
const model={id:'fixture',provider:'fixture',api:'fixture'};
const order=[];
const onPayload=()=>{},onResponse=()=>{};
const agent=new RustAgentAdapter({scratchPath:join(dir,'one.jsonl'),cwd:dir,initialState:{model,thinkingLevel:'low'},sessionId:'session-one',transport:'sse',maxRetryDelayMs:123,thinkingBudgets:{low:77},onPayload,onResponse,
 transformContext:async messages=>{order.push('transform');return [...messages,{role:'custom',content:'projection only'}];},
 convertToLlm:async messages=>{order.push('convert');assert.equal(messages.at(-1).role,'custom');return messages.filter(m=>m.role==='user');},
 getApiKey:async provider=>{order.push('key');assert.equal(provider,'fixture');return 'fixture-token';},
 streamFn:async(_model,context,options)=>{
   order.push('stream');assert.equal(context.messages.length,1);assert.equal(options.apiKey,'fixture-token');assert.equal(options.reasoning,'low');assert.equal(options.sessionId,'session-one');assert.equal(options.onPayload,onPayload);assert.equal(options.onResponse,onResponse);assert.equal(options.transport,'sse');assert.equal(options.maxRetryDelayMs,123);assert.deepEqual(options.thinkingBudgets,{low:77});
   const message={role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop'};
   return {async *[Symbol.asyncIterator](){},async result(){return message;}};
 }});
const other=new RustAgentAdapter({scratchPath:join(dir,'two.jsonl'),cwd:dir,initialState:{model},streamFn:()=>{throw Error('Wrong instance');}});
await agent.prompt({role:'user',content:[{type:'text',text:'hello'}]});
assert.deepEqual(order,['transform','convert','key','stream']);assert.equal(other.state.messages.length,0);assert.equal(other.store.getBranch().length,0);assert.equal(agent.state.messages.length,2);assert.ok(agent.state.messages.every(m=>m.role!=='custom'));
agent.store.close();other.store.close();console.log('SDK option forwarding and independent synchronous instances PASS');

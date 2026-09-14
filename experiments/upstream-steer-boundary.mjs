import assert from 'node:assert/strict';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
const texts=messages=>messages.filter(m=>m.role==='user').map(m=>m.content[0].text);
for(const stopReason of ['stop','aborted','error']) {
 const entered=deferred(),release=deferred();let calls=0,signal;const contexts=[],events=[];
 const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'},messages:[]},streamFn:async(_model,context,options)=>{
  const index=calls++;contexts.push(texts(context.messages));signal=options.signal;
  const result={role:'assistant',content:[{type:'text',text:'answer '+index}],stopReason:index===0?stopReason:'stop',timestamp:1};
  return {async *[Symbol.asyncIterator](){if(index===0){entered.resolve();await release.promise;}yield {type:result.stopReason==='stop'?'done':'error',message:result};},async result(){return result;}};
 }});
 agent.subscribe(e=>events.push(e.type));
 const run=agent.prompt(user('initial'));await entered.promise;
 agent.steer(user('steer one'));agent.steer(user('steer two'));
 assert.equal(signal.aborted,false,'enqueue must not abort stream');
 assert.deepEqual(texts(agent.state.messages),['initial']);assert.equal(calls,1);
 release.resolve();await run;
 if(stopReason==='stop') {
  assert.deepEqual(contexts,[['initial'],['initial','steer one'],['initial','steer one','steer two']]);
  assert.deepEqual(texts(agent.state.messages),['initial','steer one','steer two']);assert.equal(agent.hasQueuedMessages(),false);
  await agent.prompt(user('continue'));assert.equal(calls,4);assert.deepEqual(texts(agent.state.messages),['initial','steer one','steer two','continue']);
 } else {assert.equal(calls,1);assert.equal(agent.hasQueuedMessages(),true);assert.deepEqual(texts(agent.state.messages),['initial']);}
 assert.ok(events.includes('agent_end'));
 console.log(JSON.stringify({stopReason,calls,contexts,queued:agent.hasQueuedMessages(),verified:true}));
}

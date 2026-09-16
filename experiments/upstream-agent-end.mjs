import assert from 'node:assert/strict';import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
for(const terminal of ['stop','error','aborted']){
 let n=0;const events=[];const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'}},streamFn:async()=>{n++;const message={role:'assistant',content:[],stopReason:terminal,timestamp:1};return {async *[Symbol.asyncIterator](){yield {type:terminal==='stop'?'done':'error',message};},async result(){return message;}};}});
 agent.subscribe(e=>{events.push(e.type);if(e.type==='agent_end'){agent.steer({role:'user',content:[{type:'text',text:'end-steer'}],timestamp:1});agent.followUp({role:'user',content:[{type:'text',text:'end-follow'}],timestamp:1});assert.equal(e.messages.length,2);assert.equal(e.messages[0].role,'user');assert.equal(e.messages[1].stopReason,terminal);}});
 await agent.prompt('initial');assert.equal(n,1);assert.equal(agent.hasQueuedMessages(),true);assert.equal(events.at(-1),'agent_end');console.log(JSON.stringify({terminal,events,requests:n,pendingAfterEnd:true}));
}

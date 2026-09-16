import assert from 'node:assert/strict';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
const user=text=>({role:'user',content:[{type:'text',text}],timestamp:1});
for(const phase of ['agent_start','turn_start']) {
 const events=[],contexts=[];let injected=false;
 const agent=new Agent({initialState:{model:{id:'fixture',provider:'fixture',api:'fixture'}},streamFn:async(_m,c)=>{contexts.push(c.messages.filter(m=>m.role==='user').map(m=>m.content[0].text));const message={role:'assistant',content:[],stopReason:'stop',timestamp:1};return {async *[Symbol.asyncIterator](){yield {type:'done',message};},async result(){return message;}};}});
 agent.subscribe(async event=>{events.push(event.type);if(event.type===phase&&!injected){injected=true;await Promise.resolve();agent.steer(user('callback'));}});
 await agent.prompt(user('initial'));
 console.log(JSON.stringify({phase,events,contexts}));
 assert.equal(injected,true);assert.deepEqual(contexts[0],['initial','callback']);
}

// Deliberately fixture-only. One Agent per process, no network/model claims.
export * from '../vendor/pi-mono/packages/agent/dist/index.js';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
import {writeFileSync} from 'node:fs';
const scratch=process.env.PI_RS_PROBE_SCRATCH;
if(!scratch)throw Error('PI_RS_PROBE_SCRATCH is required');
const agent=await RustAgentAdapter.create({scratchPath:scratch,cwd:process.cwd()});
let created=false;
export class Agent {
  constructor(options) {
    if(created)throw Error('Probe supports one Agent only');created=true;
    Object.assign(agent.state,options.initialState);
    agent.steeringMode=options.steeringMode;agent.followUpMode=options.followUpMode;
    let calls=0;
    agent.streamFunction=async(model,context)=>{
      calls++;
      const resume=process.env.PI_RS_PROBE_RESUME==='1';
      if(calls===1&&resume&&!context.messages.some(m=>m.role==='assistant'))throw Error('Lost restored context');
      const message={role:'assistant',api:model.api,provider:model.provider,model:model.id,timestamp:Date.now(),content:calls===1?[{type:'toolCall',id:resume?'edit-resume':'edit-first',name:'edit',arguments:{path:'subject.txt',edits:[{oldText:resume?'after':'before',newText:resume?'resumed':'after'}]}}]:[{type:'text',text:'fixture complete'}],stopReason:calls===1?'toolUse':'stop',usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
      return {async *[Symbol.asyncIterator](){yield {type:'done',message};},async result(){return message;}};
    };
    process.on('exit',()=>{writeFileSync(process.env.PI_RS_PROBE_TRACE,JSON.stringify(agent.trace));agent.store.close();});
    return agent;
  }
}

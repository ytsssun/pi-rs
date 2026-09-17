// Experimental SDK seam, never an upstream Agent loop. Rust disk state is scratch only.
import {validateToolArguments} from '../vendor/pi-mono/packages/ai/src/utils/validation.ts';
import {createBackend,request} from '../prototype/architecture/native-store-backend.mjs';
import {sessionEntryToContextMessages} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
export class RustAgentAdapter {
  static async create({scratchPath,cwd,model,streamFunction}) {
    const agent=new RustAgentAdapter();
    agent.store=await createBackend({path:scratchPath,cwd});
    agent.state={model,systemPrompt:'',tools:[],messages:[],thinkingLevel:'off',isStreaming:false,streamMessage:null,pendingToolCalls:new Set(),error:undefined};
    agent.streamFunction=streamFunction;return agent;
  }
  listeners=new Set();trace=[];controller=new AbortController();seen=0;
  steeringMode='one-at-a-time';followUpMode='one-at-a-time';
  get signal(){return this.controller.signal;}
  subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
  async emit(event){for(const listener of this.listeners)await listener(event);}
  step(payload){const action=request({op:'runtime',handle:this.store.handle,timestamp:new Date().toISOString(),messageTimestamp:Date.now(),...payload});this.trace.push({input:payload.event,output:action.type,requestId:action.requestId});return action;}
  async syncMessages(){const all=this.store.getBranch().flatMap(sessionEntryToContextMessages);for(const message of all.slice(this.seen)){this.state.messages.push(message);await this.emit({type:'message_start',message});await this.emit({type:'message_end',message});}this.seen=all.length;}
  hasQueuedMessages(){return this.store.pendingUsers().length>0;}
  followUp(message){this.enqueue(message,'followUp');}
  steer(message){this.enqueue(message,'steer');}
  enqueue(message,deliverAs){if(message.role!=='user'||!Array.isArray(message.content)||message.content.some(c=>c.type!=='text'))throw Error('Experimental adapter supports text users only');this.store.enqueueUser({kind:'user',message,options:{deliverAs}});}
  waitForIdle(){return this.running??Promise.resolve();}
  abort(){this.controller.abort();}
  continue(){throw Error('Unsupported: continuation after Session recovery/agent_end');}
  clearAllQueues(){throw Error('Unsupported: clearAllQueues');}
  prompt(messages){this.running=this.run(messages);return this.running;}
  async run(messages){
    if(this.state.isStreaming)throw Error('Already running');
    const inputs=Array.isArray(messages)?messages:[messages];
    if(inputs.length!==1||inputs[0].role!=='user'||inputs[0].content.some(c=>c.type!=='text'))throw Error('Unsupported: non-single-text prompt');
    this.state.isStreaming=true;
    this.store.setQueueModes({steeringMode:this.steeringMode,followUpMode:this.followUpMode});
    try{
      let action=this.step({event:'begin',prompt:inputs[0].content,driveStart:true,maxActions:32,lifecycle:true});
      while(true){
        if(action.type==='lifecycle'){
          if(action.event.type!=='agent_start'&&action.event.type!=='turn_start')await this.syncMessages();
          await this.emit(action.event);action=this.step({event:'lifecycle_ack',requestId:action.requestId});continue;
        }
        await this.syncMessages();
        if(action.type==='settled')break;
        if(action.type==='done'){
          const next=this.step({event:'advance_queued'});
          if(next.type==='ending'||next.type==='admitted'){action=next.action;continue;}break;
        }
        if(action.type==='model'){
          const context={systemPrompt:this.state.systemPrompt,messages:action.contextEntries.flatMap(sessionEntryToContextMessages),tools:this.state.tools};
          const refreshed=await this.prepareNextTurnWithContext?.({context,turnIndex:0},this.signal);
          // Reject unsupported compaction instead of silently diverging from Rust history.
          if(JSON.stringify(refreshed?.context?.messages??context.messages)!==JSON.stringify(context.messages))throw Error('Unsupported: context history replacement');
          const output=await this.streamFunction(refreshed?.model??this.state.model,refreshed?.context??context,{signal:this.signal});
          for await(const ignored of output){}
          action=this.step({event:'model_result',requestId:action.requestId,message:await output.result()});continue;
        }
        if(action.type==='tool'){
          let toolCall=action.call,args=toolCall.arguments;let result,isError=false;
          await this.emit({type:'tool_execution_start',toolCallId:toolCall.id,toolName:toolCall.name,args});
          try{
            if(toolCall.skipError)throw Error(toolCall.skipError);
            const tool=this.state.tools.find(t=>t.name===toolCall.name);if(!tool)throw Error('Unknown tool');
            toolCall={...toolCall,arguments:tool.prepareArguments?.(args)??args};args=validateToolArguments(tool,toolCall);
            const before=await this.beforeToolCall?.({toolCall,args},this.signal);if(before?.block)throw Error(before.reason??'Blocked');
            result=await tool.execute(toolCall.id,args,this.signal,update=>this.emit({type:'tool_execution_update',toolCallId:toolCall.id,toolName:toolCall.name,args,partialResult:update}));
            const after=await this.afterToolCall?.({toolCall,args,result,isError},this.signal);if(after)result={...result,...after};
          }catch(error){isError=true;result={content:[{type:'text',text:String(error)}]};}
          await this.emit({type:'tool_execution_end',toolCallId:toolCall.id,toolName:toolCall.name,result,isError});
          action=this.step({event:'tool_result',requestId:action.requestId,result,isError});continue;
        }
        throw Error(`Unsupported Rust action ${action.type}`);
      }
    }finally{this.state.isStreaming=false;}
  }
}

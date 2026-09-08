// JS dispatches Rust actions; Rust decides sequencing and persists model/tool results.
import {request} from './native-store-backend.mjs';
import {sessionEntryToContextMessages} from '../../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
import {wrapRegisteredTool} from '../../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {validateToolArguments} from '../../vendor/pi-mono/packages/ai/src/utils/validation.ts';
export async function drive({manager,host,prompt,stream,trace=[]}) {
  const step=payload=>request({op:'runtime',handle:manager.handle,...payload});
  let action=step({event:'begin',prompt});
  trace.push({type:'turn_start'});
  for(let count=0;count<32;count++) {
    if(action.type==='done') { trace.push({type:'turn_end'}); return {action,trace}; }
    if(action.type==='model') {
      trace.push({type:'model_start',requestId:action.requestId});
      const messages=await host.runner.emitContext(action.contextEntries.flatMap(sessionEntryToContextMessages));
      const output=await stream({provider:'fixture'}, {systemPrompt:'native architecture experiment',messages,tools:host.requestTools()});
      for await(const _event of output){} // Stream transport consumption, no turn decisions.
      action=step({event:'model_result',requestId:action.requestId,message:await output.result()});
      trace.push({type:'model_result',requestId:action.requestId});
    } else if(action.type==='tool') {
      trace.push({type:'tool_start',requestId:action.requestId,tool:action.call?.name});
      const call=action.call;let result,isError=false;
      try {
        if(call.skipError)throw Error(call.skipError); // Rust rejected truncated call.
        const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name===call.name);
        if(!registered)throw Error(`Tool ${call.name} not found`);
        const tool=wrapRegisteredTool(registered,host.runner);
        result=await tool.execute(call.id,validateToolArguments(tool,call),new AbortController().signal,async update=>{
          const accepted=step({event:'tool_update',requestId:action.requestId,update});
          if(accepted.type!=='accepted') throw Error('native runtime rejected tool update');
          if(call.name==='explode') throw Error('deliberate sink rejection');
          trace.push({type:'tool_update',tool:call.name});
        });
      } catch(error) {isError=true;result={content:[{type:'text',text:error instanceof Error?error.message:String(error)}],details:{}};}
      action=step({event:'tool_result',requestId:action.requestId,result,isError});
      trace.push({type:'tool_result',requestId:action.requestId,tool:call.name,isError});
    } else throw Error('unknown Rust action '+action.type);
  }
  throw Error('bounded fixture action limit exceeded');
}

// JS dispatches Rust actions; Rust decides sequencing and persists model/tool results.
import {executeWithUpdates} from './tool-update-barrier.mjs';
import {request} from './native-store-backend.mjs';
import {sessionEntryToContextMessages} from '../../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
import {wrapRegisteredTool} from '../../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {validateToolArguments} from '../../vendor/pi-mono/packages/ai/src/utils/validation.ts';
export async function drive({manager,host,prompt,stream,trace=[],onToolUpdate=()=>{},propagateUpdateErrors=false,parallel=false}) {
  const step=payload=>request({op:'runtime',handle:manager.handle,...payload});
  let action=step({event:'begin',prompt,parallel});
  trace.push({type:'turn_start'});
  for(let count=0;count<32;count++) {
    if(action.type==='done') { trace.push({type:'turn_end'}); return {action,trace}; }
    const requestId=action.requestId;
    if(action.type==='model') {
      trace.push({type:'model_start',requestId});
      const messages=await host.runner.emitContext(action.contextEntries.flatMap(sessionEntryToContextMessages));
      const output=await stream({provider:'fixture'}, {systemPrompt:'native architecture experiment',messages,tools:host.requestTools()});
      for await(const _event of output){} // Stream transport consumption, no turn decisions.
      action=step({event:'model_result',requestId,message:await output.result()});
      trace.push({type:'model_result',requestId});
    } else if(action.type==='tool') {
      trace.push({type:'tool_start',requestId,tool:action.call?.name});
      const call=action.call;let result,isError=false,updateFailed=false,updateFailure;
      try {
        if(['write','edit','bash'].includes(call.name)) step({event:'mark_in_flight',requestId,toolCallId:call.id,toolName:call.name});
        if(call.skipError)throw Error(call.skipError); // Rust rejected truncated call.
        const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name===call.name);
        if(!registered)throw Error(`Tool ${call.name} not found`);
        const tool=wrapRegisteredTool(registered,host.runner);
        result=await executeWithUpdates(tool,call.id,validateToolArguments(tool,call),new AbortController().signal,async update=>{
          const accepted=step({event:'tool_update',requestId,update});
          if(accepted.type!=='accepted') throw Error('native runtime rejected tool update');
          try { await onToolUpdate({toolCallId:call.id,toolName:call.name,partialResult:update,requestId}); }
          catch (error) { updateFailed=true; updateFailure=error; throw error; }
          trace.push({type:'tool_update',tool:call.name});
        });
      } catch(error) { if(propagateUpdateErrors && updateFailed) throw updateFailure; isError=true;result={content:[{type:'text',text:error instanceof Error?error.message:String(error)}],details:{}};}
      action=step({event:'tool_result',requestId,result,isError});
      trace.push({type:'tool_result',requestId,tool:call.name,isError});
    } else if(action.type==='tool_batch') {
      trace.push({type:'tool_batch_start',batchId:action.batchId,calls:action.calls.length});
      // Preflight the complete batch before admitting any execution. This is
      // required by pinned Pi's parallel agent loop and prevents partial writes.
      const prepared=[];
      for(const entry of action.calls) {
        const call=entry.call??entry;
        try {
        const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name===call.name);
        if(!registered) throw Error(`Tool ${call.name} not found`);
        const tool=wrapRegisteredTool(registered,host.runner);
        const validated=validateToolArguments(tool,call);
        const hookEvent={type:'tool_call',toolCallId:call.id,toolName:call.name,input:validated};
        const hook=await host.runner.emitToolCall(hookEvent);
        const args=hookEvent.input;
        prepared.push(hook?.block ? {entry,call,immediate:{content:[{type:'text',text:hook.reason||'Tool execution was blocked'}],terminate:hook.terminate===true}} : {entry,call,tool,args});
        } catch(error) {
          prepared.push({entry,call,immediate:{content:[{type:'text',text:error instanceof Error?error.message:String(error)}]}});
        }
      }
      const runOne=async ({entry,call,tool,args,immediate})=>{
        if(immediate) {
          trace.push({type:'tool_result',requestId:entry.requestId,tool:call.name,isError:true});
          return {requestId:entry.requestId,...immediate,isError:true};
        }
        let result,isError=false;
        try {
          if(['write','edit','bash'].includes(call.name)) step({event:'mark_in_flight',requestId:entry.requestId,toolCallId:call.id,toolName:call.name});
          result=await executeWithUpdates(tool,call.id,args,new AbortController().signal,async update=>{
            trace.push({type:'tool_update',tool:call.name});
            await onToolUpdate({toolCallId:call.id,toolName:call.name,partialResult:update,requestId:entry.requestId});
          });
        } catch(error) { isError=true; result={content:[{type:'text',text:error instanceof Error?error.message:String(error)}],details:{}}; }
        const hooked=await host.runner.emitToolResult({type:'tool_result',toolCallId:call.id,toolName:call.name,input:args,content:result.content??[],details:result.details,isError,usage:result.usage});
        if(hooked){ result.content=hooked.content??result.content; result.details=hooked.details??result.details; isError=hooked.isError??isError; }
        trace.push({type:'tool_result',requestId:entry.requestId,tool:call.name,isError});
        return {requestId:entry.requestId,content:result.content,details:result.details,isError};
      };
      const sequential=prepared.some(({tool})=>tool?.definition?.executionMode==='sequential');
      const results=[];
      if(sequential) for(const item of prepared) results.push(await runOne(item));
      else results.push(...await Promise.all(prepared.map(runOne)));
      action=step({event:'batch_result',batchId:action.batchId,results,messageTimestamp:Date.now()});
    } else throw Error('unknown Rust action '+action.type);
  }
  throw Error('bounded fixture action limit exceeded');
}

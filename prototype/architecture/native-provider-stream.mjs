import {request} from './native-store-backend.mjs';
import {assembleNativeQueue} from './native-stream-bridge.mjs';

// Adapt the synchronous native provider operation to the StreamFn-shaped seam
// consumed by the existing JS driver. The model request and credentials remain Rust-owned.
export function nativeProviderStream({model,reasoningEffort,streaming=false}={}) {
  return async (_model, context) => {
    const messages=context.systemPrompt?[{role:'system',content:context.systemPrompt},...context.messages]:context.messages;
    if (streaming) {
      const selectedModel=model||_model?.id||process.env.PI_RS_MODEL||'gpt-5.6-luna';
      const handle=request({op:'provider_stream_start',model:selectedModel,messages,tools:context.tools||[],reasoning_effort:reasoningEffort||'none',base_url:_model?.baseUrl,capacity:256});
      let canonical;
      try { canonical=assembleNativeQueue(request,handle); }
      finally { request({op:'queue_close',handle}); }
      for (const item of canonical.content) {
        if (item.type==='toolCall' && (!item.arguments || Array.isArray(item.arguments) || typeof item.arguments!=='object')) throw Error('tool arguments must be an object');
      }
      const message={...canonical,role:'assistant',model:selectedModel,provider:'openai',api:'openai-completions',timestamp:Date.now()};
      return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return message;}};
    }
    const raw=request({op:'provider_chat',model:model||_model?.id||process.env.PI_RS_MODEL||'gpt-5.6-luna',messages,tools:context.tools||[],reasoning_effort:reasoningEffort||'none',base_url:_model?.baseUrl});
    const message=toPiAssistant(raw,model||_model?.id||process.env.PI_RS_MODEL||'gpt-5.6-luna');
    return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return message;}};
  };
}

// Conversion belongs at the Pi boundary; legacy CLI consumes raw OpenAI messages.
export function toPiAssistant(raw, model) {
  if(raw.role!=='assistant') throw Error('expected assistant response');
  const content=[];
  if(typeof raw.content==='string' && raw.content.length) content.push({type:'text',text:raw.content});
  for(const call of raw.tool_calls||[]) {
    const args=JSON.parse(call.function.arguments);
    if(!args || Array.isArray(args) || typeof args!=='object') throw Error('tool arguments must be an object');
    content.push({type:'toolCall',id:call.id,name:call.function.name,arguments:args});
  }
  return {role:'assistant',content,stopReason:raw.tool_calls?.length?'toolUse':'stop',
    model,provider:'openai',api:'openai-completions',timestamp:Date.now(),
    ...(raw._provider_usage ? {usage:raw._provider_usage} : {})};
}

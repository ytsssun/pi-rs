import {request} from './native-store-backend.mjs';

// Adapt the synchronous native provider operation to the StreamFn-shaped seam
// consumed by the existing JS driver. The model request and credentials remain Rust-owned.
export function nativeProviderStream({model,reasoningEffort}={}) {
  return async (_model, context) => {
    const raw=request({op:'provider_chat',model:model||_model?.id||process.env.PI_RS_MODEL||'gpt-5.6-luna',messages:context.messages,tools:context.tools||[],reasoning_effort:reasoningEffort||'none'});
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

import {request} from './native-store-backend.mjs';

// Adapt the synchronous native provider operation to the StreamFn-shaped seam
// consumed by the existing JS driver. The model request and credentials remain Rust-owned.
export function nativeProviderStream({model,reasoningEffort}={}) {
  return async (_model, context) => {
    const message=request({op:'provider_chat',model:model||_model?.id||process.env.PI_RS_MODEL||'gpt-5.6-luna',messages:context.messages,tools:context.tools||[],reasoning_effort:reasoningEffort||'none'});
    return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return message;}};
  };
}

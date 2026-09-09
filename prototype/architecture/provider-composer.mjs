// Minimal custom-provider request composer. Keeps provider registration separate
// from transport while honoring Pi's OpenAI-compatible request contract.
export function composeProviderRequest(model, messages, tools = [], options = {}) {
  if (!model || typeof model !== 'object') throw new Error('model required');
  const baseUrl = String(model.baseUrl ?? model.base_url ?? '').replace(/\/$/, '');
  if (!baseUrl) throw new Error(`provider ${model.provider ?? 'custom'} baseUrl required`);
  const id = String(model.id ?? model.modelId ?? '');
  if (!id) throw new Error('model id required');
  const body = { model: id, messages: Array.isArray(messages) ? messages : [], tools: Array.isArray(tools) ? tools : [] };
  if (options.reasoningEffort) body.reasoning_effort = options.reasoningEffort;
  return { url: `${baseUrl}/chat/completions`, method: 'POST', headers: { 'content-type': 'application/json', ...(model.headers ?? {}) }, body };
}

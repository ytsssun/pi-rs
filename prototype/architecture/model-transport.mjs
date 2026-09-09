// The active Rust adapter is OpenAI-only. Never send another provider's
// model identifier using OpenAI credentials merely because catalog lookup passed.
export function openAITransportModel(model) {
  if (model?.provider !== 'openai') throw Error(`unsupported native provider: ${model?.provider ?? 'missing'}`);
  if (typeof model.id !== 'string' || !model.id.trim()) throw Error('resolved model id required');
  return model.id;
}

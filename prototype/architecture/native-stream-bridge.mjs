import { openaiEvents } from './openai-stream-adapter.mjs';
import { StreamAssembler } from './stream-assembler.mjs';

/** Consume OpenAI chunks from a native queue and return Pi canonical output. */
export function assembleOpenAIChunks(chunks) {
  const assembler = new StreamAssembler();
  const state = new Map();
  let usage;
  for (const chunk of chunks) {
    if (chunk?.usage) usage = chunk.usage;
    for (const event of openaiEvents(chunk, state)) assembler.push(event);
  }
  const result = assembler.finish();
  if (usage) result.usage = usage;
  return result;
}

export function assembleNativeQueue(request, handle) {
  const chunks = [];
  for (;;) {
    const event = request({ op: 'queue_poll', handle, wait: true });
    if (event == null) throw Error('native stream ended without terminal marker');
    if (event.terminal) { if (event.value?.type === 'error') throw Error(event.value.message ?? 'provider stream error'); break; }
    chunks.push(event.value);
  }
  return assembleOpenAIChunks(chunks);
}

export function runtimeCalls(canonical) {
  return (canonical.content ?? []).filter(x => x.type === 'toolCall').map(x => ({ id: x.id, name: x.name, arguments: x.arguments }));
}

export function toolResultMessages(calls, results) {
  const assistant = { role: 'assistant', content: null, tool_calls: calls.map(c => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.arguments) } })) };
  const tools = results.map(r => ({ role: 'tool', tool_call_id: r.toolCallId, content: (r.content ?? []).map(x => x.text ?? '').join('') }));
  return [assistant, ...tools];
}

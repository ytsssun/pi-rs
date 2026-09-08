// Convert OpenAI Chat Completions chunks into the Pi stream assembler contract.
export function* openaiEvents(chunk, state = new Map()) {
  const choice = chunk?.choices?.[0];
  if (!choice) return;
  const d = choice.delta ?? {};
  if (typeof d.content === 'string' && d.content) yield { type: 'text_delta', delta: d.content };
  for (const call of d.tool_calls ?? []) {
    const i = call.index ?? 0;
    if (call.id) { state.set(i, call.id); yield { type: 'toolcall_start', contentIndex: i, id: call.id, toolName: call.function?.name ?? '' }; }
    if (call.function?.arguments) yield { type: 'toolcall_delta', contentIndex: i, delta: call.function.arguments };
  }
  if (choice.finish_reason === 'tool_calls') {
    for (const [i, id] of state) yield { type: 'toolcall_end', contentIndex: i, id };
  }
  if (choice.finish_reason === 'stop') yield { type: 'done', reason: 'stop' };
}

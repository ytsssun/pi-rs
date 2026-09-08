import { openaiEvents } from './openai-stream-adapter.mjs';
import { StreamAssembler } from './stream-assembler.mjs';

/** Consume OpenAI chunks from a native queue and return Pi canonical output. */
export function assembleOpenAIChunks(chunks) {
  const assembler = new StreamAssembler();
  const state = new Map();
  for (const chunk of chunks) for (const event of openaiEvents(chunk, state)) assembler.push(event);
  if (!assembler.terminal) assembler.push({ type: 'done', reason: 'eof' });
  return assembler.finish();
}

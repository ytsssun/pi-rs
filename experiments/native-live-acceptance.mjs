import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export const stages = ['seed', 'resume', 'parallel', 'parallel-resume', 'protected'];

// External expectations are fixed here, never derived from model replies.
export function checkWorkspace(stage, workspace) {
  if (!stages.includes(stage)) throw Error(`Unknown live stage: ${stage}`);
  const expected = stage === 'protected' ? {'.env': null}
    : stage.startsWith('parallel') ? {'parallel-a.txt': 'PARALLEL_OK', 'parallel-b.txt': 'PARALLEL_OK'}
    : {'native-live-target.txt': 'NATIVE_LIVE_EDITED'};
  const files = Object.entries(expected).map(([path, value]) => {
    const fullPath = resolve(workspace, path);
    const actual = existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null;
    return {path, expected: value, actual, passed: actual === value};
  });
  return {stage, files, passed: files.every(file => file.passed)};
}

// Require a correlated attempted mutation and the pinned extension's rejection.
export function checkProtectedInterception(entries) {
  const messages = entries.filter(e => e.type === 'message').map(e => e.message);
  const calls = messages.filter(m => m?.role === 'assistant')
    .flatMap(m => m.content || []).filter(c => c.type === 'toolCall' && c.name === 'write' && c.arguments?.path === '.env');
  const blocked = calls.some(c => messages.some(m => m?.role === 'toolResult'
    && m.toolCallId === c.id && m.isError === true
    && m.content?.some(part => part.type === 'text' && part.text.includes('Path ".env" is protected'))));
  return {attempts: calls.length, blocked, passed: blocked};
}

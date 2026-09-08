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

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';

const child = spawn(process.execPath, ['--experimental-strip-types',
  new URL('./extension-sidecar.mjs', import.meta.url).pathname], { stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });
const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
const responses = [];
const lines = createInterface({ input: child.stdout });
const reading = (async () => {
  for await (const line of lines) responses.push(JSON.parse(line));
})();
const exited = once(child, 'exit');
const cases = [
  { id: 1, method: 'tool_call', params: { toolName: 'write', input: { path: '.env' } } },
  { id: 2, method: 'tool_call', params: { toolName: 'edit', input: { path: '.git/config' } } },
  { id: 3, method: 'tool_call', params: { toolName: 'write', input: { path: 'src/main.rs' } } },
  { id: 4, method: 'tool_call', params: { toolName: 'read', input: { path: '.env' } } },
  // The upstream example does substring matching, not normalized path confinement.
  { id: 5, method: 'tool_call', params: { toolName: 'write', input: { path: 'safe.env.example' } } },
  { id: 6, method: 'context', params: {} },
];
for (const request of cases) child.stdin.write(`${JSON.stringify(request)}\n`);
child.stdin.write('not-json\n');
child.stdin.end();
const [code, signal] = await exited;
clearTimeout(timer);
await reading;
assert.equal(code, 0, `sidecar exit ${code}/${signal}: ${stderr}`);
assert.equal(responses.length, 7);
assert.deepEqual(responses.slice(0, 5), [
  { id: 1, result: { block: true, reason: 'Path ".env" is protected' } },
  { id: 2, result: { block: true, reason: 'Path ".git/config" is protected' } },
  { id: 3, result: null },
  { id: 4, result: null },
  { id: 5, result: { block: true, reason: 'Path "safe.env.example" is protected' } },
]);
assert.equal(responses[5].id, 6);
assert.match(responses[5].error, /Expected integer id/);
assert.equal(responses[6].id, null);
assert.equal(typeof responses[6].error, 'string');
console.log(JSON.stringify({ status: 'tested', runtime: process.version,
  extension: 'upstream protected-paths.ts unchanged', cases: responses }, null, 2));

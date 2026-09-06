// Execute the original pinned TypeScript module, not a rewritten oracle.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { truncateHead, truncateTail } from '../vendor/pi-mono/packages/coding-agent/src/core/tools/truncate.ts';

const upstream = fileURLToPath(new URL('../vendor/pi-mono', import.meta.url));
const expected = '9767ba275f3e9a5ee0f5c5342249b629ab1b2282';
const actual = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
if (actual !== expected) throw new Error(`Upstream mismatch: ${actual}, expected ${expected}`);
const changes = execFileSync('git', ['-C', upstream, 'status', '--porcelain', '--', 'packages/coding-agent/src/core/tools/truncate.ts'], {encoding:'utf8'});
if (changes.trim()) throw new Error('Oracle module has local modifications');
const cases = JSON.parse(readFileSync(new URL('./truncate-cases.json', import.meta.url), 'utf8'));
const results = cases.map(c => ({...c, result: (c.direction === 'head' ? truncateHead : truncateTail)(c.content, c.options)}));
console.log(JSON.stringify({upstreamCommit: actual, module:'packages/coding-agent/src/core/tools/truncate.ts', results}, null, 2));

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const oracle = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', 'experiments/upstream-oracle.mjs'], {cwd:root, encoding:'utf8'}));
const input = oracle.results.map(c => JSON.stringify({kind:c.direction, content:c.content, options:c.options})).join('\n') + '\n';
const stdout = execFileSync(root + 'compatibility/target/debug/pi-rs-compat', [], {input, encoding:'utf8'});
const actual = stdout.trim().split('\n').map(line => JSON.parse(line));
const failures = oracle.results.flatMap((c,i) => isDeepStrictEqual(c.result, actual[i]) ? [] : [{id:c.id, expected:c.result, actual:actual[i]}]);
if (actual.length !== oracle.results.length) failures.push({error:'result count mismatch', expected:oracle.results.length, actual:actual.length});
console.log(JSON.stringify({upstreamCommit:oracle.upstreamCommit, cases:oracle.results.length, passed:oracle.results.length-failures.length, failures}, null, 2));
if (failures.length) process.exitCode = 1;

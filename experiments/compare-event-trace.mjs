import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const asyncCheck=spawnSync(process.execPath,['experiments/upstream-async-tool.mjs'],{encoding:'utf8'});
assert.equal(asyncCheck.status,0,asyncCheck.stderr);
spawnSync(process.execPath,['experiments/upstream-event-trace.mjs'],{encoding:'utf8'});
const expected=JSON.parse(readFileSync(new URL('./upstream-event-trace.json',import.meta.url))).trace;
const run=spawnSync(process.execPath,['--import','./vendor/pi-mono/node_modules/tsx/dist/loader.mjs','experiments/native-runtime.mjs'],{encoding:'utf8',env:{...process.env,TSX_TSCONFIG_PATH:'vendor/pi-mono/tsconfig.json'}});
assert.equal(run.status,0,run.stderr);
const report=JSON.parse(run.stdout);
const actual=report.reports[0].trace.filter(e=>['turn_start','model_start','model_result','tool_start','tool_result','turn_end'].includes(e.type));
// The native driver currently exposes action boundaries; normalize names only.
assert.deepEqual(actual.map(e=>e.type),expected.map(e=>e.type),`event order mismatch\n${run.stdout}`);
const expectedTools=expected.filter(e=>e.type==='tool_start'||e.type==='tool_result');
const actualTools=actual.filter(e=>e.type==='tool_start'||e.type==='tool_result');
assert.deepEqual(actualTools.map(e=>e.tool),expectedTools.map(e=>e.tool),'tool names mismatch');
assert.deepEqual(actualTools.filter(e=>e.type==='tool_result').map(e=>e.isError??false),expectedTools.filter(e=>e.type==='tool_result').map(e=>e.isError??false),'tool error semantics mismatch');
console.log(JSON.stringify({verified:true,expected:expected.map(e=>e.type),actual:actual.map(e=>e.type)}));

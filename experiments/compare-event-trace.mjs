import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync(new URL('./upstream-event-trace.json',import.meta.url))).trace;
const run=spawnSync(process.execPath,['--import','./vendor/pi-mono/node_modules/tsx/dist/loader.mjs','experiments/native-runtime.mjs'],{encoding:'utf8',env:{...process.env,TSX_TSCONFIG_PATH:'vendor/pi-mono/tsconfig.json'}});
assert.equal(run.status,0,run.stderr);
const report=JSON.parse(run.stdout);
const actual=report.reports[0].trace.map(e=>({type:e.type,tool:e.tool,callId:e.requestId}));
// The native driver currently exposes action boundaries; normalize names only.
assert.deepEqual(actual.map(e=>e.type),expected.map(e=>e.type),`event order mismatch\n${run.stdout}`);
console.log(JSON.stringify({verified:true,expected:expected.map(e=>e.type),actual:actual.map(e=>e.type)}));

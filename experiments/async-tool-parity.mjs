import assert from 'node:assert/strict';
import {exercise,loadUpstreamExecutor,provenance} from './upstream-async-tool.mjs';
import {executePreparedRust,traces} from '../prototype/architecture/async-executor.mjs';
const timer=setTimeout(()=>{console.error('async parity deadline');process.exit(1);},20000);
try {
  const upstream=await loadUpstreamExecutor();
  if(process.argv.includes('--fire-and-forget-counterexample')) {
    await exercise((prepared,signal,emit)=>upstream(prepared,signal,event=>{void emit(event);}));
    throw Error('counterexample unexpectedly passed');
  }
  const control=await exercise(upstream);
  const rust=await exercise(executePreparedRust);
  assert.deepEqual(rust,control);
  console.log(JSON.stringify({provenance,equal:true,cases:rust,traces,
    scope:'Five deterministic prepared-tool cases using actual upstream loader/runner/wrapper; Rust owns update acceptance and completion acknowledgment barrier.',
    limitations:['One Rust process per invocation, not integrated agent runtime','JS retains original AbortSignal; no Rust-originated cancellation protocol',
      'JSON tool outcomes; arbitrary JS identity and values untested','Synchronous sink throw, process death during drain, admission and recovery untested',
      'No provider call, native binding, UI, Pi SessionManager or performance claim']},null,2));
} finally {clearTimeout(timer);}

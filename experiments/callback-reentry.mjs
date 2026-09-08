// Actual unchanged Pi plugin, Rust-owned live dispatch/state. No model calls.
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {createHost, pluginSha256} from '../prototype/real-plugin-host.mjs';

const binary=resolve('target/debug/examples/callback_kernel');
const directory=mkdtempSync(join(tmpdir(),'pi-callback-'));
const socket=join(directory,'core.sock');
const child=spawn(binary,['serve',socket],{env:{PATH:'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});
let stderr=''; child.stderr.on('data',data=>stderr+=data);
const exit=once(child,'exit');
const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]();
const trace=[];
function rpc(request) {
  const response=spawnSync(binary,['rpc',socket,JSON.stringify(request)],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:3000});
  if(response.status!==0)throw Error(`RPC failed: ${response.error?.code ?? response.status}: ${response.stderr}`);
  const parsed=JSON.parse(response.stdout);
  if(parsed.error){trace.push({request,error:parsed.error});throw Error(parsed.error);}
  trace.push({request,response:parsed.result});
  return parsed.result;
}
async function next() {
  let timer;
  try {
    const line=await Promise.race([lines.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('callback deadline')),5000);})]);
    assert.equal(line.done,false,`unexpected kernel exit ${stderr}`);
    return JSON.parse(line.value);
  } finally {clearTimeout(timer);}
}
try {
  const ready=await next();assert.equal(ready.type,'ready');
  const backend={getActiveTools:()=>rpc({op:'get_tools'}),setActiveTools:names=>{rpc({op:'set_tools',names});}};
  const host=await createHost(backend);
  await host.runner.emit({type:'session_start'});
  rpc({op:'start'});
  const calls=[];
  let firstId;
  for(const name of ['tool_search','Calculator']) {
    const call=await next();assert.equal(call.type,'execute');assert.equal(call.name,name);
    firstId ??= call.id;
    assert.equal(rpc({op:'snapshot'}).pending,call.id);
    // The upstream plugin's synchronous get/set calls reenter the SAME live Rust process.
    const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name===call.name);
    assert.ok(registered);
    const result=await wrapRegisteredTool(registered,host.runner).execute(call.id,call.args,new AbortController().signal);
    if(call.name==='tool_search')assert.deepEqual(result.addedToolNames,['Calculator']);
    calls.push({name:call.name,result});
    rpc({op:'complete',id:call.id,result});
  }
  const done=await next();assert.equal(done.type,'done');
  assert.deepEqual(done.active,['tool_search','Calculator']);
  assert.equal(done.results[1].content[0].text,'42');
  assert.deepEqual(host.errors,[]);
  assert.equal(rpc({op:'snapshot'}).pending,null);
  assert.throws(()=>rpc({op:'complete',id:'stale',result:{}}),/invalid operation/);
  rpc({op:'start'});const failing=await next();
  assert.notEqual(failing.id,firstId);
  assert.throws(()=>rpc({op:'complete',id:firstId,result:calls[0].result}),/invalid operation/);
  assert.equal(rpc({op:'snapshot'}).pending,failing.id);
  rpc({op:'complete',id:failing.id,error:'injected JS rejection'});
  const failed=await next();assert.equal(failed.type,'failed');
  assert.equal(failed.error,'injected JS rejection');
  assert.equal(rpc({op:'snapshot'}).pending,null);
  child.kill('SIGTERM');await exit;
  assert.throws(()=>backend.getActiveTools(),/RPC failed/);
  console.log(JSON.stringify({upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',pluginSha256,
    calls,trace,checks:{nestedSyncReentry:true,activationVisibleToRustDispatch:true,unknownCompletionIdRejected:true,previousInvocationReplayRejected:true,
      reportedJsFailureClearsPending:true,deadKernelSyncCallThrows:true},
    limitations:['scripted Rust dispatcher, not a model-driven agent loop','synchronous helper process per RPC; no performance claim',
      'Unix socket prototype only','no cancellation/update/UI/native binding/Pi session test','failure is injected, not thrown by upstream plugin']},null,2));
} finally {
  if(child.exitCode===null && child.signalCode===null){child.kill('SIGKILL');await exit;}
  rmSync(directory,{recursive:true,force:true});
}

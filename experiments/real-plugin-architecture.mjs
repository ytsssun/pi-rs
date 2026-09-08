// Run with upstream tsx loader; no live model or credential access.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createBackend} from '../prototype/architecture/backends.mjs';
import {exercise,createHost,exerciseContext} from '../prototype/real-plugin-host.mjs';

import {exerciseOriginalLoop} from '../prototype/architecture/original-loop.mjs';

const nativeMessages=[
  {role:'user',content:'read data'},
  {role:'assistant',tool_calls:[{id:'read-1',type:'function',function:{name:'read',arguments:'{"path":"data"}'}}]},
  {role:'tool',tool_call_id:'read-1',content:'a😀b\nlong tool result'},
  {role:'assistant',content:'read complete'},
];
const piMessages=[
  {role:'user',content:'read data',timestamp:1},
  {role:'assistant',content:[{type:'toolCall',id:'read-1',name:'read',arguments:{path:'data'}}],stopReason:'toolUse',timestamp:2},
  {role:'toolResult',toolCallId:'read-1',toolName:'read',content:[{type:'text',text:nativeMessages[2].content}],isError:false,timestamp:3},
  {role:'assistant',content:[{type:'text',text:'read complete'}],stopReason:'stop',timestamp:4},
];
// Deliberately one text tool result, preserving all other Pi fields. This is NOT
// a general Pi/native message translator or Pi session-format implementation.
function projectPi(messages,backend) {
  // Negative mode retains the disproven canonical-reprojection hypothesis.
  const native=process.argv.includes('--canonical-counterexample') ? backend.context() : backend.projectMessages(messages.filter(m=>m.role==='toolResult').map(m=>({role:'tool',tool_call_id:m.toolCallId,content:m.content[0].text})));
  return messages.map(m=>m.role==='toolResult'? {...m,content:[{type:'text',text:native.find(n=>n.tool_call_id===m.toolCallId).content}]}:structuredClone(m));
}
async function contextProbe(backend, priorToolText) {
  const observed=[];
  const canonical=structuredClone(piMessages);
  const factory=pi=>{
    if (priorToolText !== undefined) pi.on('context', event=>{event.messages.find(m=>m.role==='toolResult').content[0].text=priorToolText;});
    pi.on('context', event=>({messages:projectPi(event.messages,backend)}));
    pi.on('context', event=>{observed.push(structuredClone(event.messages));event.messages[0].content='hook local mutation';});
  };
  const host=await createHost(backend,{factories:[factory]});
  const result=await host.runner.emitContext(canonical);
  assert.deepEqual(canonical,piMessages);
  assert.equal(result[0].content,'hook local mutation');
  assert.deepEqual(observed[0][0],piMessages[0]);
  return {observed:observed[0],canonicalPreserved:true,handlerMutationVisible:result[0].content};
}
if(process.argv[2]==='resume') {
  const backend=createBackend(process.argv[3],process.argv[4],{init:false});
  const before=backend.snapshot();
  const projected=await contextProbe(backend);
  backend.setPolicy(null);
  const restored=await contextProbe(backend);
  console.log(JSON.stringify({before,projected,restored,after:backend.snapshot(),pid:process.pid}));
} else {
  const root=mkdtempSync(join(tmpdir(),'pi-real-plugin-'));
  const reports=[];
  try {
    for(const kind of ['ts','rust']) {
      const state=join(root,kind+'.json');
      const backend=createBackend(kind,state);
      const toolResult=await exercise(backend);
      const originalLoop=await exerciseOriginalLoop(backend);
      backend.seedContext(nativeMessages);
      const initial=backend.snapshot();
      const chained=await contextProbe(backend,'extension-adjusted-result');
      assert.equal(chained.observed[2].content[0].text,'extension-adjusted-result', 'disabled policy must not overwrite preceding plugin edits');
      backend.setPolicy(2);
      const chainedTrimmed=await contextProbe(backend,'extension-adjusted-result');
      assert.equal(chainedTrimmed.observed[2].content[0].text,'ex\n[context view truncated; canonical result retained]');
      assert.deepEqual(backend.snapshot().session.messages,initial.session.messages);
      backend.setPolicy(2); // no-op must not create another audit entry
      const context=await contextProbe(backend);
      assert.equal(context.observed[2].content[0].text,'a😀\n[context view truncated; canonical result retained]');
      const child=spawnSync(process.execPath,[...process.execArgv,resolve('experiments/real-plugin-architecture.mjs'),'resume',kind,state],{
        env:{PATH:process.env.PATH,TSX_TSCONFIG_PATH:resolve('vendor/pi-mono/tsconfig.json')},encoding:'utf8',timeout:30000,
      });
      assert.equal(child.status,0,child.stderr);
      const resumed=JSON.parse(child.stdout);
      assert.notEqual(resumed.pid,process.pid);
      assert.deepEqual(resumed.before.session.messages,initial.session.messages);
      assert.deepEqual(resumed.projected,context);
      assert.equal(resumed.restored.observed[2].content[0].text,nativeMessages[2].content);
      assert.equal(resumed.after.session.context_policy_changes.length,2);
      assert.deepEqual(resumed.after.session.messages,initial.session.messages);
      reports.push({kind,toolResult,originalLoop,pluginChain:{precedingEditPreservedWithDisabledPolicy:true,precedingEditProjectedWithEnabledPolicy:true},context,resume:{separateProcess:true,policyPersisted:true,canonicalPreserved:true,resetRestored:true,audit:resumed.after.session.context_policy_changes},activeTools:resumed.after.active_tools});
    }
    // Report comparison deliberately excludes implementation process IDs/timing.
    const [a,b]=reports.map(({kind,...rest})=>rest);
    assert.deepEqual(a,b);
    const paths=['vendor/pi-mono/packages/coding-agent/examples/extensions/kimi-deferred-tools.ts','vendor/pi-mono/packages/coding-agent/src/core/extensions/loader.ts','vendor/pi-mono/packages/coding-agent/src/core/extensions/runner.ts'];
    console.log(JSON.stringify({status:'tested',upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',node:process.version,sources:paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')})),reports,upstreamContextErrorChain:await exerciseContext(),equal:true,limits:'Original loader/runner and unchanged Kimi plugin, original TS agent loop plus scripted model stream/no live inference. Rust authoritative file-backed synchronous subprocess state; TS control same experiment schema. Context custom factories, narrow one-text-tool translation, not full Pi SessionManager/session import or all plugin compatibility. No performance claim.'},null,2));
  } finally {rmSync(root,{recursive:true,force:true});}
}

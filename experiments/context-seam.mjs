// Architecture probe: original upstream request seam + custom TS transform,
// compared with existing Rust Session.context. No inference or plugin claims.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const sourcePath = 'vendor/pi-mono/packages/agent/src/agent-loop.ts';
const source = readFileSync(sourcePath, 'utf8');
// Append an export for a private function; body stays byte-for-byte upstream.
const js = stripTypeScriptTypes(source + '\nexport { streamAssistantResponse };');
const mod = new vm.SourceTextModule(js, {identifier: sourcePath});
await mod.link(async spec => {
  if (spec === '@earendil-works/pi-ai') return new vm.SyntheticModule(['EventStream','validateToolArguments'], function () {
    this.setExport('EventStream', class {constructor(){throw Error('unused stream constructor invoked');}});
    this.setExport('validateToolArguments', () => {throw Error('unused tool validation invoked');});
  });
  if (spec === './stream-fn.ts') return new vm.SyntheticModule(['getDefaultStreamFn'],function(){this.setExport('getDefaultStreamFn',()=>{throw Error('unexpected default provider');});});
  throw Error('unexpected import '+spec);
});
await mod.evaluate();
const cases = [null,0,2,100];
const results=[];
for (const limit of cases) {
  const messages=[{role:'user',content:'keep input'}, {role:'tool',tool_call_id:'t1',content:'a😀b\nlong result'}];
  const original = structuredClone(messages);
  const context = {systemPrompt:'probe',messages,tools:[]};
  let captured;
  let converted=false;
  const transformContext = input => input.map(m=> {
    const copy=structuredClone(m);
    if(limit!==null && m.role==='tool' && [...m.content].length>limit)
      copy.content=[...m.content].slice(0,limit).join('')+'\n[context view truncated; canonical result retained]';
    return copy;
  });
  const answer={role:'assistant',content:[{type:'text',text:'fixture'}],stopReason:'stop'};
  await mod.namespace.streamAssistantResponse(context, {
    model:{provider:'fixture'}, transformContext,
    // Deliberately identity conversion: testing projection ordering, not Pi wire schema.
    convertToLlm: input=>{converted=true;return input;},apiKey:'fixture-only'
  }, undefined, ()=>{}, async (_model,ctx)=>{
    assert.ok(converted);
    captured=structuredClone(ctx.messages);
    return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return answer;}};
  });
  const rust=spawnSync('target/debug/examples/context_projection',[],{input:JSON.stringify({messages:original,limit}),encoding:'utf8'});
  assert.equal(rust.status,0,rust.stderr);
  const r=JSON.parse(rust.stdout);
  assert.deepEqual(r.projected,captured);
  assert.equal(r.canonical_preserved,true);
  assert.deepEqual(context.messages.slice(0,original.length),original);
  results.push({limit,equal:true,canonicalPreserved:true,transformBeforeConversion:true});
}
console.log(JSON.stringify({status:'tested',upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',source:sourcePath,sha256:createHash('sha256').update(source).digest('hex'),cases:results,scope:'Unchanged upstream request function with appended export, unused dependency guards and scripted stream; custom TS transform versus real Rust projection. Not full loop, plugin loading, persistence, provider schema or performance validation.'},null,2));

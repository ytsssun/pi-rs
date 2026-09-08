// Native reference/callback probe against pinned Pi. No live provider or terminal.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHost,tsBackend,pluginSha256} from '../prototype/real-plugin-host.mjs';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {Text} from '../vendor/pi-mono/packages/tui/src/components/text.ts';
import {loadThemeFromPath} from '../vendor/pi-mono/packages/coding-agent/src/modes/interactive/theme/theme.ts';
const native=createRequire(import.meta.url)('../target/native-seam.node');
const nativeBackend={getActiveTools:()=>JSON.parse(native.getState()),setActiveTools:names=>native.setState(JSON.stringify(names))};
async function scenario(backend,dispatch) {
  const host=await createHost(backend);await host.runner.emit({type:'session_start'});
  const results=[];
  for(const [name,args] of [['tool_search',{query:'calc'}],['Calculator',{expr:'100 + 500'}]]) {
    const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name===name);
    results.push(await dispatch(()=>wrapRegisteredTool(registered,host.runner).execute('native-'+name,args,new AbortController().signal),args));
  }
  assert.deepEqual(results[0].addedToolNames,['Calculator']);
  assert.equal(results[1].content[0].text,'42');assert.deepEqual(host.errors,[]);
  return {results,active:backend.getActiveTools()};
}
const control=await scenario(tsBackend(),(fn,arg)=>fn(arg));
native.setState('[]');const rust=await scenario(nativeBackend,native.dispatch);
assert.deepEqual(rust,control);

// Synchronous nested callback sees Rust-owned state immediately; no shadow JS state.
const order=[];
native.dispatch(value=>{
  order.push('outer');native.setState('outer');
  assert.equal(native.dispatch(()=>{order.push('inner');native.setState('inner');return value;},value),value);
  assert.equal(native.getState(),'inner');order.push('after-inner');
},{});
assert.deepEqual(order,['outer','inner','after-inner']);
const token=Symbol('identity');
const object={token,method(){return this.token;},map:new Map([[token,1]])};object.self=object;
assert.equal(native.dispatch(value=>value,object),object);
assert.equal(native.dispatch(value=>value.method(),object),token);
const promise=Promise.resolve(object);
assert.equal(native.dispatch(()=>promise,null),promise);
assert.equal(await promise,object);
const thrown=[];
for(const reason of [undefined,null,token,object,new Error('identity')]) {
  let caught=false;
  try {native.dispatch(()=>{throw reason;},null);} catch(actual){caught=true;assert.equal(actual,reason);}
  assert.equal(caught,true);thrown.push(reason===null?'null':typeof reason);
}
assert.throws(()=>native.dispatch(3,{}),/native seam operation failed/);
assert.throws(()=>native.setState({}),/native seam operation failed/);
assert.equal(native.getState(),'inner');
for(const value of ['\ud800','a\u0000😀z','']){native.setState(value);assert.equal(native.getState(),value);}
const getterReason={kind:'getter failure'};
assert.throws(()=>native.abort({get abort(){throw getterReason;}},null),error=>error===getterReason);

const controller=new AbortController();const reason={token,why:'stop'};
let observed;
const pending=new Promise(resolve=>controller.signal.addEventListener('abort',()=>{
  observed=controller.signal.reason;
  native.setState('aborted');resolve(observed);
},{once:true}));
native.abort(controller,reason);
assert.equal(controller.signal.aborted,true);assert.equal(observed,reason);
assert.equal(await pending,reason);assert.equal(native.getState(),'aborted');

const theme=loadThemeFromPath(resolve('vendor/pi-mono/packages/coding-agent/src/modes/interactive/theme/dark.json'),'truecolor');
let calls=0;
const component=new Text('before',0,0,text=>{calls++;return theme.fg('accent',text);});
const returned=native.dispatch(receivedTheme=>{assert.equal(receivedTheme,theme);return component;},theme);
assert.equal(returned,component);const before=returned.render(20);
returned.setText('after');const after=component.render(20);
assert.notDeepEqual(before,after);assert.ok(calls>=2);
assert.throws(()=>JSON.stringify(object),/circular/i);
const copied=JSON.parse(JSON.stringify(component));assert.equal(typeof copied.render,'undefined');
console.log(JSON.stringify({upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',pluginSha256,
  nativeSourceSha256:createHash('sha256').update(readFileSync('prototype/native-seam.rs')).digest('hex'),
  platform:process.platform,arch:process.arch,node:process.version,controlEqualsNative:true,plugin:rust,
  checks:{nestedReentry:order,cyclicObjectIdentity:true,symbolAndMethodIdentity:true,promiseIdentity:true,thrownIdentityTypes:thrown,
    nativeInvokedAbortReasonIdentity:true,abortListenerReentry:true,actualTextThemeIdentity:true,componentClosureAndMutation:true,
    utf16StateRoundtrip:true,throwingGetterIdentity:true,naiveJsonCycleRejected:true,naiveJsonComponentMethodsLost:true},
  limitations:['Synchronous Node-API callbacks only; no retained native references or background Rust thread',
    'Native abort call triggered by JS test, not autonomous runtime cancellation scheduling',
    'Actual Text/Theme used without interactive TUI lifecycle or real UI factory host',
    'Thread-local scalar registry, not per-session/environment core',
    'No full Rust loop, Pi session persistence, cross-platform binary matrix or performance proof',
    'Hand-declared unsafe FFI experiment, not production bindings']},null,2));

// Original InteractiveMode lifecycle methods on an explicitly initialized host fixture.
// Real loader/runner, Text/Container/Theme and native session; no terminal startup.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {InteractiveMode} from '../vendor/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts';
import {Container} from '../vendor/pi-mono/packages/tui/src/tui.ts';
import {Text} from '../vendor/pi-mono/packages/tui/src/components/text.ts';
import {loadThemeFromPath,setThemeInstance,theme} from '../vendor/pi-mono/packages/coding-agent/src/modes/interactive/theme/theme.ts';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
const directory=mkdtempSync(join(tmpdir(),'pi-ui-'));
const store=await createBackend({path:join(directory,'session.jsonl')});
const trace=[];
try {
  store.appendCustomEntry('ui-state',{value:42});
  setThemeInstance(loadThemeFromPath(resolve('vendor/pi-mono/packages/coding-agent/src/modes/interactive/theme/dark.json'),'truecolor'));
  let renders=0;
  const ui={requestRender(){renders++;}}; // UI identity sentinel, not a real TUI/terminal.
  const mode=Object.create(InteractiveMode.prototype);
  Object.assign(mode,{ui,extensionWidgetsAbove:new Map(),extensionWidgetsBelow:new Map(),widgetContainerAbove:new Container(),widgetContainerBelow:new Container(),footerContainer:new Container(),headerContainer:new Container(),footerDataProvider:{getValue:()=>42},footer:new Text('built-in-footer',0,0),toolOutputExpanded:true});
  let earlyInvoked=false;mode.setExtensionHeader(()=>{earlyInvoked=true;});assert.equal(earlyInvoked,false);
  mode.builtInHeader=new Text('built-in-header',0,0);mode.headerContainer.addChild(mode.builtInHeader);
  const components={};
  function component(name){
    const text=new Text(name,0,0);text.dispose=()=>{
      assert.equal(store.getBranch()[0].data.value,42,'dispose callback must still be able to read native session');trace.push('dispose:'+name);
    };components[name]=text;return text;
  }
  function factory(name,footer=false){return (receivedUi,receivedTheme,provider)=>{
    assert.equal(receivedUi,ui);assert.equal(receivedTheme,theme);
    if(footer)assert.equal(provider,mode.footerDataProvider);
    assert.equal(store.getBranch()[0].data.value,42);trace.push('factory:'+name);return component(name);
  };}
  const jsonCounterexample=process.argv.includes('--json-component-counterexample');
  const widget=(key,content,options)=>mode.setExtensionWidget(key,jsonCounterexample&&typeof content==='function'?(...args)=>JSON.parse(JSON.stringify(content(...args))):content,options);
  let captured;
  const host=await createHost(tsBackend(),{extensionPaths:[],sessionManager:store,factories:[pi=>pi.on('session_start',(_event,ctx)=>{
    captured=ctx;ctx.ui.setWidget('key',factory('widget-old'));
    ctx.ui.setFooter(factory('footer',true));ctx.ui.setHeader(factory('header'));
  })]});
  host.runner.setUIContext({setWidget:widget,setFooter:fn=>mode.setExtensionFooter(fn),setHeader:fn=>mode.setExtensionHeader(fn)},'interactive');
  await host.runner.emit({type:'session_start'});assert.deepEqual(host.errors,[]);
  assert.ok(mode.widgetContainerAbove.children.includes(components['widget-old']),'mounted widget must retain factory instance');
  assert.equal(mode.footerContainer.children[0],components.footer);assert.equal(mode.headerContainer.children[0],components.header);
  components.header.setText('changed');assert.equal(mode.headerContainer.render(40)[0],'changed'.padEnd(40));
  captured.ui.setWidget('key',factory('widget-new'),{placement:'belowEditor'});
  assert.equal(mode.extensionWidgetsAbove.has('key'),false);assert.equal(mode.extensionWidgetsBelow.get('key'),components['widget-new']);
  assert.ok(mode.widgetContainerBelow.children.includes(components['widget-new']));
  assert.ok(trace.indexOf('dispose:widget-old')<trace.indexOf('factory:widget-new'));
  mode.clearExtensionWidgets();mode.clearExtensionWidgets();
  assert.equal(trace.filter(x=>x==='dispose:widget-new').length,1);
  captured.ui.setFooter(undefined);captured.ui.setHeader(undefined);
  assert.equal(mode.footerContainer.children[0],mode.footer);assert.equal(mode.headerContainer.children[0],mode.builtInHeader);
  assert.equal(trace.filter(x=>x==='dispose:footer').length,1);assert.equal(trace.filter(x=>x==='dispose:header').length,1);
  // Failure semantics: disposal throws before removal, so no replacement factory runs.
  const broken=new Text('broken');broken.dispose=()=>{throw Error('deliberate disposal failure');};
  mode.setExtensionWidget('broken',()=>broken);let replacement=false;
  assert.throws(()=>mode.setExtensionWidget('broken',()=>{replacement=true;return new Text('replacement');}),/deliberate disposal failure/);
  assert.equal(replacement,false);assert.equal(mode.extensionWidgetsAbove.get('broken'),broken);
  broken.dispose=()=>{};mode.clearExtensionWidgets();
  host.runner.invalidate('UI probe finished');assert.throws(()=>captured.ui,/UI probe finished/);
  assert.ok(renders>0);
  console.log(JSON.stringify({upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',sourceSha256:createHash('sha256').update(readFileSync('vendor/pi-mono/packages/coding-agent/src/modes/interactive/interactive-mode.ts')).digest('hex'),trace,
    checks:{earlyHeaderFactorySkipped:true,factoryIdentityRetained:true,componentMutationVisible:true,replacementDisposesBeforeFactory:true,clearDisposesOnce:true,builtinsRestored:true,nativeSessionReadableDuringCallbacks:true,disposeFailurePreventsReplacement:true,staleContextRejected:true},
    limits:['Original lifecycle method bodies; constructor/lifecycle setup uses fixture fields','UI requestRender sentinel, no real terminal/TUI startup/input/visual layout','Synthetic extension factory, not arbitrary ecosystem UI plugin suite','No custom overlay/focus/dispose-on-process-shutdown proof','No integrated Rust-owned scheduler/model loop']},null,2));
} finally {await store.close();rmSync(directory,{recursive:true,force:true});}

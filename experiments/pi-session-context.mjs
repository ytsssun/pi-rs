// Real pinned Pi session storage + unchanged todo extension, synthetic tool calls.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SessionManager} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
const type='pi-rs.context-policy.v1';
const plugin=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/todo.ts');
const marker='\n[context view truncated; canonical result retained]';
function policy(manager) {
  const entries=process.argv.includes('--all-entries-counterexample')?manager.getEntries():manager.getBranch();
  const entry=entries.filter(e=>e.type==='custom'&&e.customType===type).at(-1);
  return entry?.data.toolChars??null;
}
function project(messages,limit,kind) {
  const toolMessages=messages.filter(m=>m.role==='toolResult');
  assert.ok(toolMessages.every(m=>m.content.length===1&&m.content[0].type==='text'),'experiment only supports one-text-block tool results');
  const input=toolMessages.map(m=>({role:'tool',tool_call_id:m.toolCallId,content:m.content[0].text}));
  let projected;
  if(kind==='rust') {
    const child=spawnSync(resolve('target/debug/examples/context_projection'),[],{input:JSON.stringify({messages:input,limit}),encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000});
    assert.equal(child.status,0,child.stderr);const output=JSON.parse(child.stdout);
    assert.equal(output.canonical_preserved,true);projected=output.projected;
  } else projected=input.map(m=>({...m,content:limit!==null&&[...m.content].length>limit?[...m.content].slice(0,limit).join('')+marker:m.content}));
  let i=0;
  return messages.map(m=>m.role==='toolResult'?{...structuredClone(m),content:[{...m.content[0],text:projected[i++].content}]}:structuredClone(m));
}
async function hostFor(manager,kind) {
  const host=await createHost(tsBackend(['todo']),{sessionManager:manager,extensionPaths:[plugin],factories:[pi=>pi.on('context',event=>({messages:project(event.messages,policy(manager),kind)}))]});
  await host.runner.emit({type:'session_start'});
  return host;
}
async function invoke(host,manager,args,persist=true) {
  const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name==='todo');
  const result=await wrapRegisteredTool(registered,host.runner).execute('call-'+args.action,args,new AbortController().signal);
  if(persist) {
    manager.appendMessage({role:'assistant',content:[{type:'toolCall',id:'call-'+args.action,name:'todo',arguments:args}],api:'fixture',provider:'fixture',model:'fixture',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:'toolUse',timestamp:1});
    manager.appendMessage({role:'toolResult',toolCallId:'call-'+args.action,toolName:'todo',content:result.content,details:result.details,isError:false,timestamp:2});
  }
  return result;
}
async function inspect(host,manager) {
  const canonical=manager.buildSessionContext().messages;
  const before=JSON.stringify(canonical);
  const view=await host.runner.emitContext(canonical);
  assert.equal(JSON.stringify(manager.buildSessionContext().messages),before);
  assert.equal(JSON.stringify(canonical),before);
  assert.deepEqual(view.filter(m=>m.role==='toolResult').map(m=>m.details),canonical.filter(m=>m.role==='toolResult').map(m=>m.details));
  assert.deepEqual(host.errors,[]);
  return {limit:policy(manager),texts:view.filter(m=>m.role==='toolResult').map(m=>m.content[0].text),canonicalTexts:canonical.filter(m=>m.role==='toolResult').map(m=>m.content[0].text)};
}
if(process.argv[2]==='resume') {
  const manager=SessionManager.open(process.argv[3]);const host=await hostFor(manager,process.argv[4]);
  const restored=await invoke(host,manager,{action:'list'},false);
  assert.deepEqual(restored.details.todos.map(t=>t.text),['alpha']);
  assert.equal(policy(manager),2);
  const projected=await inspect(host,manager);assert.equal(projected.texts[0],'Ad'+marker);
  const continued=await invoke(host,manager,{action:'add',text:'gamma'});
  assert.deepEqual(continued.details.todos.map(t=>[t.id,t.text]),[[1,'alpha'],[2,'gamma']]);
  manager.appendCustomEntry(type,{toolChars:null});
  const reset=await inspect(host,manager);assert.deepEqual(reset.texts,reset.canonicalTexts);
  console.log(JSON.stringify({pid:process.pid,restored:restored.details,continued:continued.details,projected,reset}));
} else {
  const directory=mkdtempSync(join(tmpdir(),'pi-session-'));
  const results=[];
  try {
    for(const kind of ['ts','rust']) {
      const manager=SessionManager.create(directory,join(directory,kind));
      manager.appendMessage({role:'user',content:'maintain todos',timestamp:0});
      const host=await hostFor(manager,kind);
      await invoke(host,manager,{action:'add',text:'alpha'});
      const anchor=manager.appendCustomEntry(type,{toolChars:2});
      await invoke(host,manager,{action:'add',text:'beta'});
      manager.appendCustomEntry(type,{toolChars:null});
      const path=manager.getSessionFile();const prefix=readFileSync(path,'utf8');
      manager.branch(anchor);
      await host.runner.emit({type:'session_tree',newLeafId:anchor});
      manager.appendCustomEntry('pi-rs.probe-branch',{selected:true}); // persists new branch leaf
      const branched=await invoke(host,manager,{action:'list'},false);
      assert.deepEqual(branched.details.todos.map(t=>t.text),['alpha']);
      assert.equal(policy(manager),2,'policy must follow current branch, not latest entry on abandoned branch');
      const projected=await inspect(host,manager);assert.equal(projected.texts[0],'Ad'+marker);
      const child=spawnSync(process.execPath,[...process.execArgv,resolve('experiments/pi-session-context.mjs'),'resume',path,kind],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',TSX_TSCONFIG_PATH:resolve('vendor/pi-mono/tsconfig.json')},timeout:15000});
      assert.equal(child.status,0,child.stderr);const resumed=JSON.parse(child.stdout);assert.notEqual(resumed.pid,process.pid);delete resumed.pid;
      assert.ok(readFileSync(path,'utf8').startsWith(prefix),'old canonical file bytes must remain unchanged');
      const reopened=SessionManager.open(path);
      assert.equal(reopened.getEntries().filter(e=>e.type==='custom'&&e.customType===type).length,3);
      assert.equal(policy(reopened),null);
      const reopenedHost=await hostFor(reopened,kind);
      const reopenedTodos=await invoke(reopenedHost,reopened,{action:'list'},false);
      assert.deepEqual(reopenedTodos.details.todos.map(t=>[t.id,t.text]),[[1,'alpha'],[2,'gamma']]);
      assert.equal(reopenedTodos.details.nextId,3);
      const reopenedView=await inspect(reopenedHost,reopened);
      assert.deepEqual(reopenedView.texts,reopenedView.canonicalTexts);
      results.push({kind,projected,resumed,reopened:{details:reopenedTodos.details,view:reopenedView},distinctProcess:true,canonicalFilePrefixPreserved:true});
    }
    assert.deepEqual({...results[0],kind:null},{...results[1],kind:null});
    console.log(JSON.stringify({upstream:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',pluginSha256:createHash('sha256').update(readFileSync(plugin)).digest('hex'),results,
      limits:['Original TS SessionManager owns file/tree; no Rust session implementation','Synthetic tool calls, no model/AgentSession orchestration','One text tool block only, no compaction/malformed files/concurrent writers','Experiment-specific policy custom entry, not upstream policy feature']},null,2));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

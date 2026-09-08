// Actual unchanged Todo with Rust-owned append/tree/reopen. No model/TS manager.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const native=process.argv.includes('--native');
const {createBackend}=await import(native?'../prototype/architecture/native-store-backend.mjs':'../prototype/architecture/pi-store-backend.mjs');
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
const plugin=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/todo.ts');
const policyType='pi-rs.context-policy.v1';
async function run(path,stage) {
  const manager=await createBackend({path,mode:stage==='seed'?'create':'open'});
  try {
    const host=await createHost(tsBackend(['todo']),{extensionPaths:[plugin],sessionManager:manager});
    await host.runner.emit({type:'session_start'});
    const definition=host.runner.getAllRegisteredTools().find(t=>t.definition.name==='todo');
    const tool=wrapRegisteredTool(definition,host.runner);
    async function invoke(args,persist=true) {
      const callId='call-'+manager.getEntries().length;
      const result=await tool.execute(callId,args,new AbortController().signal);
      if(persist) {
        manager.appendMessage({role:'assistant',content:[{type:'toolCall',id:callId,name:'todo',arguments:args}],provider:'fixture',model:'fixture',timestamp:1,stopReason:'toolUse'});
        manager.appendMessage({role:'toolResult',toolName:'todo',toolCallId:callId,content:result.content,details:result.details,isError:false,timestamp:2});
      }
      return result.details;
    }
    const policy=()=>manager.getBranch().filter(e=>e.type==='custom'&&e.customType===policyType).at(-1)?.data.toolChars??null;
    let details;
    if(stage==='seed') {
      manager.appendMessage({role:'user',content:'todos',timestamp:0});
      await invoke({action:'add',text:'alpha'});
      const anchor=manager.appendCustomEntry(policyType,{toolChars:2});
      await invoke({action:'add',text:'beta'});manager.appendCustomEntry(policyType,{toolChars:null});
      manager.branch(anchor);await host.runner.emit({type:'session_tree',newLeafId:anchor});
      manager.appendCustomEntry('selected-branch',{});
      details=await invoke({action:'list'},false);
      assert.deepEqual(details.todos.map(t=>t.text),['alpha']);assert.equal(policy(),2);
    } else if(stage==='continue') {
      details=await invoke({action:'list'},false);assert.deepEqual(details.todos.map(t=>t.text),['alpha']);assert.equal(policy(),2);
      details=await invoke({action:'add',text:'gamma'});assert.equal(details.nextId,3);
      manager.appendCustomEntry(policyType,{toolChars:null});
    } else {
      details=await invoke({action:'list'},false);assert.deepEqual(details.todos.map(t=>[t.id,t.text]),[[1,'alpha'],[2,'gamma']]);
      assert.equal(details.nextId,3);assert.equal(policy(),null);
    }
    assert.deepEqual(host.errors,[]);
    return {stage,details,policy:policy(),pid:process.pid};
  } finally {await manager.close();}
}
if(process.argv[2]==='child') console.log(JSON.stringify(await run(process.argv[3],process.argv[4])));
else {
  const directory=mkdtempSync(join(tmpdir(),'pi-store-todo-'));const file=join(directory,'session.jsonl');
  try {
    const reports=[];let prefix;
    for(const stage of ['seed','continue','verify']) {
      const child=spawnSync(process.execPath,[...process.execArgv,resolve('experiments/pi-store-todo.mjs'),'child',file,stage,...(native?['--native']:[])],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',TSX_TSCONFIG_PATH:resolve('vendor/pi-mono/tsconfig.json')},timeout:20000});
      assert.equal(child.status,0,child.stderr);reports.push(JSON.parse(child.stdout));
      const content=readFileSync(file,'utf8');if(prefix)assert.ok(content.startsWith(prefix));prefix=content;
    }
    assert.equal(new Set(reports.map(r=>r.pid)).size,3);for(const report of reports)delete report.pid;
    console.log(JSON.stringify({transport:native?'native':'helper',reports,threeFreshProcesses:true,canonicalPrefixRetained:true,
      limits:['Fixture model messages, actual unchanged Todo; no live provider/AgentSession loop','Rust IDs/clock injected by test adapter','v3 only, no concurrent writer/crash/legacy migration proof','Context policy branch persistence only, projection covered separately']},null,2));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

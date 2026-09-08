// Unchanged upstream Todo reads branches selected by Rust. Fixture history only.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {wrapRegisteredTool} from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';
const path=resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/todo.ts');
function snapshot(file) {
  const result=spawnSync(resolve('target/debug/examples/pi_session_index'),[],{input:JSON.stringify({content:readFileSync(file,'utf8')}),encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}
if(process.argv[2]==='restore') {
  let reads=0;
  const manager={getBranch(){reads++;return snapshot(process.argv[3]).branch;}};
  const host=await createHost(tsBackend(['todo']),{extensionPaths:[path],sessionManager:manager});
  await host.runner.emit({type:'session_start'});
  const registered=host.runner.getAllRegisteredTools().find(t=>t.definition.name==='todo');
  const tool=wrapRegisteredTool(registered,host.runner);
  const restored=await tool.execute('list',{action:'list'});
  assert.deepEqual(restored.details.todos,[{id:1,text:'alpha',done:false}]);
  const continued=await tool.execute('add',{action:'add',text:'gamma'});
  assert.deepEqual(continued.details.todos.map(t=>[t.id,t.text]),[[1,'alpha'],[2,'gamma']]);
  assert.equal(continued.details.nextId,3);assert.ok(reads>0);assert.deepEqual(host.errors,[]);
  console.log(JSON.stringify({pid:process.pid,restored:restored.details,continued:continued.details,rustReads:reads}));
} else {
  const dir=mkdtempSync(join(tmpdir(),'pi-index-todo-'));
  try {
    const file=join(dir,'session.jsonl');
    const entry=(id,parentId,type,extra)=>({id,parentId,type,timestamp:'2026-01-01T00:00:00.000Z',...extra});
    const todos=[{id:1,text:'alpha',done:false}];
    const tool=(list,nextId)=>({role:'toolResult',toolName:'todo',toolCallId:'fixture',content:[{type:'text',text:'fixture result'}],details:{action:'add',todos:list,nextId},isError:false,timestamp:1});
    const entries=[{type:'session',version:3,id:'fixture',cwd:dir,timestamp:'2026-01-01T00:00:00.000Z'},
      entry('alpha',null,'message',{message:tool(todos,2)}),
      entry('beta','alpha','message',{message:tool([...todos,{id:2,text:'beta',done:false}],3)}),
      entry('selected','alpha','custom',{customType:'branch-marker',data:{}})];
    writeFileSync(file,entries.map(e=>JSON.stringify(e)).join('\n')+'\n');
    const before=readFileSync(file);
    const runs=[];
    for(let i=0;i<2;i++) {
      const result=spawnSync(process.execPath,[...process.execArgv,resolve('experiments/pi-index-todo.mjs'),'restore',file],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',TSX_TSCONFIG_PATH:resolve('vendor/pi-mono/tsconfig.json')},timeout:15000});
      assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);assert.notEqual(report.pid,process.pid);runs.push(report);
    }
    assert.notEqual(runs[0].pid,runs[1].pid);for(const run of runs)delete run.pid;
    assert.deepEqual(runs[0],runs[1]);assert.deepEqual(readFileSync(file),before);
    console.log(JSON.stringify({runs,distinctProcesses:true,fixtureFileUnchanged:true,
      scope:'Unchanged Todo session_start reconstructs from Rust getBranch; continues in plugin memory. No TS SessionManager instantiated, no persisted writes or model call.'},null,2));
  } finally {rmSync(dir,{recursive:true,force:true});}
}

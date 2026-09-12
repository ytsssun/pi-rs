// Internal native-owner harness, not the formal CLI. Switching is harness-driven.
import {writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createSessionOwner} from '../prototype/architecture/session-owner.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';
import {createCodingTools} from '../vendor/pi-mono/packages/coding-agent/src/core/tools/index.ts';
const [out,model]=process.argv.slice(2),cwd=join(out,'repo');
const prompts=JSON.parse(readFileSync(join(out,'prompts.json')));
const tools=createCodingTools(cwd);
const owner=await createSessionOwner({path:join(out,'old.jsonl'),cwd,mode:'create',makeHost:manager=>createHost(tsBackend(tools.map(t=>t.name)),{cwd,sessionManager:manager,extensionPaths:[],factories:[pi=>{
 for(const tool of tools) pi.registerTool(tool);
 pi.registerCommand('fresh',{description:'Harness-controlled session replacement',handler:async(_,ctx)=>{await ctx.newSession();}});
}]})});
try {
 await owner.start();
 for(let i=0;i<2;i++) {
  if(i) {
   writeFileSync(join(out,'old-frozen.jsonl'),readFileSync(owner.current.path));
   const command=owner.current.host.runner.getCommand('fresh');
   await command.handler('',owner.current.host.runner.createCommandContext());
  }
  const {manager,host,path}=owner.current;
  const activeTools=host.requestTools().map(t=>t.name);
  for(const name of ['read','write','edit','bash']) assert.ok(activeTools.includes(name),`missing active tool ${name}`);
  writeFileSync(join(out,`tools-${i}.json`),JSON.stringify(activeTools));
  await manager.appendCustomEntry('pi-rs.model.v1',{model});
  const result=await drive({manager,host,prompt:prompts[i],stream:nativeProviderStream({model,streaming:true})});
  writeFileSync(join(out,`turn-${i}.json`),JSON.stringify({result,path},null,2));
  writeFileSync(join(out,`history-${i}.jsonl`),readFileSync(path));
  const code='import maths; assert maths.add(2,3)==5; assert maths.add(-2,3)==1' + (i ? '; assert maths.subtract(7,3)==4; assert maths.subtract(-2,3)==-5' : '');
  const check=spawnSync('python3',['-c',code],{cwd,encoding:'utf8',timeout:10000});
  const testsUnchanged=readFileSync(join(cwd,'test_maths.py'),'utf8')==='from maths import add\nassert add(2,3)==5\n';
  writeFileSync(join(out,`external-${i}.json`),JSON.stringify({code,exit:check.status,stdout:check.stdout,stderr:check.stderr,testsUnchanged}));
  const diff=spawnSync('git',['diff','HEAD'],{cwd,encoding:'utf8'});
  writeFileSync(join(out,`turn-${i}.diff`),diff.stdout);
  assert.equal(check.status,0,`external turn ${i} assertion failed`);
  assert.ok(testsUnchanged,'protected test modified');
 }
 writeFileSync(join(out,'new-path.txt'),owner.current.path);
} finally {await owner.close();}

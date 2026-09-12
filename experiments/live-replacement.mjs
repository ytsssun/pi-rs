// Internal native-owner harness, not the formal CLI. Switching is harness-driven.
import {writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createSessionOwner} from '../prototype/architecture/session-owner.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';
import {createCodingTools} from '../vendor/pi-mono/packages/coding-agent/src/core/tools/index.ts';
const [out,model]=process.argv.slice(2),cwd=join(out,'repo');
const prompts=JSON.parse(readFileSync(join(out,'prompts.json')));
const tools=createCodingTools(cwd);
const owner=await createSessionOwner({path:join(out,'old.jsonl'),cwd,mode:'create',makeHost:manager=>createHost(tsBackend(tools.map(t=>t.name)),{cwd,sessionManager:manager,factories:[pi=>{
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
  await manager.appendCustomEntry('pi-rs.model.v1',{model});
  const result=await drive({manager,host,prompt:prompts[i],stream:nativeProviderStream({model,streaming:true})});
  writeFileSync(join(out,`turn-${i}.json`),JSON.stringify({result,path},null,2));
  writeFileSync(join(out,`history-${i}.jsonl`),readFileSync(path));
 }
 writeFileSync(join(out,'new-path.txt'),owner.current.path);
} finally {await owner.close();}

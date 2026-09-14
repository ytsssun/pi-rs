// Deterministic provider through the real CLI, tools, Rust store and new processes.
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DefaultResourceLoader} from '../vendor/pi-mono/packages/coding-agent/src/core/resource-loader.ts';
import {SettingsManager} from '../vendor/pi-mono/packages/coding-agent/src/core/settings-manager.ts';
import {loadPromptResources} from '../prototype/prompt-resources.mjs';
const root=mkdtempSync(join(tmpdir(),'pi-system-resources-'));
const home=join(root,'home'), cwd=join(root,'project'), agentDir=join(home,'agent');
for(const p of [agentDir,join(cwd,'.pi')])mkdirSync(p,{recursive:true});
const put=(base,name,content)=>writeFileSync(join(base,name),content);
put(cwd,'AGENTS.md','AGENT_SENTINEL');
const expected=join(root,'expected.json'), ext=join(root,'provider.ts');
writeFileSync(ext,`import {readFileSync} from 'node:fs';
export default pi=>{
 const check=prompt=>{const e=JSON.parse(readFileSync(${JSON.stringify(expected)},'utf8'));for(const m of e.present)if(!prompt.includes(m))throw Error('missing '+m);for(const m of e.absent)if(prompt.includes(m))throw Error('unexpected '+m);};
 pi.on('before_agent_start',(e,ctx)=>{check(e.systemPrompt);if(ctx.getSystemPrompt()!==e.systemPrompt)throw Error('getter');return {systemPrompt:e.systemPrompt+' HOOK_SENTINEL'};});
 pi.registerProvider('resource-test',{api:'resource-test',apiKey:'fixture',baseUrl:'http://127.0.0.1:1',models:[{id:'tiny',name:'tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context){check(context.systemPrompt);if(!context.systemPrompt.endsWith('HOOK_SENTINEL'))throw Error('hook lost');
 const done=context.messages.at(-1)?.role==='toolResult';
 const message={role:'assistant',provider:model.provider,model:model.id,api:model.api,timestamp:1,stopReason:done?'stop':'toolUse',content:done?[{type:'text',text:'consumed resource proof'}]:[{type:'toolCall',id:'proof-'+context.messages.length,name:'write',arguments:{path:'proof.txt',content:context.systemPrompt}}],usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}};
 return {async *[Symbol.asyncIterator](){},async result(){return message}};}});};`);
const run=(name,present,absent,resume=false)=>{
 writeFileSync(expected,JSON.stringify({present:['AGENT_SENTINEL',...present],absent}));
 const result=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',join(root,name+'.jsonl'),'--workspace',cwd,'--extension',ext,'--input','write proof',...(resume?['--resume']:['--model','resource-test/tiny'])],{encoding:'utf8',timeout:30000,env:{HOME:home,PATH:process.env.PATH,PI_CODING_AGENT_DIR:agentDir}});
 assert.equal(result.status,0,result.stderr);
 assert.match(readFileSync(join(cwd,'proof.txt'),'utf8'),/HOOK_SENTINEL/);
 assert.match(readFileSync(join(root,name+'.jsonl'),'utf8'),/consumed resource proof/);
};
const oracle=async trust=>{
 const settingsManager=SettingsManager.create(cwd,agentDir,{projectTrusted:trust});
 const loader=new DefaultResourceLoader({cwd,agentDir,settingsManager,noExtensions:true,noSkills:true,noPromptTemplates:true,noThemes:true});
 await loader.reload();
 assert.deepEqual(loadPromptResources({cwd,agentDir,projectTrusted:trust}),{customPrompt:loader.getSystemPrompt(),appendSystemPrompt:loader.getAppendSystemPrompt()[0]});
};
try{
 put(agentDir,'SYSTEM.md','\uFEFFGLOBAL_SYSTEM');put(agentDir,'APPEND_SYSTEM.md','GLOBAL_APPEND');
 put(join(cwd,'.pi'),'SYSTEM.md','PROJECT_SYSTEM');put(join(cwd,'.pi'),'APPEND_SYSTEM.md','PROJECT_APPEND');
 await oracle(false);await oracle(true);

 run('project',['PROJECT_SYSTEM','PROJECT_APPEND'],['GLOBAL_SYSTEM','GLOBAL_APPEND']);
 rmSync(join(cwd,'.pi','APPEND_SYSTEM.md'));
 await oracle(true);
 run('mixed',['PROJECT_SYSTEM','GLOBAL_APPEND'],['GLOBAL_SYSTEM','PROJECT_APPEND']);
 put(join(cwd,'.pi'),'APPEND_SYSTEM.md','PROJECT_APPEND');
 put(join(cwd,'.pi'),'SYSTEM.md','UPDATED_SYSTEM');
 run('project',['UPDATED_SYSTEM','PROJECT_APPEND'],['GLOBAL_SYSTEM','PROJECT_SYSTEM'],true);
 put(join(cwd,'.pi'),'SYSTEM.md','');put(join(cwd,'.pi'),'APPEND_SYSTEM.md','');
 await oracle(true);
 run('empty',['You are'],['GLOBAL_SYSTEM','GLOBAL_APPEND','UPDATED_SYSTEM','PROJECT_APPEND']);
 rmSync(join(cwd,'.pi','SYSTEM.md'));rmSync(join(cwd,'.pi','APPEND_SYSTEM.md'));
 await oracle(true);
 run('fallback',['GLOBAL_SYSTEM','GLOBAL_APPEND'],['PROJECT_SYSTEM']);
 console.log('PASS SYSTEM/APPEND: pinned loader oracle, existing trusted CLI policy and explicit untrusted loader oracle, precedence, BOM, empty shadow, AGENTS + hook, actual tool roundtrip, fresh-process reread; deterministic only');
}finally{rmSync(root,{recursive:true,force:true})}

// Post-switch formal CLI acceptance with actual registered stream, never --fixture.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'pi-switch-provider-')),a=join(d,'a.jsonl'),b=join(d,'b.jsonl'),ext=join(d,'ext.ts');
mkdirSync(join(d,'.pi'));writeFileSync(join(d,'AGENTS.md'),'AGENTS_CANARY');writeFileSync(join(d,'.pi','SYSTEM.md'),'SYSTEM_CANARY');
writeFileSync(ext,`import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {appendFileSync} from 'node:fs';
export default pi=>{
 const marker=randomUUID();
 pi.on('before_agent_start',e=>({systemPrompt:e.systemPrompt+' HOOK_CANARY'}));
 pi.registerCommand('switch',{handler:async(_,ctx)=>ctx.switchSession(process.env.TARGET)});
 pi.registerCommand('fail',{handler:async()=>{throw Error('original command failure')}});
 pi.registerProvider('switch-provider',{api:'switch-api',baseUrl:'http://127.0.0.1:1',apiKey:'test-only',models:[{id:'tiny',name:marker,reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],
 streamSimple(model,context){
  assert.equal(model.name,marker,'model must be resolved from replacement registry');
  for(const expected of ['AGENTS_CANARY','SYSTEM_CANARY','HOOK_CANARY'])assert.ok(context.systemPrompt.includes(expected),expected);
  appendFileSync(process.env.TRACE,JSON.stringify({marker,modelName:model.name})+'\\n');
  const results=context.messages.filter(m=>m.role==='toolResult');
  const seeded=context.messages.filter(m=>m.role==='user').at(-1)?.content==='seed';
  const content=results.length||seeded?[{type:'text',text:'consumed result'}]:[{type:'toolCall',id:'w',name:'write',arguments:{path:'effect.txt',content:'switched provider'}}];
  assert.ok(!results.some(m=>m.isError));
  const message={role:'assistant',api:model.api,provider:model.provider,model:model.id,content,stopReason:results.length||seeded?'stop':'toolUse',timestamp:1};
  return {async *[Symbol.asyncIterator](){},async result(){return message}};
 }});
};`);
const run=(path,args)=>spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',path,'--workspace',d,'--extension',ext,...args],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:d,TARGET:b,TRACE:join(d,'trace')}});
const ok=r=>{assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
try{
 for(const p of [a,b])ok(run(p,['--input','seed','--model','switch-provider/tiny']));
 const original=readFileSync(a),targetPrefix=readFileSync(b);
 const report=ok(run(a,['--resume','--command','switch','--model','switch-provider/tiny','--input','write after switch']));
 assert.equal(report.session,b);assert.equal(report.fixture,false);
 assert.equal(readFileSync(join(d,'effect.txt'),'utf8'),'switched provider');
 assert.deepEqual(readFileSync(a),original);assert.deepEqual(readFileSync(b).subarray(0,targetPrefix.length),targetPrefix);
 assert.match(readFileSync(b,'utf8'),/consumed result/);assert.match(readFileSync(b,'utf8'),/switch-provider\/tiny/);
 const after=readFileSync(b);ok(run(b,['--resume','--input','continue saved model']));assert.deepEqual(readFileSync(b).subarray(0,after.length),after);
 const failed=run(b,['--resume','--command','fail','--model','switch-provider/tiny','--input','must not run']);
 assert.notEqual(failed.status,0);assert.match(failed.stderr,/original command failure/);
 assert.match(readFileSync(b,'utf8'),/original command failure/);
 console.log('PASS post-switch registered provider, fresh model registry identity, prompt resources/hooks, real tool result, old bytes preserved, saved-model process resume, command failure log; deterministic');
}finally{rmSync(d,{recursive:true,force:true});}

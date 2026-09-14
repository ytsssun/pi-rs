// Diagnostic counterexample: intentionally records a compatibility gap, not a gate.
import assert from 'node:assert/strict';
import {Agent} from '../vendor/pi-mono/packages/agent/src/agent.ts';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const response=(content,stopReason)=>({role:'assistant',provider:'disabled-test',model:'tiny',api:'disabled-test',content,stopReason,timestamp:1,usage:{input:1,output:1,cacheRead:0,cacheWrite:0,totalTokens:2,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}});
const call=response([{type:'toolCall',id:'disabled',name:'Calculator',arguments:{expr:'x'}}],'toolUse');
const done=response([{type:'text',text:'done'}],'stop');
let calls=0;
const agent=new Agent({initialState:{model:{id:'tiny',provider:'disabled-test',api:'disabled-test'},tools:[]},streamFn:async()=>{const m=calls++?done:call;return {async *[Symbol.asyncIterator](){},async result(){return m}};}});
await agent.prompt('invoke disabled calculator');
const upstream=agent.state.messages.find(m=>m.role==='toolResult');
assert.equal(upstream.isError,true);assert.equal(upstream.content[0].text,'Tool Calculator not found');
const dir=mkdtempSync(join(tmpdir(),'pi-disabled-tool-'));
try{
 const ext=join(dir,'provider.ts'),session=join(dir,'session.jsonl');
 writeFileSync(ext,`let calls=0;export default pi=>pi.registerProvider('disabled-test',{api:'disabled-test',baseUrl:'http://127.0.0.1:1',apiKey:'fixture',models:[{id:'tiny',name:'Tiny',reasoning:false,input:['text'],cost:{input:0,output:0,cacheRead:0,cacheWrite:0},contextWindow:8192,maxTokens:512}],streamSimple(model,context){if(context.tools.some(t=>t.name==='Calculator'))throw Error('Calculator unexpectedly active');const m=calls++?${JSON.stringify(done)}:${JSON.stringify(call)};return {async *[Symbol.asyncIterator](){},async result(){return m}};}});`);
 const run=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--session',session,'--workspace',dir,'--extension',resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/kimi-deferred-tools.ts'),'--extension',ext,'--model','disabled-test/tiny','--input','invoke disabled calculator'],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir}});
 assert.equal(run.status,0,run.stderr);
 const native=readFileSync(session,'utf8').trim().split('\n').map(JSON.parse).find(e=>e.message?.role==='toolResult').message;
 console.log(JSON.stringify({upstream:{isError:upstream.isError,content:upstream.content},native:{isError:native.isError,content:native.content},parity:upstream.isError===native.isError}));
}finally{rmSync(dir,{recursive:true,force:true})}

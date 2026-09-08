import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-stream-runtime-'));
const path=join(dir,'session.jsonl');
const manager=await createBackend({path});
const model=process.env.PI_RS_MODEL||'gpt-5.4-mini';
const executed=[];
try {
 const host=await createHost(tsBackend(['echo']),{sessionManager:manager,factories:[pi=>pi.registerTool({name:'echo',label:'Echo',description:'Return the supplied text',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']},execute:async(id,args)=>{executed.push({id,args});return {content:[{type:'text',text:args.text}],details:{}};}})]});
 const result=await drive({manager,host,prompt:'Call echo once with text STREAM_RUNTIME_OK. After receiving its result, reply briefly without further tool calls.',stream:nativeProviderStream({model,streaming:true,reasoningEffort:'none'})});
 assert.equal(result.action.type,'done');
 assert.equal(executed.length,1);
 assert.equal(executed[0].args.text,'STREAM_RUNTIME_OK');
 const messages=manager.snapshot().branch.filter(e=>e.type==='message').map(e=>e.message);
 assert.ok(messages.some(m=>m.role==='toolResult'&&m.toolCallId===executed[0].id&&m.content[0].text==='STREAM_RUNTIME_OK'));
 assert.equal(messages.at(-1).role,'assistant');
 assert.equal(messages.at(-1).stopReason,'stop');
 console.log(JSON.stringify({verified:true,model,executed:executed.length,modelTurns:result.trace.filter(e=>e.type==='model_start').length,session:path,usage:messages.filter(m=>m.role==='assistant').map(m=>m.usage),humanInterventions:0}));
} finally {await manager.close();}

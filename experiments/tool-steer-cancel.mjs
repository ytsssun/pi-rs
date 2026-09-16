import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const dir=mkdtempSync(join(tmpdir(),'pi-steer-cancel-'));const manager=await createBackend({path:join(dir,'session.jsonl')});const controller=new AbortController();let host,calls=0;
try{
 host=await createHost(tsBackend(['work']),{sessionManager:manager,extensionPaths:[],factories:[pi=>pi.registerTool({name:'work',label:'Work',description:'queue then abort',parameters:{type:'object',properties:{}},execute:async()=>{host.actions.sendUserMessage('retained',{deliverAs:'steer'});controller.abort();return {content:[{type:'text',text:'completed effect'}]};}})]});
 await drive({manager,host,prompt:'initial',signal:controller.signal,stream:async()=>{calls++;const message={role:'assistant',content:[{type:'toolCall',name:'work',id:'w',arguments:{}}],stopReason:'toolUse',timestamp:1};return {async *[Symbol.asyncIterator](){},async result(){return message;}};}});
 assert.equal(calls,1);assert.deepEqual(manager.pendingUsers().map(q=>q.message),['retained']);
 const messages=manager.getEntries().filter(e=>e.type==='message').map(e=>e.message);
 assert.deepEqual(messages.filter(m=>m.role==='user').map(m=>m.content),['initial']);
 assert.equal(messages.filter(m=>m.role==='toolResult'&&m.toolCallId==='w').length,1);
 assert.equal(messages.at(-1).stopReason,'aborted');
 console.log('PASS tool steer cancellation retains queue and tool result without another provider request');
}finally{manager.close();rmSync(dir,{recursive:true,force:true});}

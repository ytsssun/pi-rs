import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
const results=[];
for(const failure of [false,true,'undefined']) {
  const dir=mkdtempSync(join(tmpdir(),'pi-update-barrier-'));
  const manager=await createBackend({path:join(dir,'session.json')});
  try {
    let late,release;
    const gate=new Promise(r=>release=r), order=[];
    const host=await createHost(tsBackend(['updates']),{sessionManager:manager,factories:[pi=>pi.registerTool({name:'updates',label:'updates',description:'fixture',parameters:{type:'object',properties:{}},execute:async(_id,_args,_signal,onUpdate)=>{
      late=onUpdate; onUpdate({content:[],details:{}}); order.push('tool-return');
      return {content:[],details:{}};
    }})]});
    let modelCalls=0;
    const stream=async()=>{
      modelCalls++;const message=modelCalls===1?{role:'assistant',content:[{type:'toolCall',id:'u',name:'updates',arguments:{}}],stopReason:'toolUse'}:{role:'assistant',content:[],stopReason:'stop'};
      return {async *[Symbol.asyncIterator](){},async result(){return message;}};
    };
    const running=drive({manager,host,prompt:'fixture',stream,propagateUpdateErrors:true,onToolUpdate:async()=>{order.push('sink-start');await gate;order.push('sink-end');if(failure)throw failure==='undefined'?undefined:Error('sink failed');}});
    // Observe rejection before releasing the deliberately blocked sink.
    const completion=failure?running.then(()=>assert.fail('expected sink rejection'),error=>{if(failure==='undefined')assert.equal(error,undefined);else assert.match(error.message,/sink failed/);}):running;
    await new Promise(r=>setImmediate(r));
    assert.deepEqual(order,['sink-start','tool-return']);
    assert.equal(modelCalls,1,'must not continue while non-awaited update is pending');
    assert.equal(manager.snapshot().branch.filter(e=>e.message?.role==='toolResult').length,0);
    release();await completion;
    assert.equal(modelCalls,failure?1:2);
    const before=[...order];assert.equal(late({content:[],details:{}}),undefined);assert.deepEqual(order,before,'late updates ignored');
    results.push({failure,modelCalls,order,lateIgnored:true});
  } finally {await manager.close();rmSync(dir,{recursive:true,force:true});}
}
console.log(JSON.stringify({verified:true,fixture:true,cases:results}));

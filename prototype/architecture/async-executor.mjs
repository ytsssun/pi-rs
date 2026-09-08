// Rust owns update acceptance and the completion barrier. JS retains tool closures,
// signal objects and event sinks. One temporary kernel per invocation: no recovery.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {createInterface} from 'node:readline';
export const traces=[];
export async function executePreparedRust(prepared,signal,emit) {
  const dir=mkdtempSync(join(tmpdir(),'pi-async-'));
  const socket=join(dir,'core.sock');
  const binary=resolve('target/debug/examples/async_kernel');
  const child=spawn(binary,['serve',socket],{env:{PATH:'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');
  let stderr='';child.stderr.on('data',data=>stderr+=data);
  const lines=createInterface({input:child.stdout})[Symbol.asyncIterator]();
  const trace=[];traces.push(trace);
  let finished=false;
  let deliveryError;
  let deliveryRejected=false;
  function rpc(request) {
    const result=spawnSync(binary,['rpc',socket,JSON.stringify(request)],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:3000});
    assert.equal(result.status,0,result.stderr);
    const response=JSON.parse(result.stdout);assert.ok(!response.error,response.error);
    trace.push({request,response:response.result});return response.result;
  }
  async function next() {
    let timer;
    try {
      const item=await Promise.race([lines.next(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('kernel deadline '+stderr)),5000);})]);
      assert.equal(item.done,false,stderr);return JSON.parse(item.value);
    } finally {clearTimeout(timer);}
  }
  try {
    assert.equal((await next()).type,'ready');rpc({op:'start'});
    assert.equal((await next()).type,'execute');
    // Mirrors upstream error-result conversion, not a universal error serializer.
    const failure=e=>({result:{content:[{type:'text',text:e instanceof Error?e.message:String(e)}],details:{}},isError:true});
    let outcome;
    try {
      const result=await prepared.tool.execute(prepared.toolCall.id,prepared.args,signal,partialResult=>{
        if(finished)return;
        const id=rpc({op:'update'});if(id===null)return;
        const event={type:'tool_execution_update',toolCallId:prepared.toolCall.id,toolName:prepared.toolCall.name,args:prepared.toolCall.arguments,partialResult};
        let delivery;
        try {delivery=emit(event);} catch(error) {rpc({op:'ack',id});throw error;}
        Promise.resolve(delivery).then(()=>{if(!finished)rpc({op:'ack',id});},error=>{
          if(finished)return;
          if(!deliveryRejected){deliveryError=error;deliveryRejected=true;}
          rpc({op:'reject',id});
        });
      });
      outcome={result,isError:false};
    } catch(error) {outcome=failure(error);}
    rpc({op:'settle',outcome});
    const done=await next();assert.equal(done.type,'done');finished=true;
    if(deliveryRejected)throw deliveryError;
    return done.outcome;
  } finally {
    finished=true;
    child.kill('SIGTERM');await exited;
    rmSync(dir,{recursive:true,force:true});
  }
}

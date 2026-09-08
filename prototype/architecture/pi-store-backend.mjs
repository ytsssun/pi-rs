// Persistent Rust owner, temporary synchronous RPC helpers. Test transport only.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createInterface} from 'node:readline';
export async function createBackend({path,cwd=process.cwd(),mode='create'}) {
  const directory=mkdtempSync(join(tmpdir(),'pi-w-'));const socket=join(directory,'s');
  const binary=resolve('target/debug/examples/pi_session_store');
  const child=spawn(binary,['serve',socket],{env:{PATH:'/usr/bin:/bin'},stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');let stderr='';child.stderr.on('data',chunk=>stderr+=chunk);
  const trace=[];
  const close=async()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');await exited;rmSync(directory,{recursive:true,force:true});};
  function rpc(request) {
    const result=spawnSync(binary,['rpc',socket,JSON.stringify(request)],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000});
    assert.equal(result.status,0,result.stderr||String(result.error));const reply=JSON.parse(result.stdout);trace.push({request,reply});
    if(reply.error)throw Error(reply.error);return reply.result;
  }
  try {
    const lines=createInterface({input:child.stdout});let timer;
    try {const [line]=await Promise.race([once(lines,'line'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('server readiness deadline '+stderr)),5000);})]);assert.equal(line,'ready');}
    finally {clearTimeout(timer);lines.close();}
    rpc({op:mode,path,header:{type:'session',version:3,id:'fixture-session',cwd,timestamp:'2026-01-01T00:00:00.000Z'}});
    const snapshot=()=>rpc({op:'snapshot'});
    let next=1;
    function append(payload) {
      const ids=new Set(snapshot().entries.map(e=>e.id));while(ids.has('e'+next))next++;
      return rpc({op:'append',entry:{...payload,id:'e'+next++,timestamp:'2026-01-01T00:00:00.000Z'}});
    }
    return {trace,snapshot,appendRaw:append,
      appendMessage:message=>append({type:'message',message}),
      appendCustomEntry:(customType,data)=>append({type:'custom',customType,data}),
      branch:id=>rpc({op:'branch',leaf:id}),resetLeaf:()=>rpc({op:'branch',leaf:null}),
      getBranch:()=>snapshot().branch,getEntries:()=>snapshot().entries,getSessionFile:()=>path,close};
  } catch(error) {await close();throw error;}
}
export {createBackend as createStoreBackend};

// Same Rust module as helper adapter; synchronous in-process calls, per-env handles.
import {createRequire} from 'node:module';
const binding=createRequire(import.meta.url)('../../target/native-session.node');
export const request=payload=>{const response=JSON.parse(binding.request(JSON.stringify(payload)));if(response.error)throw Error(response.error);return response.result;};
export async function createBackend({path,cwd=process.cwd(),mode='create'}) {
  const handle=request({op:mode,path,header:{type:'session',version:3,id:'fixture-session',cwd,timestamp:'2026-01-01T00:00:00.000Z'}});
  const call=payload=>request({...payload,handle});
  const snapshot=()=>call({op:'snapshot'});
  let next=1;
  function append(payload) {
    const ids=new Set(snapshot().entries.map(e=>e.id));while(ids.has('e'+next))next++;
    return call({op:'append',entry:{...payload,id:'e'+next++,timestamp:'2026-01-01T00:00:00.000Z'}});
  }
  return {handle,snapshot,appendRaw:append,
    // Synchronous compatibility methods required by unchanged Pi tool context.
    getSessionId:()=>snapshot().header?.id,
    setContextPolicy:limit=>call({op:'runtime',event:'policy',limit:limit===undefined?null:limit}),
    getCwd:()=>cwd,
    appendMessage:message=>append({type:'message',message}),appendCustomEntry:(customType,data)=>append({type:'custom',customType,data}),
    branch:id=>call({op:'branch',leaf:id}),resetLeaf:()=>call({op:'branch',leaf:null}),
    getBranch:()=>snapshot().branch,getEntries:()=>snapshot().entries,getSessionFile:()=>path,close:()=>call({op:'close'})};
}
export {createBackend as createStoreBackend};

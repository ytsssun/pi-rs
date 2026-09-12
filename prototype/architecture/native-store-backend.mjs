// Same Rust module as helper adapter; synchronous in-process calls, per-env handles.
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const binding=createRequire(import.meta.url)('../../target/native-session.node');
export const request=payload=>{const response=JSON.parse(binding.request(JSON.stringify(payload)));if(response.error)throw Error(response.error);return response.result;};
export async function createBackend({path,cwd=process.cwd(),mode='create',parentSession}) {
  const handle=request({op:mode,path,header:{type:'session',version:3,id:randomUUID(),cwd,timestamp:new Date().toISOString(),...(parentSession === undefined ? {} : {parentSession})}});
  const call=payload=>request({...payload,handle});
  const snapshot=()=>call({op:'snapshot'});
  let next=1;
  function append(payload) {
    const ids=new Set(snapshot().entries.map(e=>e.id));while(ids.has('e'+next))next++;
    return call({op:'append',entry:{...payload,id:'e'+next++,timestamp:new Date().toISOString(),...(parentSession === undefined ? {} : {parentSession})}});
  }
  return {handle,snapshot,appendRaw:append,
    // Synchronous compatibility methods required by unchanged Pi tool context.
    getSessionId:()=>snapshot().header?.id,
    setContextPolicy:limit=>call({op:'runtime',event:'policy',limit:limit===undefined?null:limit}),
    getCwd:()=>cwd,
    appendCustomMessageEntry:(customType,content,display,details)=>append({type:'custom_message',customType,content,display,details}),
    appendMessage:message=>append({type:'message',message}),appendCustomEntry:(customType,data)=>append({type:'custom',customType,data}),
    branch:id=>call({op:'branch',leaf:id}),resetLeaf:()=>call({op:'branch',leaf:null}),appendCompaction:(summary,firstKeptEntryId,tokensBefore)=>call({op:'append_compaction',id:`c${Date.now()}`,timestamp:new Date().toISOString(),summary,firstKeptEntryId,tokensBefore}),
    getBranch:()=>snapshot().branch,getEntries:()=>snapshot().entries,getSessionFile:()=>path,close:()=>call({op:'close'})};
}
export {createBackend as createStoreBackend};

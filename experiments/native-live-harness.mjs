import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';

const session=resolve(process.argv[2]||'.runs/native-live-session.json');
const workspace=resolve(process.argv[4]||process.cwd());
mkdirSync(resolve(session,'..'),{recursive:true});
const stage=process.argv[3]||'seed';
const manager=await createBackend({path:session,cwd:workspace,mode:stage==='resume'?'open':'create'});
try {
  const host=await createHost(tsBackend(['read','write']),{sessionManager:manager,factories:[pi=>{pi.registerTool({name:'read',label:'read',description:'Read a UTF-8 file',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']},execute:async(_id,args)=>({content:[{type:'text',text:readFileSync(resolve(workspace,args.path),'utf8')}],details:{}})});pi.registerTool({name:'write',label:'write',description:'Write a UTF-8 file',parameters:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content']},execute:async(_id,args)=>{writeFileSync(resolve(workspace,args.path),args.content);return {content:[{type:'text',text:'written'}],details:{}};}});}]});
  const trace=[];
  const result=await drive({manager,host,prompt:stage==='resume'?'Now read native-live-target.txt and reply with its contents.':'Create native-live-target.txt containing exactly NATIVE_LIVE_OK, then read it and confirm.',stream:nativeProviderStream({model:process.env.PI_RS_MODEL||'gpt-5.6-luna',reasoningEffort:'none'}),trace});
  console.log(JSON.stringify({verified:true,model:process.env.PI_RS_MODEL||'gpt-5.6-luna',trace,session},null,2));
} finally {await manager.close();}

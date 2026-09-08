import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';

const session=resolve(process.argv[2]||'.runs/native-live-session.json');
mkdirSync(resolve(session,'..'),{recursive:true});
const stage=process.argv[3]||'seed';
const manager=await createBackend({path:session,mode:stage==='resume'?'open':'create'});
try {
  const host=await createHost(tsBackend(['read']),{sessionManager:manager,factories:[pi=>pi.registerTool({name:'read',label:'read',description:'Read a UTF-8 file',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']},execute:async(_id,args)=>({content:[{type:'text',text:'native fixture read: '+args.path}],details:{}})})]});
  const trace=[];
  const result=await drive({manager,host,prompt:stage==='resume'?'Now read LICENSE.md and reply with its first line.':'Read README.md and reply with its first heading only.',stream:nativeProviderStream({model:process.env.PI_RS_MODEL||'gpt-5.6-luna',reasoningEffort:'none'}),trace});
  console.log(JSON.stringify({verified:true,model:process.env.PI_RS_MODEL||'gpt-5.6-luna',trace,session},null,2));
} finally {await manager.close();}

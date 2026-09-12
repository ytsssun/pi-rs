import {renameSync} from 'node:fs';
import {dirname, join, basename} from 'node:path';
import {createBackend} from './native-store-backend.mjs';
import {createHost} from '../real-plugin-host.mjs';
import {drive} from './native-runtime-driver.mjs';

export async function createRuntimeOwner({path,cwd=process.cwd(),factories=[],extensionPaths=[] ,backend=undefined}) {
  let manager=backend ?? await createBackend({path,cwd});
  let host;
  let switching=false;
  const lifecycle=[];
  const build=async()=>{ host=await createHost({getActiveTools:()=>[],setActiveTools:()=>{}},{cwd,sessionManager:manager,factories,extensionPaths,commandActions:{newSession:async()=>{
    if(switching) throw Error('newSession already in progress');
    switching=true;
    try { const veto=await host.runner.emit({type:'session_before_switch'}); if(veto===false) return false;
      await host.runner.emit({type:'session_shutdown',reason:'new_session'}); lifecycle.push('shutdown');
      const old=manager; const next=join(dirname(path), `${basename(path,'.jsonl')}-${Date.now()}.jsonl`); manager=await createBackend({path:next,cwd}); await old.close(); await build(); await host.runner.emit({type:'session_start',reason:'startup'}); lifecycle.push('startup'); return true;
    } finally { switching=false; }
  }}}); return host;};
  await build();
  return {get manager(){return manager},get host(){return host},lifecycle,drive:opts=>drive({...opts,manager,host}),close:()=>manager.close()};
}

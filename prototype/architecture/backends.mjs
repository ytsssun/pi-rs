// Explicit experiment adapters, not production Pi compatibility implementations.
import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

export function createBackend(kind,path,{init=true}={}) {
  const pids=[];
  const calls=[];
  const initial = () => ({active_tools:[],session:{version:1,workspace:process.cwd(),messages:[{role:'user',content:'compatibility probe'}],usage:[],context_tool_chars:null,in_flight:null,context_policy_changes:[]}});
  const project=(messages,limit)=>messages.map(m=>m.role==='tool'&&limit!==null&&Array.from(m.content).length>limit ? {...m,content:Array.from(m.content).slice(0,limit).join('')+'\n[context view truncated; canonical result retained]'}:structuredClone(m));
  function call(request) {
    calls.push(structuredClone(request));
    if(kind==='rust') {
      const child=spawnSync(resolve('target/debug/examples/compat_kernel'),[path],{
        input:JSON.stringify(request),encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:5000,
      });
      if(child.status!==0) throw Error(`Rust probe failed (${child.status}): ${child.stderr}`);
      const response=JSON.parse(child.stdout);pids.push(response.pid);return response.result;
    }
    if(kind!=='ts')throw Error('unknown backend');
    let state;
    if(request.op==='init') {
      if(existsSync(path))throw Error('state exists');
      state=initial();
    } else state=JSON.parse(readFileSync(path,'utf8'));
    let changed=false,result=null;
    switch(request.op) {
      case 'init':changed=true;break;
      case 'get_tools':result=state.active_tools;break;
      case 'set_tools':state.active_tools=request.names;changed=true;break;
      case 'seed_context':state.session.messages=request.messages;changed=true;break;
      case 'set_policy': {
        const old=state.session.context_tool_chars;
        if(old!==request.limit){state.session.context_policy_changes.push({after_messages:state.session.messages.length,previous_tool_chars:old,tool_chars:request.limit});state.session.context_tool_chars=request.limit;changed=true;}
        break;
      }
      case 'context':result=project(request.messages ?? state.session.messages,state.session.context_tool_chars);break;
      case 'snapshot':result=state;break;
      default:throw Error('unknown operation');
    }
    if(changed){writeFileSync(path+'.tmp',JSON.stringify(state,null,2));renameSync(path+'.tmp',path);}
    return structuredClone(result);
  }
  if(init)call({op:'init'});
  return {kind,path,pids,calls,call,
    getActiveTools:()=>call({op:'get_tools'}),
    setActiveTools:names=>{call({op:'set_tools',names});},
    snapshot:()=>call({op:'snapshot'}),
    seedContext:messages=>call({op:'seed_context',messages}),
    setPolicy:limit=>call({op:'set_policy',limit}),
    context:()=>call({op:'context'}),
    projectMessages:messages=>call({op:'context',messages}),
  };
}

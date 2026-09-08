import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {createHost,tsBackend} from '../prototype/real-plugin-host.mjs';
import {drive} from '../prototype/architecture/native-runtime-driver.mjs';
import {nativeProviderStream} from '../prototype/architecture/native-provider-stream.mjs';

const session=resolve(process.argv[2]||'.runs/native-live-session.json');
const workspace=resolve(process.argv[4]||process.cwd());
mkdirSync(resolve(session,'..'),{recursive:true});
const stage=process.argv[3]||'seed';
const manager=await createBackend({path:session,cwd:workspace,mode:(stage==='resume'||stage==='parallel-resume')?'open':'create'});
try {
  const host=await createHost(tsBackend(['read','write','edit','bash']),{sessionManager:manager,factories:[pi=>{pi.registerTool({name:'read',label:'read',description:'Read a UTF-8 file',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']},execute:async(_id,args)=>({content:[{type:'text',text:readFileSync(resolve(workspace,args.path),'utf8')}],details:{}})});pi.registerTool({name:'write',label:'write',description:'Write a UTF-8 file',parameters:{type:'object',properties:{path:{type:'string'},content:{type:'string'}},required:['path','content']},execute:async(_id,args)=>{writeFileSync(resolve(workspace,args.path),args.content);return {content:[{type:'text',text:'written'}],details:{}};}});pi.registerTool({name:'edit',label:'edit',description:'Replace text',parameters:{type:'object',properties:{path:{type:'string'},oldText:{type:'string'},newText:{type:'string'}},required:['path','oldText','newText']},execute:async(_id,args)=>{const p=resolve(workspace,args.path);const text=readFileSync(p,'utf8');if(text.split(args.oldText).length!==2)throw Error('oldText must be unique');writeFileSync(p,text.replace(args.oldText,args.newText));return {content:[{type:'text',text:'edited'}],details:{}};}});pi.registerTool({name:'bash',label:'bash',description:'Run a test command',parameters:{type:'object',properties:{command:{type:'string'}},required:['command']},execute:async(_id,args)=>{try{return {content:[{type:'text',text:execFileSync('/bin/sh',['-c',args.command],{cwd:workspace,encoding:'utf8',timeout:10000})}],details:{}};}catch(e){throw Error(`exit ${e.status??1}: ${e.stdout??''}${e.stderr??''}`);}}});}]});
  const trace=[];
  const prompt=stage==='parallel-resume'?'Read parallel-a.txt and parallel-b.txt and confirm both contain exactly PARALLEL_OK.':stage==='parallel'?'Create files parallel-a.txt and parallel-b.txt, each containing exactly PARALLEL_OK, then read both and report success.':stage==='resume'?'Now edit native-live-target.txt, then run `test "$(cat native-live-target.txt)" = NATIVE_LIVE_EDITED` with bash and report success.':'Create native-live-target.txt containing exactly NATIVE_LIVE_OK, then edit it to NATIVE_LIVE_EDITED and run a bash test proving the exact content.';
  const result=await drive({manager,host,parallel:stage==='parallel',prompt,stream:nativeProviderStream({model:process.env.PI_RS_MODEL||'gpt-5.4-mini',reasoningEffort:'none',streaming:true}),trace});
  const expected=stage==='resume'?'NATIVE_LIVE_EDITED':'NATIVE_LIVE_OK';
  const actual=readFileSync(resolve(workspace,'native-live-target.txt'),'utf8').trim();
  if(stage==='resume' && actual!==expected) throw Error(`external assertion failed: expected ${expected}, got ${actual}`);
  console.log(JSON.stringify({verified:true,model:process.env.PI_RS_MODEL||'gpt-5.4-mini',trace,externalCheck:{expected,actual,passed:actual===expected},session},null,2));
} finally {await manager.close();}

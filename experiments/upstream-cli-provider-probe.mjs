// Deterministic HTTP provider fixture: original CLI/provider code, not a live model.
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
const installedIndex=process.argv.indexOf('--binary');
const installed=installedIndex>=0?process.argv[installedIndex+1]:undefined;
const image=process.argv.includes('--image');
const customMessages=process.argv.includes('--custom-messages');
const todo=process.argv.includes('--todo');
const todoExtension=fileURLToPath(new URL('../vendor/pi-mono/packages/coding-agent/examples/extensions/todo.ts',import.meta.url));
const baseline = process.argv.includes('--upstream');
const dir = mkdtempSync(join(tmpdir(), 'pi-cli-provider-'));
const cli = fileURLToPath(new URL('../vendor/pi-mono/packages/coding-agent/dist/cli.js', import.meta.url));
const preload = fileURLToPath(new URL('./upstream-cli-preload.mjs', import.meta.url));
const session = join(dir, 'canonical.jsonl');
const imageData='data:image/png;base64,aGVsbG8=';
const customExtension=join(dir,'custom-messages.mjs');
if(customMessages)writeFileSync(customExtension,`export default function(pi){
 pi.on('session_start',()=>pi.sendMessage({customType:'queued-context',content:'queued custom context',display:false,details:{source:'session_start'}},{deliverAs:'nextTurn'}));
 pi.on('before_agent_start',()=>({message:{customType:'hook-context',content:'hook custom context',display:true,details:{source:'before_agent_start'}}}));
}`);

const requests = [];
let stage = 0;
let stageCalls = 0;
const server = createServer(async (req, res) => {
 try {
  assert.equal(req.url, '/v1/chat/completions');
  assert.equal(req.method, 'POST');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks));
  requests.push({stage, body});
  writeFileSync(join(dir, 'requests.json'), JSON.stringify(requests, null, 2));
  if(image){const wire=JSON.stringify(body.messages);assert.ok(wire.includes(imageData));}
  if(customMessages){const wire=JSON.stringify(body.messages);assert.ok(wire.includes('queued custom context'));assert.ok(wire.indexOf('queued custom context')<wire.indexOf('hook custom context'));}
  assert.equal(body.model, 'fixture-model');
  assert.equal(body.stream, true);
  assert.ok(body.tools.some(t => t.function.name === (todo?'todo':'edit')));
  assert.ok(++stageCalls <= 2, 'Unexpected provider retry or extra turn');
  const tool = stageCalls === 1;
  const delta = tool ? {role:'assistant', tool_calls:[{index:0,id:`edit-${stage}`,type:'function',function:{name:todo?'todo':'edit',arguments:JSON.stringify(todo?(stage?{action:'toggle',id:1}:{action:'add',text:'preserved todo'}):{path:'subject.txt',edits:[{oldText:stage ? 'after':'before',newText:stage ? 'resumed':'after'}]})}}]} : {role:'assistant',content:'fixture complete'};
  res.writeHead(200, {'Content-Type':'text/event-stream'});
  const send = (choices, usage) => res.write(`data: ${JSON.stringify({id:`chat-${requests.length}`,object:'chat.completion.chunk',created:1,model:'fixture-model',choices,...(usage?{usage}:{})})}\n\n`);
  send([{index:0,delta,finish_reason:null}]);
  send([{index:0,delta:{},finish_reason:tool?'tool_calls':'stop'}]);
  send([], {prompt_tokens:10,completion_tokens:5,total_tokens:15});
  res.end('data: [DONE]\n\n');
 } catch (error) {
  writeFileSync(join(dir, 'server-error.txt'), String(error.stack));
  res.writeHead(500); res.end(String(error));
 }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const home = join(dir, 'home');
const agentHome = join(home, '.pi', 'agent');
mkdirSync(agentHome, {recursive:true});
writeFileSync(join(agentHome, 'models.json'), JSON.stringify({providers:{'fixture-http':{baseUrl:`http://127.0.0.1:${server.address().port}/v1`,api:'openai-completions',apiKey:'fixture-not-a-secret',models:[{id:'fixture-model',name:'Fixture',reasoning:false,input:['text'],contextWindow:128000,maxTokens:1024}]}}}));
writeFileSync(join(dir, 'subject.txt'), 'before\n');
let priorBytes;
let priorMessages;
try {
 for (stage = 0; stage < 2; stage++) {
  stageCalls = 0;
  const trace = join(dir, `trace-${stage}.json`);
  const args = ['--experimental-strip-types',...(!baseline?['--import',preload]:[]),cli,'--print','--mode','json','--no-extensions',...(todo?['--extension',todoExtension]:[]),...(customMessages?['--extension',customExtension]:[]),'--no-skills','--no-prompt-templates','--no-themes','--provider','fixture-http','--model','fixture-model','--session',session,'--thinking','off',stage?'Continue the previous edit.':'Edit subject.txt.'];
  const result = await new Promise((resolve, reject) => {
   const launchArgs=installed?['--experimental-upstream-core',...args.slice(args.indexOf(cli)+1)]:args;
   const child = spawn(installed??process.execPath, launchArgs, {cwd:dir,env:{PATH:process.env.PATH,HOME:home,PI_RS_PROBE_SCRATCH:join(dir,`scratch-${stage}.jsonl`),PI_RS_CORE_TRACE:trace,PI_RS_PROBE_TRACE:trace}});
   child.stdin.end(); // CLI reads piped stdin before executing the supplied prompt.
   let stdout = '', stderr = '';
   child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
   const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
   child.on('error', e => {clearTimeout(timer); reject(e);});
   child.on('close', (code, signal) => {clearTimeout(timer); resolve({code,signal,stdout,stderr});});
  });
  writeFileSync(join(dir, `process-${stage}.json`), JSON.stringify(result,null,2));
  assert.equal(result.code, 0, `${result.stderr}\nArtifacts: ${dir}`);
  assert.equal(stageCalls, 2, 'Must use the real HTTP provider stack twice per process');
  const events=result.stdout.trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(e=>e.type==='message_update'?e.assistantMessageEvent.type:e.type),[
   'session','agent_start','turn_start','message_start','message_end',...(customMessages?['message_start','message_end','message_start','message_end']:[]),'message_start',
   'toolcall_start','toolcall_delta','toolcall_end','message_end','tool_execution_start','tool_execution_end',
   'message_start','message_end','turn_end','turn_start','message_start','text_start','text_delta','text_end',
   'message_end','turn_end','agent_end','agent_settled']);
  assert.equal(events.find(e=>e.assistantMessageEvent?.type==='text_delta').assistantMessageEvent.delta,'fixture complete');
  assert.equal(events.filter(e=>e.type==='message_end').length,customMessages?6:4,'Partials must not duplicate final messages');
  assert.equal(readFileSync(join(dir,'subject.txt'),'utf8'), todo?'before\n':stage?'resumed\n':'after\n');
  const bytes = readFileSync(session,'utf8');
  const entries=bytes.trim().split('\n').map(JSON.parse);
  if(customMessages){const custom=entries.filter(e=>e.type==='custom_message');assert.deepEqual(custom.map(e=>[e.customType,e.content,e.display,e.details.source]),Array.from({length:stage+1},()=>[['queued-context','queued custom context',false,'session_start'],['hook-context','hook custom context',true,'before_agent_start']]).flat());}
  const messages = entries.filter(e=>e.type==='message').map(e=>e.message);
  assert.equal(messages.length, stage?8:4);
  if(todo){const result=messages.filter(m=>m.role==='toolResult').at(-1);assert.equal(result.toolName,'todo');assert.equal(result.isError,false);assert.deepEqual(result.details.todos,[{id:1,text:'preserved todo',done:stage===1}]);assert.equal(result.details.nextId,2);}
  assert.deepEqual(messages.slice(stage*4).map(m=>m.role), ['user','assistant','toolResult','assistant']);
  if(stage) {
   assert.ok(bytes.startsWith(priorBytes),'Canonical bytes must retain original prefix');
   assert.deepEqual(messages.slice(0,4),priorMessages);
   const context = requests.find(r=>r.stage===1).body.messages;
   assert.equal(context.filter(m=>m.role==='user').length,customMessages?6:2);
   assert.ok(context.some(m=>m.role==='tool' && m.tool_call_id==='edit-0'),'Restored tool result must reach HTTP provider');
   assert.ok(context.some(m=>m.role==='assistant' && m.content==='fixture complete'),'Restored final assistant must reach HTTP provider');
  } else {priorBytes=bytes;priorMessages=messages;}
  if(!baseline) {
   const steps=JSON.parse(readFileSync(trace,'utf8'));
   assert.equal(steps.filter(s=>s.output==='model').length,2);
   assert.ok(steps.some(s=>s.output==='tool'));
  }
 }
 console.log(JSON.stringify({status:'PASS',engine:baseline?'upstream':'rust',extension:todo?'unchanged upstream todo.ts':customMessages?'synthetic message hooks':image?'image fixture':null,scope:'Original CLI + upstream HTTP provider, deterministic SSE fixture, two processes; not live-model validation',requests:requests.length,canonicalMessages:8,dir}));
} finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }

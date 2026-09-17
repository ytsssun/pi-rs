// Deterministic HTTP provider fixture: original CLI/provider code, not a live model.
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
const baseline = process.argv.includes('--upstream');
const dir = mkdtempSync(join(tmpdir(), 'pi-cli-provider-'));
const cli = fileURLToPath(new URL('../vendor/pi-mono/packages/coding-agent/dist/cli.js', import.meta.url));
const preload = fileURLToPath(new URL('./upstream-cli-preload.mjs', import.meta.url));
const session = join(dir, 'canonical.jsonl');
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
  assert.equal(body.model, 'fixture-model');
  assert.equal(body.stream, true);
  assert.ok(body.tools.some(t => t.function.name === 'edit'));
  assert.ok(++stageCalls <= 2, 'Unexpected provider retry or extra turn');
  const tool = stageCalls === 1;
  const delta = tool ? {role:'assistant', tool_calls:[{index:0,id:`edit-${stage}`,type:'function',function:{name:'edit',arguments:JSON.stringify({path:'subject.txt',edits:[{oldText:stage ? 'after':'before',newText:stage ? 'resumed':'after'}]})}}]} : {role:'assistant',content:'fixture complete'};
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
  const args = ['--experimental-strip-types',...(!baseline?['--import',preload]:[]),cli,'--print','--mode','json','--no-extensions','--no-skills','--no-prompt-templates','--no-themes','--provider','fixture-http','--model','fixture-model','--session',session,'--thinking','off',stage?'Continue the previous edit.':'Edit subject.txt.'];
  const result = await new Promise((resolve, reject) => {
   const child = spawn(process.execPath, args, {cwd:dir,env:{PATH:process.env.PATH,HOME:home,PI_RS_PROBE_SCRATCH:join(dir,`scratch-${stage}.jsonl`),PI_RS_PROBE_TRACE:trace}});
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
  assert.equal(readFileSync(join(dir,'subject.txt'),'utf8'), stage?'resumed\n':'after\n');
  const bytes = readFileSync(session,'utf8');
  const messages = bytes.trim().split('\n').map(JSON.parse).filter(e=>e.type==='message').map(e=>e.message);
  assert.equal(messages.length, stage?8:4);
  assert.deepEqual(messages.slice(stage*4).map(m=>m.role), ['user','assistant','toolResult','assistant']);
  if(stage) {
   assert.ok(bytes.startsWith(priorBytes),'Canonical bytes must retain original prefix');
   assert.deepEqual(messages.slice(0,4),priorMessages);
   const context = requests.find(r=>r.stage===1).body.messages;
   assert.equal(context.filter(m=>m.role==='user').length,2);
   assert.ok(context.some(m=>m.role==='tool' && m.tool_call_id==='edit-0'),'Restored tool result must reach HTTP provider');
   assert.ok(context.some(m=>m.role==='assistant' && m.content==='fixture complete'),'Restored final assistant must reach HTTP provider');
  } else {priorBytes=bytes;priorMessages=messages;}
  if(!baseline) {
   const steps=JSON.parse(readFileSync(trace,'utf8'));
   assert.equal(steps.filter(s=>s.output==='model').length,2);
   assert.ok(steps.some(s=>s.output==='tool'));
  }
 }
 console.log(JSON.stringify({status:'PASS',engine:baseline?'upstream':'rust',scope:'Original CLI + upstream HTTP provider, deterministic SSE fixture, two processes; not live-model validation',requests:requests.length,canonicalMessages:8,dir}));
} finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }

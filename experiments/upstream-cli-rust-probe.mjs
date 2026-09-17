import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-original-cli-'));
const cli=fileURLToPath(new URL('../vendor/pi-mono/packages/coding-agent/dist/cli.js',import.meta.url));
const preload=fileURLToPath(new URL('./upstream-cli-preload.mjs',import.meta.url));
const session=join(dir,'canonical.jsonl');
writeFileSync(join(dir,'subject.txt'),'before\n');
let prior;
for(const resume of [false,true]){
 const trace=join(dir,`trace-${resume}.json`);
 const result=spawnSync(process.execPath,['--experimental-strip-types','--import',preload,cli,'--print','--mode','json','--no-extensions','--no-skills','--no-prompt-templates','--no-themes','--provider','anthropic','--model','claude-sonnet-4-20250514','--session',session,'--thinking','off',resume?'continue editing':'edit fixture'],{cwd:dir,env:{PATH:process.env.PATH,HOME:dir,ANTHROPIC_API_KEY:'fixture-not-a-key',PI_RS_PROBE_SCRATCH:join(dir,`scratch-${resume}.jsonl`),PI_RS_PROBE_TRACE:trace,PI_RS_PROBE_RESUME:resume?'1':'0'},encoding:'utf8',timeout:30000});
 writeFileSync(join(dir,`output-${resume}.jsonl`),result.stdout);writeFileSync(join(dir,`stderr-${resume}.txt`),result.stderr);
 assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(join(dir,'subject.txt'),'utf8'),resume?'resumed\n':'after\n');
 const steps=JSON.parse(readFileSync(trace,'utf8'));assert.equal(steps.filter(s=>s.output==='model').length,2);assert.ok(steps.some(s=>s.output==='tool'));
 const messages=readFileSync(session,'utf8').trim().split('\n').map(JSON.parse).filter(e=>e.type==='message').map(e=>e.message);
 assert.equal(messages.length,resume?8:4);if(resume)assert.deepEqual(messages.slice(0,4),prior);else prior=messages;
}
console.log(JSON.stringify({status:'PASS',scope:'Original CLI with test-only Agent substitution, fixture provider, two processes',dir}));

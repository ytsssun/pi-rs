import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'pi-cli-end-'));
try{
 assert.equal(spawnSync('git',['init',dir],{encoding:'utf8'}).status,0);
 const fixture=join(dir,'fixture.json'),trace=join(dir,'git.trace');
 writeFileSync(fixture,JSON.stringify([{role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop',timestamp:1}]));
 const child=spawnSync(process.execPath,['--experimental-strip-types',resolve('bin/pi-native.mjs'),'--workspace',dir,'--session',join(dir,'session.jsonl'),'--input','work','--fixture',fixture,'--extension',resolve('vendor/pi-mono/packages/coding-agent/examples/extensions/git-merge-and-resolve.ts')],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,HOME:dir,GIT_TRACE:trace}});
 assert.equal(child.status,0,child.stderr);const report=JSON.parse(child.stdout);assert.deepEqual(report.extensionErrors,[]);
 const git=readFileSync(trace,'utf8');assert.equal((git.match(/built-in: git rev-parse --git-dir/g)||[]).length,1);assert.match(git,/built-in: git status --porcelain/);assert.doesNotMatch(git,/built-in: git (fetch|merge)/);
 console.log('PASS unchanged git-merge-and-resolve agent_end reaction: real local git checks once, dirty scratch repo prevents fetch/merge');
}finally{rmSync(dir,{recursive:true,force:true});}

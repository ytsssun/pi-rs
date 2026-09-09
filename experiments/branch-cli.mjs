import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os'; import {join} from 'node:path'; import {execFileSync} from 'node:child_process';
const d=mkdtempSync(join(tmpdir(),'pi-branch-cli-')); const s=join(d,'session.json'); const w=join(d,'workspace');
execFileSync('node',['bin/pi-native.mjs','--session',s,'--workspace',w,'--command','hello','--extension','experiments/fixtures/command-extension.mjs'],{stdio:'pipe'});
const lines=readFileSync(s,'utf8').trim().split('\n').map(JSON.parse); const id=lines.at(-1).id;
execFileSync('node',['bin/pi-native.mjs','--session',s,'--workspace',w,'--resume','--reset-branch','--command','hello','--extension','experiments/fixtures/command-extension.mjs'],{stdio:'pipe'});
const after=readFileSync(s,'utf8').trim().split('\n').map(JSON.parse); if(after.length<=lines.length) throw Error('branch reset did not append');
console.log(JSON.stringify({verified:true,branchEntry:id,entriesBefore:lines.length,entriesAfter:after.length})); rmSync(d,{recursive:true,force:true});

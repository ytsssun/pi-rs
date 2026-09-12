import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'pi-parent-'));
const original = join(dir, 'original.jsonl');
const extension = join(dir, 'parent.ts');
const fixture = join(dir, 'fixture.json');
writeFileSync(fixture, JSON.stringify([{role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop',timestamp:1,api:'fixture',provider:'fixture',model:'fixture',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}}]));
writeFileSync(extension, `export default pi => {
  pi.on('session_before_switch', () => process.env.PARENT_VETO === '1' ? {cancel:true} : undefined);
  pi.registerCommand('parent', {handler: async (_, ctx) => {
    const options = JSON.parse(process.env.PARENT_OPTIONS);
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      options.setup = manager => manager.appendMessage({role:'assistant', content:[{type:'text',text:'fresh-only'}], timestamp:1});
    }
    await ctx.newSession(options);
  }});
};`);
const run = (path, args, env = {}) => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', resolve('bin/pi-native.mjs'), '--session', path, '--workspace', dir, '--extension', extension, ...args], {
    encoding:'utf8', timeout:30000, env:{...process.env, PARENT_VETO:'0', ...env},
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
const entries = path => readFileSync(path, 'utf8').trim().split('\n').map(JSON.parse);
try {
  run(original, ['--input','original-private-history','--fixture',fixture]);
  const oldBytes = readFileSync(original);
  for (const options of [null, [], {parentSession:42}, {parentSession:null}, {withSession:{}}]) {
    const files = readdirSync(dir).sort();
    const report = run(original, ['--resume','--input','/parent'], {PARENT_OPTIONS:JSON.stringify(options)});
    assert.equal(report.session, original);
    assert.ok(report.extensionErrors.length > 0, 'invalid options must report an error');
    assert.deepEqual(readFileSync(original), oldBytes);
    assert.deepEqual(readdirSync(dir).sort(), files);
  }
  const files = readdirSync(dir).sort();
  const veto = run(original, ['--resume','--input','/parent'], {PARENT_OPTIONS:JSON.stringify({parentSession:original}), PARENT_VETO:'1'});
  assert.equal(veto.session, original);
  assert.deepEqual(readdirSync(dir).sort(), files);
  assert.deepEqual(readFileSync(original), oldBytes);
  // Upstream stores the reference verbatim; it does not resolve or read that file.
  for (const options of [{}, {parentSession:original}, {parentSession:'relative/missing-parent.jsonl'}]) {
    const report = run(original, ['--resume','--input','/parent'], {PARENT_OPTIONS:JSON.stringify(options)});
    assert.deepEqual(report.extensionErrors, []);
    const fresh = entries(report.session);
    assert.notEqual(fresh[0].id, entries(original)[0].id);
    assert.equal(fresh[0].parentSession, options.parentSession);
    assert.equal(Object.hasOwn(fresh[0], 'parentSession'), Object.hasOwn(options, 'parentSession'));
    assert.ok(fresh.slice(1).every(entry => !Object.hasOwn(entry, 'parentSession')));
    assert.ok(!JSON.stringify(fresh).includes('original-private-history'));
    const prefix = readFileSync(report.session);
    run(report.session, ['--resume','--input','continuation','--fixture',fixture]);
    assert.deepEqual(readFileSync(report.session).subarray(0,prefix.length), prefix);
    assert.equal(entries(report.session)[0].parentSession, options.parentSession);
    assert.deepEqual(readFileSync(original), oldBytes);
  }
  console.log(JSON.stringify({status:'tested',scope:'native parentSession header, registered command, fresh-process resume, no-parent, no history copy, veto and invalid options'}));
} finally { rmSync(dir, {recursive:true, force:true}); }

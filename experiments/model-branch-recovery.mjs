import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';
import {savedBranchModel} from '../prototype/architecture/model-transport.mjs';
const root=mkdtempSync(join(tmpdir(),'pi-model-branch-'));
const path=join(root,'session.jsonl');
const manager=await createBackend({path,cwd:root});
try {
  manager.appendCustomEntry('pi-rs.model.v1',{model:'openai/gpt-4o-mini'});
  manager.appendMessage({role:'assistant',content:[{type:'text',text:'anchor'}],timestamp:1});
  const anchor=manager.getEntries().at(-1).id;
  manager.appendCustomEntry('pi-rs.model.v1',{model:'unavailable-sibling-model'});
  assert.equal(savedBranchModel(manager),'unavailable-sibling-model');
  manager.branch(anchor);
  assert.equal(savedBranchModel(manager),'openai/gpt-4o-mini');
  manager.resetLeaf();
  assert.equal(savedBranchModel(manager),undefined);
} finally {manager.close();}
try {
  const fixture=join(root,'fixture.json');
  writeFileSync(fixture,JSON.stringify([{role:'assistant',content:[{type:'text',text:'done'}],stopReason:'stop'}]));
  const args=[resolve('bin/pi-native.mjs'),'--resume','--session',path,'--workspace',root,'--input','continue','--fixture',fixture];
  const run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:15000});
  assert.equal(run.status,0,run.stderr);
  assert.equal(JSON.parse(run.stdout).fixture,true,'fixture must not resolve stale model metadata');
  const mixed=spawnSync(process.execPath,[...args,'--model','gpt-4o-mini'],{encoding:'utf8',timeout:15000});
  assert.notEqual(mixed.status,0);
  assert.match(mixed.stderr,/choose exactly one/);
  console.log(JSON.stringify({passed:true,scope:'branch selection, empty branch, fixture isolation, conflicting inputs'}));
} finally {rmSync(root,{recursive:true,force:true});}

// Independent fixed fixtures: expected values execute pinned upstream code, never Rust.
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {SessionManager, buildContextEntries, buildSessionContext, sessionEntryToContextMessages} from '../vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
const timestamp='2026-01-01T00:00:00.000Z';
const header={type:'session',version:3,id:'11111111-1111-4111-8111-111111111111',timestamp,cwd:'/tmp/pi-index-fixture'};
const e=(id,parentId,type,rest={})=>({type,id,parentId,timestamp,...rest});
const user=(id,parentId,content=id)=>e(id,parentId,'message',{message:{role:'user',content,timestamp:0}});
const assistant=(id,parentId,content=[])=>e(id,parentId,'message',{message:{role:'assistant',content,provider:'fixture-provider',model:'fixture-model',timestamp:0}});
const compact=(id,parentId,firstKeptEntryId)=>e(id,parentId,'compaction',{summary:`summary ${id}`,firstKeptEntryId,tokensBefore:123});
const jsonl=(entries,h=header)=>[h,...entries].map(JSON.stringify).join('\n')+'\n';
const branching=[user('root',null),e('custom','root','custom',{customType:'plugin-state',data:{unknown:[1,{nested:true}]}}),user('fork-a','custom'),e('future','custom','future_entry',{opaque:{data:'preserved'}}),user('fork-b','future')];
export const cases=[
 {name:'header-only',content:jsonl([])},
 {name:'default-last-branch-unknown-custom',content:jsonl(branching)},
 {name:'explicit-first-fork',content:jsonl(branching),leaf:'fork-a'},
 {name:'explicit-custom-leaf',content:jsonl(branching),leaf:'custom'},
 {name:'null-leaf-before-root',content:jsonl(branching),leaf:null},
 {name:'unknown-leaf-distinct-branch-context-fallback',content:jsonl(branching),leaf:'not-present'},
 {name:'empty-leaf-distinct-branch-context-fallback',content:jsonl(branching),leaf:''},
 {name:'empty-id-is-not-a-truthy-leaf',content:jsonl([user('',null),user('last',null)]),leaf:''},
 {name:'default-empty-id-branch-versus-context',content:jsonl([user('first',null),user('',null)])},
 {name:'missing-parent-terminates',content:jsonl([user('root',null),user('orphan','missing'),user('last','orphan')])},
 {name:'duplicate-id-last-definition-index',content:jsonl([user('root',null,'first'),user('root',null,'replacement'),user('leaf','root')])},
 {name:'compaction-keeps-range',content:jsonl([user('a',null),user('b','a'),user('c','b'),compact('d','c','b'),user('e','d')])},
 {name:'compaction-missing-kept-entry',content:jsonl([user('a',null),compact('b','a','missing'),user('c','b')])},
 {name:'latest-compaction-wins',content:jsonl([user('a',null),compact('b','a','a'),user('c','b'),compact('d','c','c'),user('e','d')])},
 {name:'kept-entry-after-compaction-is-not-pre-kept-range',content:jsonl([user('a',null),compact('b','a','c'),user('c','b')])},
 {name:'settings-before-compaction-retained',content:jsonl([e('a',null,'thinking_level_change',{thinkingLevel:'high'}),e('b','a','model_change',{provider:'first',modelId:'first-model'}),assistant('c','b'),compact('d','c','missing'),user('e','d')])},
 {name:'branch-local-settings',content:jsonl([e('a',null,'model_change',{provider:'base',modelId:'base-model'}),e('b','a','thinking_level_change',{thinkingLevel:'low'}),assistant('other','b'),e('target','a','model_change',{provider:'new',modelId:'new-model'})]),leaf:'b'},
 {name:'null-missing-content-host-conversion',content:jsonl([user('a',null,null),assistant('b','a',null),e('c','b','message',{message:{role:'toolResult',toolCallId:'id',toolName:'tool',timestamp:0}}),e('d','c','custom_message',{customType:'custom',content:null,display:false}),e('f','d','branch_summary',{fromId:'a',summary:'branch summary'})])},
 {name:'malformed-lines-skipped-unterminated-final-line',content:'\nmalformed\n'+jsonl([user('a',null)]).trimEnd()+'\n{bad\n'+JSON.stringify(user('b','a'))},
];
export function expectedFor(test) {
 const dir=mkdtempSync(join(tmpdir(),'pi-index-oracle-'));
 try {
  const path=join(dir,'session.jsonl');writeFileSync(path,test.content);
  const manager=SessionManager.open(path,dir);
  const entries=manager.getEntries();
  if(test.leaf===null) manager.resetLeaf();
  const branch=manager.getBranch(test.leaf===null?undefined:test.leaf);
  const contextEntries=buildContextEntries(entries,test.leaf);
  const {thinkingLevel,model,messages}=buildSessionContext(entries,test.leaf);
  assert.deepEqual(contextEntries.flatMap(sessionEntryToContextMessages),messages);
  return {entries,branch,contextEntries,thinkingLevel,model};
 } finally {rmSync(dir,{recursive:true,force:true});}
}
export function verify(binary=resolve('target/debug/examples/pi_session_index')) {
 const results=[];
 for(const test of cases) {
  const expected=expectedFor(test);
  const child=spawnSync(binary,[],{input:JSON.stringify({content:test.content,...Object.hasOwn(test,'leaf')?{leaf:test.leaf}:{}}),encoding:'utf8',timeout:5000,env:{PATH:'/usr/bin:/bin'}});
  assert.equal(child.status,0,`${test.name}: ${child.stderr || child.error}`);
  const actual=JSON.parse(child.stdout);
  assert.deepEqual(actual,expected,test.name);
  // Rust selects entries; unchanged upstream JS remains responsible for message conversion.
  assert.deepEqual(actual.contextEntries.flatMap(sessionEntryToContextMessages),expected.contextEntries.flatMap(sessionEntryToContextMessages),`${test.name}: host conversion`);
  results.push({name:test.name,status:'verified',branch:actual.branch.map(e=>e.id),context:actual.contextEntries.map(e=>e.id)});
 }
 const rejected=[
  {name:'legacy-v2-migration-unimplemented',content:jsonl([user('a',null)],{...header,version:2}),error:/version 3/},
  {name:'missing-entry-id',content:jsonl([{type:'custom',parentId:null,timestamp}]),error:/string id/},
  {name:'cyclic-parent-chain',content:jsonl([user('a','b'),user('b','a')]),error:/cyclic/},
 ];
 for(const test of rejected) {
  const child=spawnSync(binary,[],{input:JSON.stringify({content:test.content}),encoding:'utf8',timeout:5000,env:{PATH:'/usr/bin:/bin'}});
  assert.equal(child.signal,null,`${test.name}: must reject without timeout`);assert.notEqual(child.status,0);assert.match(child.stderr,test.error);
  results.push({name:test.name,status:'verified-rejection-not-parity'});
 }
 return {upstreamCommit:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',upstreamSourceSha256:createHash('sha256').update(readFileSync('vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts')).digest('hex'),fixtureSha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),modelCalls:0,results,limits:['Deterministic v3 read/index fixtures only; no model calls.','No legacy migrations, append/file repair equivalence, UI, full SessionManager surface, or full plugin compatibility claim.','Message conversion intentionally stays in original JS.','Cycles and missing IDs require bounded Rust rejection, not parity with unbounded/permissive upstream traversal.']};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(verify(),null,2));

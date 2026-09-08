import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkWorkspace, checkProtectedInterception} from './native-live-acceptance.mjs';

test('parallel report checks both required files without unrelated edit target', () => {
  const dir=mkdtempSync(join(tmpdir(),'pi-acceptance-'));
  try {
    assert.equal(checkWorkspace('parallel',dir).passed,false);
    writeFileSync(join(dir,'parallel-a.txt'),'PARALLEL_OK');
    assert.equal(checkWorkspace('parallel-resume',dir).passed,false);
    writeFileSync(join(dir,'parallel-b.txt'),'PARALLEL_OK');
    assert.equal(checkWorkspace('parallel-resume',dir).passed,true);
    writeFileSync(join(dir,'parallel-b.txt'),'PARALLEL_OK\n');
    assert.equal(checkWorkspace('parallel',dir).passed,false,'exact means no trimming');
    assert.equal(checkWorkspace('seed',dir).passed,false);
    writeFileSync(join(dir,'native-live-target.txt'),'NATIVE_LIVE_EDITED');
    assert.equal(checkWorkspace('resume',dir).passed,true);
    assert.equal(checkWorkspace('protected',dir).passed,true);
    writeFileSync(join(dir,'.env'),'');
    assert.equal(checkWorkspace('protected',dir).passed,false);
    assert.throws(()=>checkWorkspace('typo',dir),/Unknown live stage/);
  } finally {rmSync(dir,{recursive:true});}
});

 test('protected interception rejects no-op, unrelated errors and mismatched call IDs', () => {
  const call={type:'message',message:{role:'assistant',content:[{type:'toolCall',id:'a',name:'write',arguments:{path:'.env'}}]}};
  const result={type:'message',message:{role:'toolResult',toolCallId:'a',isError:true,content:[{type:'text',text:'Path ".env" is protected'}]}};
  assert.equal(checkProtectedInterception([]).passed,false);
  assert.equal(checkProtectedInterception([call]).passed,false);
  assert.equal(checkProtectedInterception([call,result]).passed,true);
  result.message.toolCallId='other';
  assert.equal(checkProtectedInterception([call,result]).passed,false);
  result.message.toolCallId='a'; result.message.content[0].text='network failed';
  assert.equal(checkProtectedInterception([call,result]).passed,false);
});

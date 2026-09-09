import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHost, tsBackend} from '../prototype/real-plugin-host.mjs';
import {createBackend} from '../prototype/architecture/native-store-backend.mjs';

const [mode, path] = process.argv.slice(2);
const expected = {phase: 2, nested: {items: ['saved', 42]}, enabled: false};
if (mode) {
  const manager = await createBackend({path, mode: mode === 'write' ? 'create' : 'open'});
  try {
    const host = await createHost(tsBackend(), {sessionManager: manager, extensionPaths: [], factories: [pi => {
      pi.on('session_start', (_event, ctx) => {
        if (mode === 'write') {
          assert.equal(pi.appendEntry('example.state', expected), undefined);
          pi.appendEntry('example.empty');
        }
        const entries = ctx.sessionManager.getEntries();
        assert.deepEqual(entries.filter(e => e.customType === 'example.state').map(e => e.data), [expected]);
        assert.equal(entries.filter(e => e.customType === 'example.empty').length, 1);
      });
    }]});
    await host.runner.emit({type: 'session_start'});
    assert.deepEqual(host.errors, []);
    // Pi defers initial session persistence until the first assistant message.
    if (mode === 'write') manager.appendMessage({role: 'assistant', content: [{type: 'text', text: 'saved'}], timestamp: 1});
  } finally {manager.close();}
} else {
  const directory = mkdtempSync(join(tmpdir(), 'pi-entry-recovery-'));
  try {
    for (const phase of ['write', 'read']) {
      const result = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(import.meta.url), phase, join(directory, 'session.jsonl')], {encoding: 'utf8'});
      assert.equal(result.status, 0, `${phase}: ${result.stderr}\n${result.stdout}`);
    }
    console.log(JSON.stringify({passed: true, scope: 'deterministic original extension loader, native store, fresh-process recovery'}));
  } finally {rmSync(directory, {recursive: true, force: true});}
}

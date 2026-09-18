// Experimental upstream CLI entry. Canonical sessions remain upstream-owned.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Each process projects canonical history into a fresh, private scratch journal.
const scratch=mkdtempSync(join(tmpdir(),'pi-rs-core-'));
process.env.PI_RS_PROBE_SCRATCH=join(scratch,'runtime.jsonl');
if(process.env.PI_RS_CORE_TRACE)process.env.PI_RS_PROBE_TRACE=process.env.PI_RS_CORE_TRACE;
else delete process.env.PI_RS_PROBE_TRACE;
delete process.env.PI_RS_PROBE_FIXED_STREAM;
// Best-effort cleanup; supported source installations run on macOS/Linux.
process.on('exit',()=>{try{rmSync(scratch,{recursive:true,force:true});}catch{}});
await import(new URL('../experiments/upstream-cli-preload.mjs',import.meta.url));
await import(new URL('../vendor/pi-mono/packages/coding-agent/dist/cli.js',import.meta.url));

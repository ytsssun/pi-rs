// Experimental installed entry: unchanged Pi CLI with the Rust Agent adapter.
// The default pi-rs entry remains the stable custom headless CLI.
import {existsSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const sessionIndex=args.indexOf('--session');
const session=sessionIndex>=0?args[sessionIndex+1]:resolve(process.cwd(),'.pi-rs','session.jsonl');
const scratch=resolve(dirname(session),'.pi-rs-rust-adapter.jsonl');
mkdirSync(dirname(scratch),{recursive:true});
process.env.PI_RS_PROBE_SCRATCH=scratch;
process.env.PI_RS_PROBE_TRACE=resolve(dirname(scratch),'.pi-rs-rust-trace.json');
await import(new URL('../experiments/upstream-cli-preload.mjs',import.meta.url));
await import(new URL('../vendor/pi-mono/packages/coding-agent/dist/cli.js',import.meta.url));

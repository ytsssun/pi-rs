import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ModelRuntime } from '../vendor/pi-mono/packages/coding-agent/src/core/model-runtime.ts';
// Load local .env without printing secrets; existing environment wins.
try { for (const line of readFileSync('.env','utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,''); } } catch {}
const runtime = await ModelRuntime.create({ modelsPath: null, refreshOnCreate: false, allowModelNetwork: false });
const all = runtime.getModels('openai');
const selected = runtime.getModel('openai', 'gpt-4o-mini') ?? all[0];
let available = [], availableError;
try { available = [...await runtime.getAvailable('openai')]; } catch (e) { availableError = e instanceof Error ? e.message : String(e); }
assert.ok(Array.isArray(all));
console.log(JSON.stringify({provider:'openai', apiKeyPresent:Boolean(process.env.OPENAI_API_KEY), catalogModels:all.length, selected:selected?.id ?? null, available:available.length, availableError, runtimeError:runtime.getError() ?? null}));

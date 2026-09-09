import assert from 'node:assert/strict';
import { ModelRuntime } from '../vendor/pi-mono/packages/coding-agent/src/core/model-runtime.ts';
const runtime = await ModelRuntime.create({ modelsPath: null, refreshOnCreate: false, allowModelNetwork: false });
const available = runtime.getAvailableSnapshot();
assert.ok(Array.isArray(available));
console.log(JSON.stringify({available: available.length, methods: ['getAvailable','refresh','registerProvider'].map(k=>[k,typeof runtime[k]])}));

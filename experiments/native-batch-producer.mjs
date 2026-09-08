import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const addon = createRequire(import.meta.url)('../target/native-session.node');
const request = (value) => {
  const response = JSON.parse(addon.request(JSON.stringify(value)));
  if (response.error) throw new Error(response.error);
  return response.result;
};

const handle = request({ op: 'queue_create', capacity: 2 });
request({ op: 'queue_push_batch', handle, events: [
  { value: { type: 'text_delta', delta: 'a' } },
  { value: { type: 'done' }, terminal: true },
] });
assert.deepEqual(request({ op: 'queue_poll', handle }), { value: { type: 'text_delta', delta: 'a' }, terminal: false });
assert.deepEqual(request({ op: 'queue_poll', handle }), { value: { type: 'done' }, terminal: true });
assert.equal(request({ op: 'queue_poll', handle }), null);
request({ op: 'queue_close', handle });
console.log(JSON.stringify({ verified: true, ordered: true, terminal: true }));

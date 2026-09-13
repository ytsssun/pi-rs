// Existing native queue primitives; this is not HTTP transport cancellation.
import assert from 'node:assert/strict';
import {request} from '../prototype/architecture/native-store-backend.mjs';
const handle=request({op:'queue_create',capacity:2});
const controller=new AbortController();
let timerRan=false;
setImmediate(()=>{timerRan=true;controller.abort();});
let polls=0;
while(!controller.signal.aborted){
  assert.equal(request({op:'queue_poll',handle,wait:false}),null);
  polls++;
  await new Promise(resolve=>setImmediate(resolve));
}
assert.equal(timerRan,true);
assert.ok(polls>0);
request({op:'queue_close',handle});
assert.throws(()=>request({op:'queue_poll',handle,wait:false}),/unknown queue/);
console.log('PASS native nonblocking queue permits JS abort delivery and close; NOT HTTP interruption or producer cleanup');

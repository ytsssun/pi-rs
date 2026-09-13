import http from 'node:http';
import assert from 'node:assert/strict';
import {request} from '../prototype/architecture/native-store-backend.mjs';
// Local transport fixture only. No real credential or model access.
process.env.OPENAI_API_KEY='local-fixture-unused';
let received;
const arrival=new Promise(resolve=>{received=resolve;});
const server=http.createServer((req,res)=>{
  req.resume();
  res.on('error',()=>{});
  received(); // Deliberately withhold response headers.
});
const watchdog=setTimeout(()=>{console.error('HTTP cancellation probe timed out');process.exit(1);},5000);
let handle,closed=false;
try {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  handle=request({op:'provider_stream_start',model:'fixture',messages:[{role:'user',content:'stall'}],tools:[],base_url:`http://127.0.0.1:${server.address().port}/v1`,capacity:4});
  await arrival;
  assert.equal(request({op:'stream_status',handle}).finished,false);
  request({op:'queue_close',handle}); closed=true;
  await new Promise(r=>setTimeout(r,100));
  assert.equal(request({op:'stream_status',handle}).finished,false,'producer unexpectedly settled during observation window');
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  const deadline=Date.now()+2000;
  while(!request({op:'stream_status',handle}).finished && Date.now()<deadline) await new Promise(r=>setTimeout(r,10));
  assert.equal(request({op:'stream_status',handle}).finished,true,'producer must settle after fixture disconnect');
  console.log(JSON.stringify({passed:true,scope:'local HTTP only',observationMs:100,queueCloseSettledProducer:false,serverDisconnectSettledProducer:true}));
} finally {
  if(handle&&!closed) request({op:'queue_close',handle});
  server.closeAllConnections(); server.close(); clearTimeout(watchdog);
}

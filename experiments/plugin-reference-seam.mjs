// Actual pinned upstream event bus against a deliberately naive JSON seam.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createEventBus} from '../vendor/pi-mono/packages/coding-agent/src/core/event-bus.ts';
function exercise(bus) {
  const value = {count:0};
  let sameObject=false;
  const order=[];
  const dispose=bus.on('probe', data=>{
    sameObject=data===value;
    data.count++;
    order.push('handler');
  });
  bus.emit('probe',value);
  order.push('after emit');
  dispose();
  bus.emit('probe',value);
  return {sameObject,count:value.count,order};
}
const original=exercise(createEventBus());
assert.deepEqual(original,{sameObject:true,count:1,order:['handler','after emit']});
const naive=(()=>{
 const real=createEventBus();
 return {on:(...args)=>real.on(...args),emit:(name,data)=>real.emit(name,JSON.parse(JSON.stringify(data)))};
})();
const copied=exercise(naive);
assert.equal(copied.sameObject,false);
assert.equal(copied.count,0);
assert.notDeepEqual(copied,original);
// Host-local bus retains references, even if other core operations later use Rust.
const hostLocal=exercise(createEventBus());
assert.deepEqual(hostLocal,original);
const source='vendor/pi-mono/packages/coding-agent/src/core/event-bus.ts';
console.log(JSON.stringify({status:'tested',source,sha256:createHash('sha256').update(readFileSync(source)).digest('hex'),original,naiveJson:copied,hostLocal,conclusion:'JSON-copy crossing loses reference/mutation semantics. Keeping this bus entirely in the JS host preserves this example. Not proof against every IPC/native architecture or proof of full plugin compatibility.'},null,2));

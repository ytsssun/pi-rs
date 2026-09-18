const native = require(process.argv[2]);
const handle = JSON.parse(native.request(JSON.stringify({ op: "open", path: process.argv[3] })));
if (handle.error) throw new Error(handle.error);
const snapshot = JSON.parse(native.request(JSON.stringify({ op: "snapshot", handle: handle.result })));
if (snapshot.error) throw new Error(snapshot.error);
console.log(JSON.stringify(snapshot.result));
native.request(JSON.stringify({ op: "close", handle: handle.result }));

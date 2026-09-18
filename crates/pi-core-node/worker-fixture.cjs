const { parentPort, workerData } = require("node:worker_threads");
const native = require(workerData.addonPath);
const initialCount = JSON.parse(native.request(JSON.stringify({ op: "count" }))).result;
const foreign = JSON.parse(native.request(JSON.stringify({ op: "snapshot", handle: workerData.handle })));
const own = JSON.parse(native.request(JSON.stringify({ op: "create", path: workerData.path, header: { type: "session", version: 3, id: "worker" } })));
if (own.error) throw new Error(own.error);
parentPort.postMessage({ initialCount, foreign, handle: own.result });

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const addonPath = fileURLToPath(new URL("./target/pi-core-node.node", import.meta.url));
const native = createRequire(import.meta.url)(addonPath);
const timestamp = "2026-01-01T00:00:00.000Z";

function request(value) {
	const response = JSON.parse(native.request(JSON.stringify(value)));
	if (response.error) throw new Error(response.error);
	return response.result;
}

test("model/tool loop persists and reopens in a fresh process", { concurrency: false }, (t) => {
	const dir = mkdtempSync(join(tmpdir(), "pi-core-node-"));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const path = join(dir, "session.jsonl");
	const handle = request({ op: "create", path, header: { type: "session", version: 3, id: "fixture", timestamp, cwd: dir } });
	request({ op: "runtime", handle, event: "enqueue_user", queued: { kind: "user", message: "read fixture", options: { deliverAs: "followUp" } } });
	let action = request({ op: "runtime", handle, event: "advance_queued", driveStart: true });
	if (action.type === "admitted") action = action.action;
	assert.equal(action.type, "model");
	assert.throws(() => request({ op: "branch", handle, leaf: null }), /runtime pending/);
	assert.throws(() => request({ op: "runtime", handle, event: "model_result", requestId: "stale", message: {} }), /stale/);
	action = request({ op: "runtime", handle, event: "model_result", requestId: action.requestId, message: { role: "assistant", content: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "fixture.txt" } }], stopReason: "toolUse" } });
	assert.equal(action.type, "tool");
	assert.equal(action.call.name, "read");
	action = request({ op: "runtime", handle, event: "tool_result", requestId: action.requestId, result: { content: [{ type: "text", text: "fixture contents" }] } });
	assert.equal(action.type, "model");
	assert.equal(action.contextEntries.find((entry) => entry.message?.role === "toolResult").message.content[0].text, "fixture contents");
	action = request({ op: "runtime", handle, event: "model_result", requestId: action.requestId, message: { role: "assistant", content: [{ type: "text", text: "finished ✓" }], stopReason: "stop" } });
	assert.equal(action.type, "done");
	const snapshot = request({ op: "snapshot", handle });
	assert.deepEqual(snapshot.entries.filter((entry) => entry.type === "message").map((entry) => entry.message.role), ["user", "assistant", "toolResult", "assistant"]);
	request({ op: "close", handle });
	assert.throws(() => request({ op: "snapshot", handle }), /closed session/);
	assert.throws(() => request({ op: "close", handle }), /closed session/);
	const child = spawnSync(process.execPath, [fileURLToPath(new URL("./reopen-fixture.cjs", import.meta.url)), addonPath, path], { encoding: "utf8" });
	assert.equal(child.status, 0, child.stderr);
	assert.deepEqual(JSON.parse(child.stdout), snapshot);
});

test("malformed input is rejected without losing the environment", { concurrency: false }, () => {
	assert.throws(() => native.request(), /native session binding failed/);
	assert.throws(() => native.request({}), /native session binding failed/);
	assert.throws(() => native.request("\ud800"), /native session binding failed/);
	assert.equal(typeof JSON.parse(native.request("{")).error, "string");
	for (const value of [null, [], 1, {}, { op: "create" }, { op: "provider_chat" }, { op: "queue_create" }]) {
		assert.equal(typeof JSON.parse(native.request(JSON.stringify(value))).error, "string");
	}
	assert.equal(request({ op: "count" }), 0);
});

test("worker environments isolate handles and clean abandoned stores", { concurrency: false }, async (t) => {
	const dir = mkdtempSync(join(tmpdir(), "pi-core-worker-"));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const handle = request({ op: "create", path: join(dir, "parent.jsonl"), header: { type: "session", version: 3, id: "parent" } });
	const before = request({ op: "diagnostics" });
	const worker = new Worker(new URL("./worker-fixture.cjs", import.meta.url), { workerData: { addonPath, handle, path: join(dir, "worker.jsonl") } });
	const exited = once(worker, "exit");
	const [message] = await once(worker, "message");
	assert.equal(message.initialCount, 0);
	assert.match(message.foreign.error, /closed session/);
	assert.notEqual(message.handle, handle);
	assert.throws(() => request({ op: "snapshot", handle: message.handle }), /closed session/);
	assert.equal((await exited)[0], 0);
	const after = request({ op: "diagnostics" });
	assert.equal(after.finalizedEnvironments, before.finalizedEnvironments + 1);
	assert.equal(after.abandonedStoresDropped, before.abandonedStoresDropped + 1);
	assert.equal(request({ op: "count" }), 1);
	request({ op: "close", handle });
});

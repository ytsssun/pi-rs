import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createCatalogReplay } from "./model-catalog-replay.mjs";

function snapshot(t) {
	const root = mkdtempSync(join(tmpdir(), "pi-catalog-replay-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const content = '{"models":{"fixture":{"id":"fixture"}}}\n';
	writeFileSync(join(root, "models.json"), content);
	const manifest = {
		schemaVersion: 1,
		responses: [{ url: "https://models.dev/api.json", file: "models.json", sha256: createHash("sha256").update(content).digest("hex") }],
	};
	const path = join(root, "manifest.json");
	writeFileSync(path, JSON.stringify(manifest));
	return { root, path, manifest, content };
}

test("replays frozen bytes repeatedly and never fetches unknown URLs", async (t) => {
	const { path, content } = snapshot(t);
	const replay = createCatalogReplay(path);
	assert.equal(await (await replay("https://models.dev/api.json")).text(), content);
	assert.equal(await (await replay(new URL("https://models.dev/api.json"))).text(), content);
	await assert.rejects(replay("https://example.invalid/new-source"), /network disabled/);
});

test("rejects edited response data before starting generation", (t) => {
	const { root, path } = snapshot(t);
	writeFileSync(join(root, "models.json"), "{}");
	assert.throws(() => createCatalogReplay(path), /checksum mismatch/);
});

test("rejects duplicate source URLs and paths outside snapshot", (t) => {
	const { path, manifest } = snapshot(t);
	manifest.responses.push(manifest.responses[0]);
	writeFileSync(path, JSON.stringify(manifest));
	assert.throws(() => createCatalogReplay(path), /Duplicate catalog URL/);
	manifest.responses = [{ ...manifest.responses[0], file: "../outside.json" }];
	writeFileSync(path, JSON.stringify(manifest));
	assert.throws(() => createCatalogReplay(path), /inside the snapshot/);
});

test("preload installs replay in a new generator process", (t) => {
	const { path, content } = snapshot(t);
	const child = spawnSync(process.execPath, [
		"--import", fileURLToPath(new URL("./model-catalog-replay-preload.mjs", import.meta.url)),
		"--input-type=module", "-e", "console.log(await (await fetch('https://models.dev/api.json')).text()); await fetch('https://example.invalid/missing');",
	], { encoding: "utf8", env: { PATH: process.env.PATH, PI_MODEL_CATALOG_SNAPSHOT: path } });
	assert.equal(child.stdout, `${content}\n`);
	assert.equal(child.status, 1);
	assert.match(child.stderr, /network disabled/);
});

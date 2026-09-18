import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("Usage: node scripts/capture-model-catalog.mjs NEW_DIRECTORY");
mkdirSync(directory, { recursive: false });
const sources = [
	["models-dev.json", "https://models.dev/api.json"],
	["openrouter.json", "https://openrouter.ai/api/v1/models"],
	["ai-gateway.json", "https://ai-gateway.vercel.sh/v1/models"],
	["nvidia.json", "https://integrate.api.nvidia.com/v1/models"],
];
const manifest = { schemaVersion: 1, capturedAt: new Date().toISOString(), responses: [] };
for (const [file, url] of sources) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
	const content = Buffer.from(await response.arrayBuffer());
	JSON.parse(content.toString("utf8"));
	writeFileSync(join(directory, file), content);
	manifest.responses.push({ url, file, sha256: createHash("sha256").update(content).digest("hex") });
}
writeFileSync(join(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(resolve(directory, "manifest.json"));

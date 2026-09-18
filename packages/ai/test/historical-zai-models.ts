import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Model } from "../src/types.ts";

// Synthetic historical inputs exercise the real generator's price fallback and
// effort mapping, independently of which models the public catalog still lists.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const snapshot = join(root, "fixtures/model-catalog-20260918");
const temporary = mkdtempSync(join(tmpdir(), "pi-historical-catalog-"));
let generated: Record<string, Record<string, Model<"openai-completions">>>;
try {
	const manifest = JSON.parse(readFileSync(join(snapshot, "manifest.json"), "utf8"));
	const data = JSON.parse(readFileSync(join(snapshot, "models-dev.json"), "utf8"));
	const overrides = JSON.parse(readFileSync(new URL("./fixtures/zai-historical-input.json", import.meta.url), "utf8"));
	for (const [provider, value] of Object.entries(overrides)) {
		const historical = value as { models: Record<string, unknown> };
		data[provider].models = { ...data[provider].models, ...historical.models };
	}
	const content = JSON.stringify(data);
	writeFileSync(join(temporary, "models-dev.json"), content);
	for (const response of manifest.responses) {
		if (response.file === "models-dev.json") {
			response.sha256 = createHash("sha256").update(content).digest("hex");
		} else {
			writeFileSync(join(temporary, response.file), readFileSync(join(snapshot, response.file)));
		}
	}
	writeFileSync(join(temporary, "manifest.json"), JSON.stringify(manifest));
	execFileSync(
		process.execPath,
		[
			"--import",
			join(root, "scripts/model-catalog-replay-preload.mjs"),
			join(root, "packages/ai/scripts/generate-models.ts"),
			"--strict",
			"--json-only",
			"--json-output",
			join(temporary, "output"),
		],
		{ env: { PATH: process.env.PATH, PI_MODEL_CATALOG_SNAPSHOT: join(temporary, "manifest.json") }, stdio: "pipe" },
	);
	generated = JSON.parse(readFileSync(join(temporary, "output/models.json"), "utf8"));
} finally {
	rmSync(temporary, { recursive: true, force: true });
}

export function historicalZaiModel(provider: "zai" | "zai-coding-cn", id: string): Model<"openai-completions"> {
	const model = generated[provider]?.[id];
	if (!model || model.api !== "openai-completions" || model.id !== id || model.provider !== provider) {
		throw new Error(`Missing historical generator result: ${provider}/${id}`);
	}
	return model;
}

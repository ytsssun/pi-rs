import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

/** Load a frozen set of public JSON responses. There is no network fallback. */
export function createCatalogReplay(manifestPath) {
	const root = dirname(resolve(manifestPath));
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.responses)) {
		throw new Error("Invalid catalog replay manifest");
	}
	const responses = new Map();
	for (const entry of manifest.responses) {
		const path = resolve(root, entry.file);
		const within = relative(root, path);
		if (isAbsolute(within) || within === ".." || within.startsWith("../")) {
			throw new Error("Catalog response must be inside the snapshot directory");
		}
		if (responses.has(entry.url)) throw new Error(`Duplicate catalog URL: ${entry.url}`);
		const content = readFileSync(path);
		if (createHash("sha256").update(content).digest("hex") !== entry.sha256) {
			throw new Error(`Catalog checksum mismatch: ${entry.file}`);
		}
		JSON.parse(content.toString("utf8"));
		responses.set(entry.url, content);
	}
	return async (input) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		const content = responses.get(url);
		if (!content) throw new Error(`Unrecorded catalog request (network disabled): ${url}`);
		return new Response(content, { headers: { "Content-Type": "application/json" } });
	};
}

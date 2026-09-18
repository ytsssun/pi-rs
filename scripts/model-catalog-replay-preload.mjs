import { createCatalogReplay } from "./model-catalog-replay.mjs";

const manifestPath = process.env.PI_MODEL_CATALOG_SNAPSHOT;
if (!manifestPath) throw new Error("PI_MODEL_CATALOG_SNAPSHOT must point to a replay manifest");
globalThis.fetch = createCatalogReplay(manifestPath);

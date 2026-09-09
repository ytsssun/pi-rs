# pi-rs contribution guide

Pi-rs replaces Pi's core runtime in Rust while preserving the unchanged TypeScript/Node.js plugin boundary. Keep compatibility claims tied to reproducible evidence.

For runtime limits, fixture contracts, recovery semantics, and known compatibility gaps, read [`docs/runtime-details.md`](docs/runtime-details.md) when changing runtime, provider, tool, session, or context behavior. For current verified status and historical evidence, read [`docs/checkpoint.md`](docs/checkpoint.md) and query [`docs/board.jsonl`](docs/board.jsonl).

Every behavioral change must include an appropriate deterministic or live verification. Record commands, results, scope, and failures in the append-only board; distinguish tested from verified. Preserve upstream Pi source and plugin files unchanged unless the task explicitly concerns the vendored reference.

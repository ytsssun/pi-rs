# Rust Pi session index — starting63c7e79

Status: implemented read-only core module, independently differential-tested subset.
Not a session writer, migration layer or complete SessionManager replacement.

`src/pi_session_index.rs` parses v3 JSONL into Rust-owned entries/index and computes
current branch, compaction-aware context entries, thinking level and model. Unknown
entry payloads/fields remain JSON values rather than being dropped by a closed enum.
`examples/pi_session_index.rs` is its JSON stdin/stdout test interface. Current CLI
native sessions are unchanged; the new index is not integrated into the CLI loop.

Original JS `sessionEntryToContextMessages` remains the adapter for converting
selected entries to Pi message objects. Selection/tree/context decisions are Rust;
conversion is deliberately not claimed rewritten. The independent fixture harness
compares all returned values with the fixed original SessionManager and exported
context helpers, including forks, missing parents, duplicate IDs, explicit null or
unknown leaves, compaction ranges/latest compaction, branch-local settings, and
null/missing message content conversion. Full snapshots compare, not just counts.

## New evidence toward Rust ownership

The unchanged Todo extension runs in two separate child processes with a facade
whose only session method calls Rust getBranch. No TS SessionManager is instantiated
in this fixture. Both runs reconstruct alpha rather than abandoned beta, then add
gamma with ID2 and nextId3. Source fixture bytes remain unchanged. This proves a
specific plugin read/reconstruction path can be backed by Rust selection. The new
Todo is only in plugin memory, not persisted; the test is explicitly not the next
append/restore milestone or live coding-agent flow.

Independent reviewer found an empty-ID counterexample after the initial17cases
passed: with id:'' present and leaf:'', upstream getBranch is empty while context
falls back to the physical last entry; Rust selected the empty-ID entry. Fixed
truthiness semantics, including the implicit last empty ID case. Keep the initial
failure and final case counts in docs/pi-index-review.md.

## Explicit incomplete compatibility scope

Only v3 header accepted; old-version migrations remain required, not waived.
Malformed JSON lines are skipped as in upstream parsing, but this parser never
repairs the file's final newline. Missing/nonstring entry IDs and cyclic ancestry
are bounded errors rather than upstream permissive/unbounded behavior. Rejection
checks are labeled separately from parity cases. Missing/nonstring metadata,
non-BMP/lone-surrogate JSON strings and large-number JS equivalence have not been
exhaustively compared. Labels, header access, tree UI, append, crash recovery,
concurrent writes, object identity and migration remain unimplemented surfaces.

## Next integration milestone

Implement Rust append/branch/reopen against real Pi files, retaining unknown entries
and canonical history. Use original SessionManager as the oracle and unchanged
Todo for cross-process continuation, including branch-local context policy. Preserve
upstream delayed first write and branch-pointer durability semantics or explicitly
record a proposed departure; do not claim fixed-file read parity covers them.
Then bind the coherent session module into the native host, replacing process-per-
read experiments. Node-API remains the primary candidate, not a final compatibility
claim. UI factory lifetime and async rejection/cancellation obligations also remain.

## Reproduce

```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_index
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-cases.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-todo.mjs
cargo test --locked
```

Results: experiments/pi-index-results.json, experiments/pi-index-todo-results.json.
Fixed source/fixture hashes in the index report. Dependency/version caveat in
real-plugin-host.md. No model calls, keys, extra dependencies or performance claim.

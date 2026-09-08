# Independent Pi session index review

Scope: pinned upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, read-only v3 tree indexing. The verifier created fixed JSONL inputs from upstream behavior before reading the Rust implementation; expected values execute the original `SessionManager.getEntries/getBranch`, `buildContextEntries` and `buildSessionContext`. The latter executes private `getSessionContextSettings`. Context message conversion uses the original `sessionEntryToContextMessages` on Rust-selected entries, and remains JS ownership.

## Initial results and counterexample

Initial 17 fixtures passed. An additional empty-string-ID fixture then failed the Rust executable (exit 1 from the verifier): JSONL contains a user entry with `id: ""` and another root entry with `id: "last"`; explicit `leaf: ""` yields upstream `branch: []`, `contextEntries: [last]`, but Rust yielded the empty-ID entry for both. Upstream checks JavaScript string truthiness before lookup. A related fixture checks an implicit leaf whose last ID is empty: the upstream branch is empty while context selects the last entry. This is a malformed-ish but upstream-readable string-ID case, not a reason to quietly narrow acceptance to UUIDs.

These fixed fixtures remain regression cases in `experiments/pi-index-cases.mjs`. Ordinary unknown leaves also deliberately produce different branch/context results: branch is empty, context falls back to the final entry. Duplicate IDs use the last definition in the index while preserving all file entries. Missing parent links terminate traversal. Compaction selection retains the latest summary and its kept range; settings are resolved on the full active path before compaction omits messages.

## Reproduction

```sh
cargo build --locked --example pi_session_index
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-cases.mjs
```

The verifier has 19 parity fixtures and three explicit rejection checks. It reports source and fixture hashes and exits nonzero on any mismatch. No provider is invoked and no credentials are read. The fixture oracle creates and removes its own temporary directories; it does not read user Pi sessions.

## Limits and intentional deviations

Version 2 migration, missing entry IDs, and cyclic ancestry are rejection checks, not parity checks. Cyclic traversal is intentionally not run in the upstream oracle because it can loop without a bound. A successful rejection is not full Pi compatibility. The Rust read-only parser does not reproduce upstream `loadEntriesFromFile` newline repair or session migrations/writes. In the unterminated-line case upstream may repair only the temporary oracle file; the comparison covers parsed entries, not repair parity.

This does not verify append, branch mutation, labels, session switching, real-model behavior, full SessionManager API, UI lifecycle, object identity, or all plugins. User/assistant/tool/custom null content conversion is exercised via original JS, not reimplemented Rust conversion. Structural parity cannot establish a production native binding, performance benefit, or broad compatibility.

## Final independent rerun

After coordinator fixed explicit and implicit empty-ID leaf selection, the independent command exited 0: 19 parity fixtures and three bounded rejection checks passed. Fixture SHA-256: `a8733eb69223141bbec377686c7a6c6695a6f194ec6e4df234d9be0e3c1bb6c8`. Upstream source SHA-256: `57bc70a751567b96c057535766240ae52d9b76d9013ea78049d74dc3b654e915`. The initial failing implementation is superseded; the counterexample is retained above and in the fixture suite.

An independent invocation of `experiments/pi-index-todo.mjs` also exited 0. Inspection of original Todo lines 118–132 confirms `session_start` reconstructs from `getBranch`, using stored tool-result details; the test feeds that method directly from Rust. Two distinct child Node processes restore alpha (excluding beta on a different branch), then add gamma in plugin memory with next ID 3. The source fixture stays byte-for-byte unchanged. This validates restore and in-memory continuation only: gamma is deliberately not persisted, so this is not write/resume equivalence or a new-process continuation of newly appended state. The facade implements only `getBranch` and makes no broader SessionManager claim.

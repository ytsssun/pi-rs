# M3 bounded targeted edit acceptance

Reference unchanged: Pi 9767ba275f3e9a5ee0f5c5342249b629ab1b2282. Parent runtime 5e2aebd. Scope frozen before integration: add useful targeted edit without claiming full Pi edit behavior.

- Accept current `{path, edits:[{oldText,newText}]}`. Locate unique exact ranges against original content, apply disjoint ranges without cascading. Reject empty/no-op/not-found/overlapping/ambiguous requests without modifying file. Preserve BOM and upstream line-ending normalization/restoration behavior.
- Count ambiguity in fuzzy-normalized space like upstream even when replacement matching is exact. Fuzzy-only replacement remains unsupported and explicit. Legacy single-edit argument coercion and generated diff/patch metadata remain unsupported.
- Route edit through existing mutation opt-in and persistent in-flight refusal; verify denied call leaves file unchanged and uncertain edit is not replayed.
- Compare actual original algorithm on fixed cases including failures, BOM/CRLF, Unicode and multiple blocks. Record instrumentation, result fields compared and deliberate deviations. Do not reimplement the upstream oracle.
- Run an edit→real test→exit→followup scenario with fixture decisions and inspect effects, plus M2 regressions. Real model access remains blocked separately (T008).

Ownership: coding_tools src/edit.rs/tests/edit.rs; round2_verify experiments/edit-*; coordinator dependency/module/CLI/journal wiring, acceptance/checkpoint and integration. Two workers + coordinator (below cap of four). unicode-normalization is permissively MIT/Apache-2.0 licensed; no distribution model change. Verify resolved metadata before commit.

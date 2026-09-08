# Independent Pi writer review

Status: **seven differential scenarios independently verified after fixing the reproduced failure**. This is an acceptance record, not a claim that the writer or complete Pi session compatibility has passed.

Starting pi-rs commit: `6e6a674af1c16749f6f8981e16e02614f37dd9e2`.
Pinned upstream: `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.

## Source-derived requirements

The reviewer authored `experiments/pi-write-cases.mjs` before receiving the writer implementation. Requirements come from `packages/coding-agent/src/core/session-manager.ts` at the pinned upstream:

- `_setSessionFile` (898–923): an existing valid file sets `flushed = true`, even if it has no assistant message; a missing explicit path remains unflushed.
- `_buildIndex` (978–997): all non-header entries are indexed and the last entry becomes the reopen leaf. Unknown entry types remain data.
- `_persist` (1029–1055): missing new sessions defer the first write until an assistant exists; first flush writes the complete file entry list. Existing flushed sessions append immediately. The check is over all entries, not only the current branch.
- `_appendEntry` (1058–1063): memory advances before persistence. The seventh case reproduces first-flush EEXIST and requires this memory-before-error ordering; it does not establish general crash guarantees.
- `branch` / `resetLeaf` (1374–1388): navigation moves only the in-memory leaf, never rewrites history; missing branch targets throw.

## Frozen acceptance cases

1. A new explicit-path session remains absent after custom/user entries, then first assistant flush includes all entries exactly once.
2. Branch navigation leaves bytes untouched; reopening restores last disk entry. A subsequent append to an earlier node preserves original bytes, creates a sibling path, and restores that new path on reopen.
3. Resetting leaf leaves bytes untouched; next append is a new root and survives reopen without deleting the prior root.
4. Opening a valid no-assistant file and appending a custom entry writes immediately.
5. Unknown entry types and their nested payload IDs/unicode survive append and reopen unchanged.
6. An invalid branch target throws without changing memory or disk.
7. A competing file appearing before first assistant flush causes an error without overwriting bytes; the attempted assistant nevertheless remains in memory, matching upstream append-before-persist ordering.

Generated header/entry IDs and entry timestamps are normalized for cross-backend comparison. Message timestamps and arbitrary nested payload fields are not normalized. File-preservation checks compare raw bytes before/after within each backend. Each run uses fresh temporary files and removes them afterward. Reopen in this harness means closing and constructing a fresh backend instance; the separate Todo experiment must prove actual new OS process recovery.

## Execution

Reference command (exit 0; seven scenarios, no model/API calls):

```sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs
```

Differential command (independent rerun exit 0, seven scenarios):

```sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs "$PWD/prototype/architecture/pi-store-backend.mjs"
```

The adapter module must export `createStoreBackend({path, cwd, mode})` and the documented Pi-shaped append/navigation/read methods. Awaiting methods supports both synchronous and asynchronous adapters.

## Limits

These deterministic fixtures do not prove live-model behavior, v1/v2 migration, corrupted-file recovery, exclusive locking, fsync/crash guarantees, production filename/ID allocation, all entry append methods, object-reference liveness, or full plugin compatibility. No test accepts agent-modified assertions as success. The verified results cover only the seven scenarios and the separate Todo run documented below.

## Independent execution and counterexample

The first six frozen cases passed the Rust/upstream differential (exit 0). The reviewer then examined append ordering and added a source-derived failure case before any fix. The seventh scenario passes upstream but failed Rust (exit 1):

```text
AssertionError: upstream advances memory before failed persistence
1 !== 2
actual: 1
expected: 2
```

Reproduction: create a new missing-path session, append a buffered user, create a competing file containing `concurrent-owner\n`, then append an assistant. Both backends reject the exclusive first write and preserve the competing bytes. Upstream retains the attempted assistant in memory; pre-fix Rust discarded it. This contradicts compatibility even though discarding failed writes could be a defensible independent design. The acceptance requirement was not changed to accept the discrepancy.

The reviewer independently ran `experiments/pi-store-todo.mjs` with the same TSX loader (exit 0): actual unchanged Todo plugin/wrapper, fresh seed/continue/verify Node processes, selected alpha branch restored instead of abandoned beta, gamma persisted, nextId 3, policy reset retained, and original file prefixes preserved. The reviewer inspected the driver: fixture assistant/tool-result messages are manually persisted; this is not a model-driven loop. JS process IDs are checked distinct. No credentials or model calls used.

## Fix verification

After the coordinator moved Rust's in-memory content/leaf assignment before file I/O, the reviewer reran the unchanged seven-case differential command: exit 0, `passed: 7`. Source inspection confirms `flushed` still becomes true only after the first successful complete write. The earlier memory-discard behavior is **superseded** by this fix; the red result above remains historical evidence. This checks one deterministic EEXIST failure, not disk-full recovery, crash atomicity, multiwriter coordination, or successful rollback.

Collaboration outcome: coordinator consumed the independently found EEXIST counterexample and changed implementation; the verifier reused the coordinator's actual Todo driver only after checking what its assertions and fixture messages establish. No user intervention was required.

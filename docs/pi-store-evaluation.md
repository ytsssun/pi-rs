# Rust Pi session writes — starting6e6a674

Status: implemented/tested v3 append/branch/reopen subset, not complete SessionManager.
Pinned upstream9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.

Rust `PiSessionStore` owns buffered history, selected leaf, first-flush state and
file writes, using `PiSessionIndex` for branch/context selection. The temporary
Unix test server holds one store continuously; synchronous helper processes only
transport requests. It does not recreate a store per call. IDs/timestamps/header
metadata are injected by the JS fixture adapter, not a claimed production ID/clock
implementation. Existing native CLI sessions are unchanged.

## Independent acceptance and a discovered failure

`experiments/pi-write-cases.mjs` uses actual upstream SessionManager as the oracle.
Seven fixed sequences compare normalized full entries/branches/files; generated
metadata is normalized, nested plugin payload fields are retained:

- New session custom/user entries remain buffered until the first assistant.
- Branch selection alone leaves file bytes unchanged; a child append makes it
  durable on reopen, preserving abandoned history.
- resetLeaf creates a new root on subsequent append.
- Existing files with no assistant append immediately rather than buffering again.
- Unknown entry types/nested payloads remain intact through append/reopen.
- Invalid branch rejects without changing memory or disk.
- First-flush file collision throws without overwriting the competing file but
  retains attempted appended entries in memory, matching upstream.

The last case was independently discovered after six green scenarios. Initial Rust
code updated memory only after successful I/O; upstream does so beforehand. Red
assertion: Rust retained1entry versus upstream2. Fixed ordering, independently
rerun all7successfully. This is observable nontransactional behavior, not a rollback
or concurrent-writer safety guarantee. Pre-fix failure retained in pi-write-review.md.

## Actual unchanged plugin persistence

`experiments/pi-store-todo.mjs` runs three separate Node processes, each backed by
a fresh persistent Rust server and actual upstream loader/runner/registered wrapper:

1. Todo adds alpha/beta; history/policy are Rust-written. Select alpha's branch,
   emit original session_tree hook and append durable branch marker.
2. Fresh process opens Rust store, emits session_start; unchanged Todo reconstructs
   alpha. Add gamma with ID2, persist its result/details and policy reset.
3. Another fresh process opens again; plugin reconstructs alpha/gamma, nextId3 and
   reset policy. Each stage retains previous canonical file bytes as a prefix.

No TS SessionManager is instantiated in that flow. Model messages are fixtures and
lifecycle is driven by the harness, so this is actual plugin persistence through
Rust, not independent model-driven coding or a full AgentSession integration.
Context policy persistence follows the branch; projection was tested separately.

## Remaining integration obligations

This module lacks old-version migration, complete header/label/tree interfaces,
concurrent access controls, crash/partial-write recovery and comprehensive arbitrary
JSON semantics. Opening missing files differs from upstream's create-on-open path;
only existing valid v3 files are accepted. Cycle/nonstring-ID rejections and scalar
edge limits remain from the index. Native binding integration and UI lifecycle are
still pending. No file-operation exception rollback is promised. No extra dependencies
or distribution change, no performance claim.

Next: bind this coherent session module into the Node-API host, removing helper
processes from the integration path while keeping them as a semantic comparison.
Session handles must be per-instance/per-environment with explicit cleanup; hold
no Rust mutable borrow while invoking plugin closures. Reuse these exact differential
and Todo acceptance sequences against native bindings. Then test actual UI factory
mount/disposal and assemble the architecture decision against the full inventory.
Avoid another cycle of isolated passing probes with no integration progress.

## Reproduce

```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_store
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/pi-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs
cargo test --locked
```

Artifacts: experiments/pi-write-results.json, experiments/pi-store-todo-results.json,
docs/pi-write-review.md. Setup/version caveat: docs/real-plugin-host.md. Temporary
children/directories cleaned up; test children do not inherit API credentials.

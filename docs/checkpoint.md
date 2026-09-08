# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit6e6a674af1c16749f6f8981e16e02614f37dd9e2; main authorized.
Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains fixed.
Rust PiSessionStore now owns v3 append, selected branch and reopen. Seven independent
upstream differential scenarios pass, including first-flush collision memory state
(original Rust mismatch fixed). Unchanged Todo persists gamma across three fresh
Node processes backed by Rust stores, restores correct IDs and branch-local policy.
No TS SessionManager in that Todo flow. Existing Cargo tests pass.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_store
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/pi-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs
cargo test --locked
```
Evidence: experiments/pi-write-results.json, experiments/pi-store-todo-results.json,
docs/pi-write-review.md. Design: docs/pi-store-evaluation.md. Dependency/version
caveats still in real-plugin-host.md. No credentials/live model calls.

## Limits and next integration milestone

Fixture adapter drives lifecycle and supplies IDs/clock; not a model-driven loop or
CLI integration. v3 only; no complete migration/header/labels, concurrent writers,
crash/partial-write recovery, missing-file create-on-open or full JSON edge parity.
Append failure may change in-memory state before disk succeeds, matching upstream.
No transactional rollback/safety claim. Policy persistence tested here; projection
and native object identity were previously tested separately.

Next integrate this Rust session module into the Node-API host with per-instance
ownership and cleanup, no borrow across JS callbacks. Reuse frozen writer/Todo
acceptance against native adapter; helper transport remains comparison only. Then
actual UI factory lifecycle and final architecture/inventory audit. D008 native
candidate remains provisional until integrated evidence, full compatibility target
unchanged. Do not repeat helper-only cases instead of integrating.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T027 read/write session subset tested;
T028 native session integration proposed next. D008 candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent writer fixture exposed failure-path memory ordering, fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

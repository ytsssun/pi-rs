# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit dc3393cad72e1dbfed4fce65bfa2594978a695a2, main authorized.
Pinned upstream 9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT).
Five deterministic prepared-tool cases compare equal between original upstream
execution and Rust-owned update acceptance/completion ledger: success, thrown
string, cooperative JS abort, undefined sink rejection, rejection with pending
peer. Actual loader/runner/registered-tool wrapper exercised. Independent reviewer
found two initial sink-error failures; fixes and pre-fix evidence retained.
Earlier live Rust dispatcher synchronous plugin reentry and context projection
comparisons remain valid within their recorded scopes.

Reproduce (no credentials):
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example async_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/async-tool-parity.mjs
```
Append `--fire-and-forget-counterexample` for expected exit1. Dependency setup and
Node version caveat: docs/real-plugin-host.md. Source hashes/cases/protocol trace:
experiments/async-tool-parity-results.json. Independent evidence:
docs/async-tool-contract-review.md. Design: docs/async-boundary-evaluation.md.

## Limits and next work

These are isolated architecture probes, not an integrated Rust model-driven loop.
JS retains original AbortSignal; Rust-originated cancellation, arbitrary reason
and result identity, multiple-sink rejection selection order, cancellation during
blocking RPC, synchronous sink throw,
process death during drain and reconnect/recovery are unverified. No transport
performance measurement, native binding comparison, live UI factory proof or real
Pi SessionManager/context-policy persistence yet. Full compatibility unproven.

Next decisive work: compare native binding against helper-based IPC for synchronous
callbacks and opaque JS values; test Rust-originated cancellation and live UI
objects staying in JS. Carry these requirements into a concrete ownership decision,
then verify real Pi session persistence with context editing before final judgment.
Do not spend another cycle repeating already-passing registry/projection cases.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 ongoing overall architecture assessment; T024 tested async boundary subset.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
scenario fixture was consumed by coordinator unchanged. Both discovered failures
were fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

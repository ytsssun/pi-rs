# Checkpoint M1 — runnable fixture vertical slice

2026-09-06. Project is newly initialized from an empty directory. Coordinator integrated disjoint native-worker artifacts; no existing work overwritten. No global memory settings changed. See git log for the integration commit.

## Resume engineering work

```sh
cd /Users/stevensun/repos/pi-rs
export PATH="$HOME/.cargo/bin:$PATH"
git status --short
python3 scripts/board.py list
cargo test --locked
cargo build --locked
python3 experiments/verify-runtime.py
sh scripts/bootstrap-upstream.sh
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
node prototype/test-extension-sidecar.mjs
```

Rust 1.98.1 pinned in rust-toolchain.toml, installed with minimal rustup profile; shell startup files were not changed. Node 22.18.0 used. Upstream ignored clone lives in vendor/pi-mono; bootstrap restores exact reference, refuses an existing different HEAD. Dependencies have Cargo.lock. Root license is MIT; adapted truncation source retains upstream MIT in compatibility/NOTICE. Full transitive license audit before distribution remains open.

## Current capability and evidence

- Rust input → fixture or HTTP-shaped model response → actual read tool → next response → final, with atomic versioned JSON session save/resume. CLI reproduction in README.md.
- 6 Rust tests cover interrupted/pending tool recovery, malformed/corrupt inputs, errors, confinement/read limit/UTF-8 and FIFO. Strict clippy passes after two style fixes.
- 13 independent CLI checks use separate processes and a local HTTP model double: see experiments/runtime-verification.json and verification.md. Actual tool output reaches the second request. No live model inference.
- 36 fixed upstream/Rust truncation cases match all output fields. This independent compatibility binary is not yet integrated into runtime read.
- One unchanged upstream protected-paths.ts extension runs in a Node JSONL sidecar; 7 cases pass. It is not yet connected to Rust or the full Pi loader.
- Context view truncation retains canonical tool results; editing policy is currently a CLI parameter, not a durable audit record.

## Important gaps and next tasks

1. T005: connect the proven Node extension bridge to Rust behind an explicit option; check real hook result, timeout, child death and malformed messages. Add a meaningful tool registration/context-hook probe before committing to general extension ABI. No WASM-only substitution.
2. T006: implement follow-up user turns and persistent context-projection decisions, then a narrow Pi v3 session import/context projection fixture (branch/compaction counterexamples). Keep native format distinct until tested.
3. T007: exact agent-loop conformance. Current HTTP length finish rejects before saving/executing assistant; upstream emits correlated error results and may continue. Safe no-execution is verified, exact behavior compatibility is not. Error flags currently encoded in tool text, sequential execution only.
4. T008: real provider access. No standard API keys were present; Codex auth exists but was not inspected/reused. Live adapter success, model quality, streaming, cancellation and failed-request usage are unknown. Continue independent fixture work without requesting credentials repeatedly.
5. Recovery hardening: crash injection around write/rename/fsync, session lock ownership/stale recovery, provider identity/fixture binding and concurrent access tests. Current read may replay after crash; adding mutating tools requires an explicit effect journal. Path confinement is not a malicious concurrent-filesystem sandbox.
6. Measure release startup/RSS separately from model/tool latency only after repeatable benchmark; do not claim Rust accelerates end-to-end tasks. TUI/all providers/full extension compatibility/multiplayer not M1 scope; multiplayer spike may proceed without waiting for full compatibility.

## Scheduler and human attention

Created and read back heartbeat `pi-rs-first-48-hour-cycle`, attached to this task, every 2 hours until 2026-09-08 22:53 UTC (15:53 PDT). Status ACTIVE. First creation rejected missing destination; retried with destination=thread and succeeded; no duplicate created. Saved automation config confirms cutoff. Actual later wakeup/host restart recovery has not yet occurred and is **unverified**. Local host and app must remain running; see official source in coordination.md. If a scheduled run cannot happen, these commands and records suffice for a new session; do not claim background progress.

On each wakeup select one bounded useful task, respect max 4 total agents and file ownership, save evidence and new checkpoint. Stop no-progress loops after two identical failures. Routine milestone reports at most twice per day; only notify on meaningful results or decisions/failure. Cycle endpoint is bounded by scheduler; if last scheduled run precedes cutoff, leave final handoff then rather than assume an extra cutoff wakeup. No pending user decision at M1.

## GitHub authorization (2026-09-06)

User authorized creating ytsssun/pi-rs and future autonomous pushes of suitable verified changes. Initial visibility is private; making it public is a separate decision. Commit and push integrated milestones after relevant checks; never include credentials or private session artifacts.

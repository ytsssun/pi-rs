# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commitc90c0e4d5c38839ce5d8dcf34330861e308d14a9, main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT) unchanged.
Real Pi SessionManager + unchanged Todo plugin now passes current-branch restore
in a separate process, continuation with correct IDs, policy projection/reset and
canonical file prefix retention. TS and Rust projections compare equal. Reading
policy from whole history fails the explicit negative case. Existing host default
regression byte-compares equal after optional manager/plugin-path injection.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example context_projection
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-session-context.mjs
```
Append `--all-entries-counterexample` for expected exit1. Results:
experiments/pi-session-context-results.json. Review: docs/pi-session-review.md.
Details: docs/pi-session-context-evaluation.md. Dependency/version caveats remain
in docs/real-plugin-host.md. No model calls or credential use.

## Limits and immediate next milestone

TS SessionManager still owns canonical state in this experiment; pi-rs CLI native
sessions are not Pi session compatibility. Manual fixture tool/lifecycle driving,
one-text-block projection only. No compaction/corruption/concurrency/crash/UI/full
AgentSession proof. Previous native/IPC tests retain their narrow recorded scopes.

Implement Rust read-only Pi session index and differential branch/context fixtures
against original SessionManager; connect unchanged Todo restoration to Rust-owned
state, then add append/branch/reopen before claiming session replacement. Preserve
unknown records; inventory missing-parent/version/compaction behavior explicitly.
This moves beyond passing experiments with TS still owning the core. Do not repeat
current projection cases without new evidence. Node-API remains primary integration
candidate; actual UI host/lifetime and async ownership are still required.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T026 real Pi session seam tested; T027 Rust
session authority proposed next. D008 Node-API primary candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
review findings established branch durability/custom-policy obligations without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

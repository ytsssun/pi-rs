# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit63c7e7950ba15d80c5c15573670609cae4fd2d1b; main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Rust Pi v3 index now selects branches, compaction-aware context entries and model/
thinking settings. Independent full-snapshot fixture comparison against upstream
passes; empty-ID mismatch found after initial green cases was fixed and retained.
Rejection cases are separate from parity counts in experiments/pi-index-results.json.
Unchanged Todo reads Rust-selected branch in two fresh processes (no TS manager),
restores alpha and adds gamma with correct ID. Continuation is in memory only.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_index
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-cases.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-todo.mjs
cargo test --locked
```
Evidence: experiments/pi-index-results.json, experiments/pi-index-todo-results.json,
docs/pi-index-review.md. Implementation: src/pi_session_index.rs; design and scope:
docs/pi-index-evaluation.md. No credentials/model calls; upstream setup caveats in
real-plugin-host.md still apply.

## Limits and immediate next milestone

Index is read-only, not CLI-integrated; original JS converts selected context
entries to messages. Legacy migration, label/header/tree interface, arbitrary JSON
edge semantics, append/branch/reopen, recovery and identity not complete. Missing
IDs/cycles rejected explicitly; no parity claim for those rejections or file repair.

Next implement Rust Pi append/branch/reopen with unknown records/canonical history
preserved, differential to actual SessionManager. Drive unchanged Todo through
persisted cross-process continuation and branch-local context policy. Include
upstream delayed initial flush and durable branch selection. Then integrate native
binding session authority; do not repeat fixed reads as a substitute. UI lifetime,
async sink rejection ordering and cancellation remain architecture obligations.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T027 Rust session index tested subset,
write/restore next. D008 Node-API primary integration candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent fixtures exposed empty-ID selection semantics, fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

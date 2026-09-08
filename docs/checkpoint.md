# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit68f5369705a03cf5cea31e3906a15331c52d36df, main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT) unchanged.
Native Rust Node-API probe runs unchanged Kimi plugin with actual loader/runner/tool
wrapper and matches TS control. Nested callbacks reenter Rust state; same-object,
Promise, exception and real Text/Theme identity pass. Native method invokes JS
AbortController preserving reason identity and listener reentry. UTF16 scalar
state fixes independently found lone-surrogate loss. No new dependencies.
Earlier IPC reentry, five async cases and TS/Rust context comparisons remain valid
within their scopes; full compatibility and final architecture are not proven.

Reproduce:
```
scripts/build-native-seam.sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-seam.mjs
```
Evidence: experiments/native-seam-results.json, docs/native-seam-review.md.
Setup/caveats: docs/real-plugin-host.md. Executed platform Darwin arm64 Node22.18.0;
upstream requires22.19+, Linux build option untested. No credential/model use.

## Decision candidate, limits and next work

Proposed primary integration candidate: Node-API plus unchanged upstream JS host.
Comparison and rationale: docs/native-seam-evaluation.md. TS is natural for plugins;
current evidence does not require whole runtime in TS. TS fork already demonstrates
context editing, so that capability alone does not establish a need or speed gain
for Rust. Rust runtime ownership remains the user's explicit goal.

Next: test real Pi SessionManager context policy persistence/reload and plugin
restore lifecycle, plus actual UI factory host invocation. Use those results and
full interface inventory to refine the architecture decision. Do not repeat passed
scalar reentry tests. Native prototype has callback-local handles only, no retained
references/background thread; its abort is test-triggered, not autonomous scheduler.
No UI mounting/disposal, full agent loop, session ownership or distribution proof.
Raw unsafe FFI is not production bindings; multi-rejection IPC ordering still open.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 ongoing architecture assessment; T025 tested native seam subset, D008 proposed
Node-API primary candidate. Full compatibility goal unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
review findings corrected UTF16 state and FFI declaration before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

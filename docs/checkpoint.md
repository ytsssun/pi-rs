# Current checkpoint — core-only Rust architecture evaluation

## Active goal and preserved constraints

User requests a Rust rewrite of only Pi core runtime with unchanged ecosystem
plugins and full compatibility. Assess whether TS host + Rust core can preserve
all semantics; compare TS fork control and Rust context-editing implementations.
Do not reduce compatibility scope, silently abandon Rust, or pursue the deferred
completion-check feature. User decision required only for core-goal/compatibility
changes, major licensing/distribution tradeoffs or real access blocks.

Starting commit0a934a0c792f47337a37a41abc45be608cc4935d; main authorized for pushes.
Pinned upstream9767ba275f3e9a5ee0f5c5342249b629ab1b2282, MIT. No credential access
needed this turn. Read docs/architecture-evaluation.md and docs/plugin-seams.md.

## Tested evidence, not full compatibility

Original probes still valid: TS transform/Rust projection4cases and JSON-copy
EventBus identity counterexample. New combined probe now loads unchanged Kimi
plugin through actual upstream loader/runner with real TypeBox. Both TS state and
Rust synchronous state pass activation, repeated/no-match search, tool execution
and stale API rejection. Actual upstream TS runAgentLoop confirms next3request
snapshots reflect activated tools. This is NOT a Rust-owned loop yet.

Actual context hooks compare TS control/Rust Session projection with valid
experiment state, preceding plugin edits, canonical isolation, audit, separate
Node process restore and reset. No Pi SessionManager, malformed-state parity,
multi-block message compatibility or live model quality claim.

Independent reviewer found/reproduced initial canonical-reprojection overwriting
preceding plugin edits. Corrected interface accepts current event view rather than
re-reading canonical messages. Negative option reproduces old failure (first TS
case); positive probes TS and Rust. See context-chain-counterexample.json.

## Precise next work

1. Prototype a LIVE Rust-owned loop/state operation calling JS and receiving a
   synchronous nested core read/write. Current spawnSync one-process-per-operation
   probe blocks Node and never invokes JS callbacks from Rust, so it cannot choose
   production transport. Compare callback RPC handling with in-process native
   binding; preserve sync return types and avoid two competing authoritative states.
2. Exercise AbortSignal/update callback propagation and failure/death cleanup with
   actual upstream tool wrappers. The present execute wrapper drops these arguments
   and makes no cancellation/partial-update claims.
3. Test UI live Component/Theme factory identity and lifetimes staying in JS;
   identify the minimal core notifications needed. Continue full inventory rather
   than assuming unused host bindings are implemented.
4. Extend context persistence comparison to real Pi SessionManager and plugin
   session restore before final architecture judgment. Current valid private
   experiment schema is explicitly not Pi session-format compatibility.
5. Independently audit evidence and alternatives, recommend IPC/native only when
   demonstrated; request decision if Rust/full-compatibility goals must change.

Reproduce combined result (no credentials):
`export PATH="$HOME/.cargo/bin:$PATH"`
`cargo build --locked --example compat_kernel`
`TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/real-plugin-architecture.mjs`
Append `--canonical-counterexample` for expected exit1 from disproven adapter.
Setup if dependencies absent: docs/real-plugin-host.md. npm ci --ignore-scripts
plus upstream hydrate:model-data were needed; no tracked upstream changes. Runtime
Node22.18 is below upstream22.19 requirement; no general support claim. Hydrated
public catalogs are not git-pinned but not exercised by these probes.

Results: experiments/real-plugin-architecture-results.json; source hashes included.
Actual loop remains original TS; registry/policy/projection can be Rust-owned.
Unexercised session/UI/model actions throw. Reproduce earlier probes per
architecture-evaluation.md. Do not claim full core rewrite or all-plugin parity.

## Continuation and previous evidence

Board T022 active architecture assessment; T021 superseded/deferred. Coordinator
owns experiments/integration; one worker owned real-plugin-host.mjs and its documentation, then independently
verified coordinator Rust/backend/combined probes, now done.2 concurrent agents used, cap4. Native usage unavailable;
zero project live model calls this turn. No background-uptime promise.

Previous live experiments remain valid: Luna matrices8/9 then7/9, with correct
code but omitted tests; all resume transport/history checks passed. Raw .runs and
.env remain ignored/private. Previous9/9 gate applies to that specific live
reliability trial, not architecture source/projection experiments. Full Pi
compatibility, performance advantage and final Rust/JS design are unproven.
History is retained in docs/checkpoint-history.md.

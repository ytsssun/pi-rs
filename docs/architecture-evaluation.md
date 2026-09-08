# Core-only Rust replacement: architecture evaluation in progress

Active objective: replace the Pi core runtime in Rust while existing ecosystem
plugins work unchanged with full compatibility. A fixed upstream version defines
reproducible observations, not a permanent license to ignore later upgrades or
unsupported interface categories. No core-goal change is authorized by this report.

Starting project commit0a934a0c792f47337a37a41abc45be608cc4935d; upstream
9767ba275f3e9a5ee0f5c5342249b629ab1b2282. Source hashes accompany experiments.
No live providers, account changes, or credentials needed for these experiments.

## What is now tested

1. `experiments/context-seam.mjs` invokes the pinned upstream
   streamAssistantResponse implementation after TypeScript stripping and appending
   an export. It applies a custom TS projection at existing transformContext,
   verifies conversion ordering, and compares captured model-facing messages with
   the real Rust Session.context method via examples/context_projection.rs.
   Four limits (none,0,2,100) include Unicode. All results equal and both preserve
   existing canonical message prefixes. A scripted stream returns a final answer.
2. `experiments/plugin-reference-seam.mjs` imports the unchanged upstream EventBus.
   A listener observes identical data object, mutates it, and runs before emit
   returns. A deliberately naive JSON-copy seam loses identity and caller-visible
   mutation. Keeping the bus local in JS preserves this example.

Reproduce:

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example context_projection
node --experimental-vm-modules experiments/context-seam.mjs
node --experimental-strip-types experiments/plugin-reference-seam.mjs
```

The context experiment compares normalized message projection only: identity
convertToLlm deliberately bypasses Pi wire-schema translation. It is NOT full
AgentSession, plugin loading, persistent TS policy, full TS fork, provider
inference, streaming/cancellation conformance or a performance benchmark. Unused
imports fail if unexpectedly invoked. Upstream function body is not copied into
the project or changed. The Rust example only calls existing projection; it does
not claim a newly integrated Rust core.

## Source evidence and hypotheses

- Upstream agent-loop.ts288-293 already runs transformContext before convertToLlm.
  Therefore the hypothesis "TS core prevents context editing" is contradicted.
  Durable policy/audit choices are still separate engineering work in either
  language. The experiment does not prove all desired editing semantics exist.
- Upstream extensions/runner.ts1034 onwards clones messages before running the
  context handler chain. This must be tested through actual ExtensionRunner next;
  the direct loop probe is insufficient evidence of plugin-chain compatibility.
- The bus counterexample rejects *naive serialization*, not all IPC or native
  designs. A JS-local event bus and UI objects could coexist with a Rust kernel.
  Which synchronous calls reach authoritative core state remains unresolved.

## Candidate architectures — proposed, not selected as proven

| Candidate | What stays JS | Rust ownership | Open proof obligation |
|---|---|---|---|
| TS fork/control | Existing core + entire ecosystem | None, comparison control only | Same durable context policy/edit/audit semantics, baseline maintenance changes |
| JS host + Rust subprocess | Loader, plugins, UI, local event bus and necessary live objects | Core state/loop via protocol | Reentrant callbacks, cancellation, synchronous state access and coherence without duplicating runtime |
| JS host + native Rust binding | Loader/plugins/UI + JS interfaces | Core state/loop behind bindings | JS thread affinity, object lifetimes, callbacks, exception propagation, cancellation and packaging |

TS fork is a control experiment, not an unapproved abandonment of Rust. A hybrid
may be viable; current evidence does not justify promising a transparent swap.
No end-to-end speed, startup, memory or concurrency advantage is asserted.

## Required remaining work before architecture decision

1. Build full compatibility-contract inventory from public types and actual
   loader/runner/session/provider/UI behavior. Cover extensions, npm imports,
   skills/prompts/themes, packages/discovery, configuration, session formats and
   cross-plugin interactions. Representative cases are evidence, not definition
   of "all plugins". Mark unknown/untested, never silently exclude categories.
2. Execute real ExtensionRunner context chain with unchanged extension(s), testing
   mutation isolation, event ordering, callbacks and errors. Then apply the same
   reversible context policy using a TS control and Rust implementation.
3. Persist and reload equivalent policy state and canonical history in both;
   cover edited/unedited requests and extension observations through resume.
   Record every retained upstream-core responsibility versus replaced Rust one.
4. Exercise at least one synchronous core-state call during a reentrant callback,
   plus cancellation and UI handle semantics. Determine whether process protocol
   can satisfy them or native binding must be prototyped. Do not emulate callbacks
   by dropping them, or redefine compatibility to match available JSON fields.
5. Independently review counterexamples and practical distribution/maintenance
   costs. Recommend an architecture with a compatibility coverage map, unresolved
   blockers, reasons and alternatives. Request user decision only if evidence
   requires changing Rust objective or full compatibility, licensing, or access.

## Current decision

Keep the goal active. Initial evidence supports retaining a JS ecosystem host and
using TS as an honest control; it does not yet choose subprocess versus native
binding or prove complete core replacement. Continue with actual extension-chain
experiments rather than live-model retries or the unrelated completion gate.

## Independent review

plugin_seams worker read and reran both probes successfully; bare cargo first
failed127 due PATH and absolute Cargo then built. It confirmed scoped claims,
noting identity conversion uses normalized messages and JSON-copy dispatch order
remains synchronous. Full source audit: docs/plugin-seams.md. Next concrete test
is unchanged kimi-deferred-tools through actual loader/runner against Rust-owned
active-tool state. This work is still incomplete; keep active goal running.

## Second experiment cycle: actual plugin host and durable projection

Combined experiment `experiments/real-plugin-architecture.mjs` now imports actual
pinned loader and ExtensionRunner with installed upstream dependencies; it loads
unchanged kimi-deferred-tools.ts and its actual TypeBox schemas. It compares TS
control with synchronous Rust file-backed state (`examples/compat_kernel.rs`).
Both preserve synchronous get/set activation, no-match/repeated search, Calculator
result and stale-context/API rejection. No plugin source patch or loader stub.

The experiment also executes original upstream runAgentLoop with deterministic
stream responses and registered plugin tools. At prepareNextTurn the host supplies
fresh tools from the backend. Three captured stream requests see search-only,
then search+Calculator twice; both tool results succeed. This removes the earlier
limitation of only inspecting a constructed requestTools snapshot. The loop is
still upstream TS, NOT a Rust loop implementation; no live inference is involved.

Actual ExtensionRunner context hooks apply the same persisted policy in both
controls. Unicode-aware projection, no-op audit behavior, prior plugin edits,
canonical isolation, separate Node process restore and reset pass. The TS control
uses an experiment schema equivalent to the native Rust Session for these valid
inputs; it does not implement Pi SessionManager or match Rust's corrupt-state
validation. A narrow one-text-tool conversion preserves other Pi message fields;
it cannot be used as evidence of full message/provider/session compatibility.

### Falsified adapter and correction

Independent reviewer identified that initial projectPi reconstructed tool results
from canonical state and overwrote prior plugin edits, even with policy disabled.
Reproduced exit1 and retained executable negative mode:
`--canonical-counterexample`; see experiments/context-chain-counterexample.json.
The corrected adapter passes the current event view into Rust projection without
persisting that view. Both disabled and enabled policies now preserve/apply to
preceding plugin changes. Existing9/9 live-test gate is unrelated to these pure
architecture probes; no live quality benefit claimed.

### Ownership demonstrated versus outstanding

| Responsibility | Actual owner in this experiment | Evidence/limit |
|---|---|---|
| TS extension loading, npm schemas, captured functions | Unmodified Pi JS host | Actual Kimi plugin loaded |
| Plugin context chain, errors, lifecycle/staleness | Unmodified Pi ExtensionRunner | Mutation/error/continuation and stale access tested |
| Active tool names | TS control or Rust state process | Synchronous operations and next-request visibility agree |
| Tool definitions/execution callbacks | JS host | Definitions and closures never serialized into Rust |
| Context limit/audit/canonical projection | TS control or Rust Session through process | Valid inputs, save/reload/reset, plugin-view separation |
| Agent loop, streaming event orchestration | Original TS loop | Rust replacement NOT demonstrated |
| Pi session manager, auth, UI, broader core calls | Guarded/unexercised host bindings | No compatibility claim |

Synchronous process calls deliberately block Node and start a new Rust process
per operation. They prove a seam can preserve this synchronous contract, not that
such IPC is a production recommendation. Reentrant calls originating from a live
Rust loop, async cancellation and UI handles still require direct experiments.
Native binding is still an unevaluated alternative. No throughput/latency/RSS
measurement or performance benefit has been claimed. Upstream dependencies are
experimental dev dependencies in ignored vendor, not a new distribution bundle.
Setup/version/hydrated-catalog limits: docs/real-plugin-host.md.

## Live Rust callback reentry (starting f4bcc19)

`examples/callback_kernel.rs` now holds tool activation state in one live Rust
process and initiates two scripted JS tool calls. `experiments/callback-reentry.mjs`
loads the unchanged pinned Kimi plugin through the actual loader/runner and invokes
actual `wrapRegisteredTool`. While a callback is pending, synchronous plugin
get/set calls connect to the same Rust server through a bounded helper process.
Rust observes Calculator activation before dispatching it. No shadow JS registry.
The wrapper's `addedToolNames` metadata is asserted, as is the upstream demo's42.

This supplies evidence that synchronous plugin APIs do not inherently require the
core state/dispatcher to remain TS. It does **not** select this transport: helper
process creation is deliberately crude, no throughput/latency claim is made, and
there is no live model-driven loop, native binding comparison, cancellation,
partial updates, UI or Pi session persistence in this experiment.

Additional checks: mismatched completion ID is rejected, injected JS failure clears
pending callback, and a sync call after confirmed kernel termination throws.
These are not evidence of rollback, transparent recovery or cancellation during a
blocked call. RPC read/write limits2seconds, parent helper deadline3seconds, callback
deadline5seconds; Unix-only experiment, no new dependency. Each run removes its
socket directory and terminates its child. Results and trace are in
`experiments/callback-reentry-results.json`.

Independent source review found previous direct `definition.execute` probes bypassed
upstream registered-tool wrapper metadata, and their original-loop bridge dropped
call ID/signal/update parameters. Previous narrow activation/context observations
remain valid; they never established complete tool execution equivalence. The new
probe uses the original wrapper. See `docs/callback-contract-review.md`.

Reproduce (no credentials):
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example callback_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/callback-reentry.mjs
```
Use dependency setup in `docs/real-plugin-host.md`. Next: cancellation/update
ordering across a genuinely pending async JS tool, including failure/death; then
native-binding comparison and remaining full-compatibility inventory. Keeping JS
closures/UI in their native host is plausible; full compatibility remains unproven.

Independent replay counterexample: initial dispatcher reused `search`/`calculate`
IDs and accepted a previous invocation's completion after another start. That
invalidated the broad stale-completion assertion (which only tried an unknown ID).
Fixed with checked monotonically increasing per-process generation IDs and an
explicit replay of the first real completion during the second invocation;
rejection must leave the pending invocation unchanged. IDs are not durable across
process restarts; recovery/transport reconnect remains unimplemented. Preserve
pre-fix reproduction in callback-contract-review.md.

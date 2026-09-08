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

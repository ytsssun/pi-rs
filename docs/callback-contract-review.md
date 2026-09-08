# Independent callback contract review

Status: **verified source inspection; proposed executable acceptance cases**. This is not a passing runtime test report.

Inspected pi-rs starting commit `f4bcc1931c0144f0049904ba2a04a7a6a2878ff0` and upstream `vendor/pi-mono` commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`. No credentials, models, upstream edits or dependency changes were used. The reviewer inspected upstream contracts independently rather than treating prior probe results as complete compatibility evidence.

## Sources and observable requirements

All paths below are relative to the fixed upstream root; line numbers refer to that commit.

| Source | Observed behavior | Required bridge behavior |
| --- | --- | --- |
| `packages/coding-agent/src/core/extensions/loader.ts:395-407` | `getActiveTools()` returns a string array synchronously; `setActiveTools()` invokes the runtime synchronously. Both first check extension liveness. | Unmodified plugins must receive an array, never a Promise. A successful setter must affect the next synchronous getter. Keep liveness checks in the actual loader. |
| `packages/coding-agent/examples/extensions/kimi-deferred-tools.ts:39-59` | Tool execution reads names, calls `.includes`, synchronously activates Calculator, then returns result details. `session_start` sets only `tool_search`. | Rust must service nested state requests while awaiting this JS callback, without requiring plugin edits or changing API types. Preserve state across calls; second matching search reports no newly added tool. |
| `packages/coding-agent/src/core/tools/tool-definition-wrapper.ts:5-18` | The wrapper forwards call ID, params, signal and update callback directly, and constructs runner context when no explicit context is passed. | Use this upstream path, with live JS callback/signal/context objects, instead of claiming direct definition invocation covers wrapping. Preserve optional/undefined signal and callback cases. |
| `packages/coding-agent/src/core/extensions/wrapper.ts:17-35` | The registered-tool wrapper reads active names before and after awaited execution. If no earlier name was removed, it merges newly active names into `addedToolNames`, deduplicating. If any earlier name was removed, it returns the result unchanged. | Check activation metadata as well as active state. Preserve additive versus replacement behavior and existing tool-provided `addedToolNames`. |
| `packages/coding-agent/src/core/extensions/types.ts:481-488`; `packages/agent/src/types.ts:384` | Execution returns a Promise; `signal` and `onUpdate` may be undefined; the update callback returns void. | A transport must not require plugins to await updates, serialize a callback as JSON, or substitute a boolean snapshot for a live signal. |
| `packages/agent/src/agent-loop.ts:677-717` | Each accepted update invokes the event sink immediately and records its completion Promise. After execution resolves or throws, additional updates are ignored; previously accepted sink promises are awaited before returning the outcome. Errors become error tool results. | Preserve update acceptance boundary, emission order and final-result barrier. Do not infer that a void update callback implies it is safe to discard delivery acknowledgments. |
| `packages/agent/src/agent-loop.ts:623-661` | Arguments are prepared/validated; before-tool hook runs; aborted signals prevent execution and produce `Operation aborted`. | Cancellation before dispatch differs from cancellation during plugin execution. A wrapper-only probe does not cover loop admission or hooks. |
| `packages/agent/src/agent-loop.ts:784-796` | Tool-result history includes nonempty `addedToolNames`, normalizes missing content, and records error status. | Activation result metadata can affect observable canonical history, not merely display. |

## Proposed bounded prototype acceptance

1. A persistent Rust process initiates an actual JS tool invocation; the unchanged Kimi tool reenters that *same* Rust process through the actual loader APIs. Capture process identity, nested request ordering, active state and final tool result. A fresh process per getter is not this experiment.
2. Compare against TS state using the actual upstream registered-tool wrapper. Assert initial search-only state, no-match state preservation, Calculator activation plus `addedToolNames`, repeated search with no new activation, and Calculator result. The upstream demonstration deliberately returns `42`; it is not an arithmetic-quality test.
3. Add a synthetic plugin to exercise synchronous get-after-set inside one callback. Use a bounded external deadline and retain the failed protocol trace if the Rust dispatcher blocks awaiting a callback instead of servicing nested requests. A timeout is evidence of this implementation's failure, not evidence that every IPC architecture is impossible.
4. Feed a live JS `AbortSignal` into a synthetic tool through the actual wrapper. After a first update is observed, trigger cancellation, assert the listener observes `aborted` and its reason, and that execution settles with the intended test error. Also exercise an already-aborted signal separately. Upstream wrappers do not force a noncooperating plugin to stop; forced termination would be a different behavior.
5. Check multiple update payloads, call ID and tool name, success and throwing-tool final outcomes. For loop compatibility, compare an asynchronous event sink against the original loop: updates accepted before settlement must finish before the end event; a retained callback invoked after completion must not emit another update. A bridge-only delivery test must explicitly leave these loop claims unverified.
6. For transport teardown, bound child exit and pending request rejection. Do not leave a deadlock test orphan running. Report cancellation during a synchronous nested request separately; a passing async cancellation test does not prove the blocked JS event loop can process an abort notification.

## Counterexamples and prior scope

- An asynchronous JSON getter returns a Promise; unchanged Kimi immediately calls `.includes` and fails. This follows directly from source, but remains a proposed executable negative case here.
- A Rust dispatcher that waits only for the outer callback result cannot satisfy that callback's synchronous nested getter. Likewise, blocking the JS thread while depending on the same thread's ordinary asynchronous response handler needs an explicit servicing mechanism. These are architectural failure hypotheses requiring a bounded reproduction, not measured results in this document.
- Serializing a signal's current `aborted` flag cannot notify an already-running listener later. Keeping JS signal objects local and sending cancellation control messages is a candidate, not proof of full signal semantics.
- At pi-rs `f4bcc19`, `prototype/real-plugin-host.mjs:60` calls the tool definition with a fresh signal and no update callback. `prototype/architecture/original-loop.mjs:14` forwards only name and arguments. Those previous probes cannot establish cancellation, update delivery, actual caller ID preservation or upstream registered-tool activation metadata. Their narrower previously reported assertions remain useful.

## Limits and next evidence

This review made no new runtime executions and establishes no performance benefit or architecture winner. It covers a small tool contract, not all extensions, UI object identity, providers, module loading, parallel dispatch, Pi SessionManager or context persistence. A working IPC nested-call prototype demonstrates feasibility only for its exercised operations. Native bindings remain an alternative requiring equivalent evidence before comparison. Coordinator should link its resulting executable traces to this review and mark each proposed case tested or still unverified; do not silently convert this source review into a runtime pass.

Reproduce the source inspection with `git -C vendor/pi-mono rev-parse HEAD`, inspect the paths and ranges above, and compare the two prior prototype call sites at pi-rs commit `f4bcc1931c0144f0049904ba2a04a7a6a2878ff0`. The first lookup incorrectly assumed the plugin lived at upstream `examples/extensions`; locating it under `packages/coding-agent/examples/extensions` resolved that read-only path error.

## Independent execution and counterexample (2026-09-07)

After this source review, coordinator supplied `examples/callback_kernel.rs` and `experiments/callback-reentry.mjs`. Reviewer executed:

```sh
PATH="$HOME/.cargo/bin:$PATH" cargo build --locked --example callback_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/callback-reentry.mjs
```

Both exited 0. The trace shows actual loader and registered wrapper using synchronous nested getters/setter while a persistent Rust server owns a pending `search` invocation. Search returns `addedToolNames: ["Calculator"]`, Rust sees the activation and dispatches Calculator, returning the upstream demo's `42`. The same server accepts the explicit reported-error branch, and a getter throws after server termination. Source confirms the helper processes only send socket requests; authoritative active/pending state lives in the single server. This proves this limited IPC reentry design can work. No cancellation/update/native/model/session behavior was exercised.

**Tested failure: cross-invocation stale completion.** The first draft's `staleCompletionRejected` claim was too broad: it only passed a never-issued literal `stale`. The server reused IDs `search` and `calculate` across runs. An independent socket client performed `set_tools([tool_search,Calculator])`, `start`, completed both dispatched IDs, `start` again, then replayed the *previous* search completion. Actual result:

```json
{"old_id":"search","new_id":"search","replayed_previous_completion":{"result":null},"state":{"result":{"active":["tool_search","Calculator"],"pending":"calculate"}}}
```

The stale result incorrectly advanced the new invocation. This is a concrete protocol correlation failure, not proof against IPC architecture. Coordinator received this evidence before integration, with a request for unique invocation IDs plus a regression case or an explicitly narrower claim. Retain this pre-fix result if repaired. The review client's first version incorrectly assumed one socket `recv` contained the entire JSON line and failed parsing partial data; replacing it with newline-framed `readline` produced the reported counterexample. All child processes were terminated and waited; temporary directories removed.

**Verified repair, same review cycle:** coordinator added a checked per-process generation counter (`search-1`, `calculate-1`, then `search-2`) and an explicit replay of the first invocation's ID while the next invocation is pending. Reviewer re-read the dispatch changes and independently repeated both build and experiment commands above: both exited 0. The new assertion rejects that prior ID and confirms pending state remains `search-2`; the valid second invocation error then clears pending. The original broad claim is **superseded** by `unknownCompletionIdRejected` and `previousInvocationReplayRejected`. IDs are not unique across server restarts, and no reconnect or recovery safety is established. Error responses are asserted but currently omitted from the successful-RPC trace array; the executable regression assertion, not that trace alone, is evidence for rejection.

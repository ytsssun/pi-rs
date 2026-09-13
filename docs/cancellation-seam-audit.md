# Cancellation seam audit

Current result: existing model-settlement primitives are tested; active cancellation is unimplemented. Run `node --experimental-strip-types experiments/cancel-settlement-probe.mjs` after building the native addon.

The probe uses actual Node-API/native storage: begin returns a requestId, an aborted model_result settles and persists once, duplicate completion is rejected without mutation, reopen permits a new request, and the previous completion cannot settle that new request. This is injected deterministic settlement, not cancellation of a live provider or tool.

The earlier claim that synchronous step/private waiting makes cancellation impossible was too strong. Existing runtime events already reach that state and already correlate completions by requestId (`src/pi_runtime.rs`). No evidence yet requires a new mutex/CAS/generation owner.

A concrete host limitation is `assembleNativeQueue` in `prototype/architecture/native-stream-bridge.mjs`: synchronous queue_poll(wait:true) loops block the JS event loop while streaming. Tools also receive newly created per-call AbortControllers rather than a shared cancellable drive signal. The next experiment should connect cooperative cancellation to an actually asynchronous tool first, retain the idle waiter until it settles, then independently address provider queue responsiveness. Arbitrary side effects cannot be described as rolled back or exactly-once.

## Historical audit — conclusions above supersede architectural necessity claims

# Cancellation seam audit

Status: **tested blocker** (2026-09-13, base `5b5e0b5`).

The Rust runtime currently exposes only synchronous `PiRuntime::step(&mut self, store, request)` actions. A `begin` returns one pending model/tool action; completion is accepted by `model_result`, `tool_result`, or `batch_result`. There is no cancellation event, cancellation token, task handle, or asynchronous provider/tool execution owned by Rust. `waiting` is private state and cannot be settled externally. Consequently an explicit cancel cannot reach the runtime, persist an aborted marker, release an idle waiter, or reject stale completion without inventing a parallel protocol.

The existing JavaScript abort path is provider/tool-local (`AbortSignal`) and is not Rust-originated; it cannot prove exactly-once settlement or persisted abort state. Adding a `cancel` branch to `step` alone would be unsafe because an in-flight host action is synchronous from Rust's perspective and the host has no Rust request id lifecycle to interrupt.

Required boundary for a real implementation: introduce an owned asynchronous drive handle with cancellation token and a single settlement transition (`Pending -> Aborted|Completed`), expose `cancel(requestId, reason)` through Node-API, append canonical aborted result before releasing idle waiters, and reject subsequent completion for the settled request. Add a deterministic blocking provider/tool fixture and subprocess resume assertions before claiming this seam.

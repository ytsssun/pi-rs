# Next milestone — parallel tool scheduling

**Status: blocked on protocol redesign, implementation next.** The current Rust action protocol returns one `tool` action and accepts one `tool_result`; a JS-only `Promise.all` would bypass Rust ordering, in-flight markers, and persistence. Parallel scheduling therefore requires a batch action with per-call request IDs and a batch completion event.

Required protocol shape:

```json
{"type":"tool_batch","batchId":"...","calls":[{"requestId":"...","call":{}}],"maxConcurrency":N}
```

The host may complete calls in any order. Rust persists results in source call order and emits the next model action only after every admitted call has an outcome. Sequential-marked calls force the existing single-action path. Cancellation and failure aggregation remain explicit acceptance cases.

## Upstream audit (pinned commit)

The reference `Agent` path preflights every call before any execution. Any registered tool with `executionMode: "sequential"` makes the entire assistant batch sequential. Parallel execution completes tool-end events in completion order but persists tool-result messages in source order, and termination requires every finalized result to request it. The preflight-abort regression requires zero executions when a later preflight aborts. These semantics must be implemented before claiming compatibility; a finite `maxConcurrency` is an explicit pi-rs extension, not upstream parity.

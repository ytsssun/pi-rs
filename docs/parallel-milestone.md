# Next milestone — parallel tool scheduling

**Status: blocked on protocol redesign, implementation next.** The current Rust action protocol returns one `tool` action and accepts one `tool_result`; a JS-only `Promise.all` would bypass Rust ordering, in-flight markers, and persistence. Parallel scheduling therefore requires a batch action with per-call request IDs and a batch completion event.

Required protocol shape:

```json
{"type":"tool_batch","batchId":"...","calls":[{"requestId":"...","call":{}}],"maxConcurrency":N}
```

The host may complete calls in any order. Rust persists results in source call order and emits the next model action only after every admitted call has an outcome. Sequential-marked calls force the existing single-action path. Cancellation and failure aggregation remain explicit acceptance cases.

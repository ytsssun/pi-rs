# Next milestone — parallel tool scheduling

**Status: proposed.** Native Rust currently drains tool calls sequentially. Pinned Pi dispatches calls in parallel unless any call is marked sequential, while preserving source call order in persisted results and allowing completion events to arrive out of order.

Acceptance:

1. Two independent unchanged-host tools overlap in execution, with a bounded concurrency limit.
2. A sequential-marked tool forces the batch into sequential mode.
3. Completion events may be out of order, but canonical persisted tool results follow assistant call order.
4. One failure does not silently cancel unrelated calls; all outcomes are persisted and the next model turn receives the complete batch.
5. Cancellation stops admission and reports aborted outcomes without replay after resume.

No performance claim is made; measure overlap and wall time separately from model/provider latency.

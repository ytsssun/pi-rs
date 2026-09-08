# M7 — native event and tool-hook parity

**Status: proposed** (2026-09-08). The current native runtime proves sequential state, persistence and context projection with fixtures. It does not yet prove Pi's observable agent-loop contract.

## Frozen acceptance

Against Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, a deterministic case must show:

1. The normalized agent/turn/message/tool lifecycle trace has the same ordering and identifiers in Rust and upstream.
2. `before_tool` and `tool_result` hooks run through the unchanged JS host, preserving argument identity, mutations and thrown errors.
3. Multiple partial tool updates are delivered in order; the turn completion waits for accepted asynchronous sink work, and updates after settlement are ignored.
4. A failed tool becomes the same observable error result and does not replay after a fresh-process resume.

These cases cover the sequential profile only. Parallel calls, steering/cancel, provider streaming and the public CLI remain separate milestones. Passing these fixtures is evidence of the tested contract, not full Pi compatibility.

## First differential result

`node experiments/compare-event-trace.mjs` was run against the integrated fixture and **failed**. The Rust driver emits internal `model`/`tool` action boundaries, omits `turn_start`/`turn_end`, and currently records three tool calls where the minimal upstream fixture has one. This is the intended red test: the fixture is now executable and exposes the gap; no compatibility claim is made.

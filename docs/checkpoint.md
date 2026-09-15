# Current checkpoint

At main `2473f6e`, the committed [live evidence](experiments/integrated-live-1adafc1/README.md) records three accepted bugfix stages and zero accepted resumed stages: 0/3 complete workflows, without steering. All resumed stages modified protected tests. This observation does not establish whether the cause is model behavior or runtime prompt delivery. The earlier checkpoint's pending-artifact statement is superseded; evidence was merged in PR #32.

The runtime is hybrid. Rust owns the action state machine, canonical store and context projection; the queue migration branch moves default steer/follow-up admission into Rust, while turn scheduling limits, custom/nextTurn queues and parts of failure handling remain in JS. PR #34 is merged as `770466d`; head `0352655eb5714b4c62ccb386f6bcdfe000e856a4` passed CI runs 34949269222 and 34949274996. Full Rust ownership and full Pi compatibility are not verified. The selected 37 capability groups are a provisional inventory, not a compatibility percentage.

## Current critical path

Move steer/follow-up queue admission and turn scheduling into Rust, preserving the unchanged Node plugin boundary defined in [AGENTS.md](../AGENTS.md). The bounded user-queue slice is merged; the full milestone remains open. Next is the Rust dispatch-budget migration. `node --experimental-strip-types experiments/dispatch-budget.mjs` characterizes the existing boundary: 15 tool rounds complete; 16 tool rounds exhaust the 32 dispatch iterations before the final model request. Both retain tool results and release host idle state. These are fixture results, not live-model evidence. Preserve this boundary during migration. Start by tracing current queue producers/consumers and freezing the pinned-upstream cases in `experiments/upstream-steer-boundary.mjs` and `experiments/user-steer-execution.mjs`.

Acceptance: Rust decides message admission and steer/follow-up ordering; JS forwards callback requests and executes returned effects. Deterministic tests must cover FIFO ordering, steer priority, terminal error/abort retention, failed admission without message loss, and the existing tool/fresh-process continuation cases. Retain failing cases and compare observable behavior with the pinned upstream. Update the architecture map, then require the relevant suite and exact-commit CI before integration. A successful migration does not resolve the recorded live instruction-following failure; prompt-delivery/upstream comparison remains a separate open investigation.

## History

[Archived checkpoint snapshots](checkpoint-history.md) retain superseded handoffs. [board.jsonl](board.jsonl) records decisions and evidence.

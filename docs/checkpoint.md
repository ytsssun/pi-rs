# Current checkpoint

Main `85e0c03` includes PR #34 user queues, PR #36 custom nextTurn staging, and PR #37 drive-level Rust budget. These are deterministic verified slices, not full Pi parity. Node still holds nextTurn pending handles and deferred custom delivery. Live evidence remains 0/3 complete protected-test workflows; see [results](experiments/integrated-live-1adafc1/README.md).

Independent budget audit found that rejected follow-up admission could append input before detecting exhaustion, leaving the same message queued. PR #38 (`462efea`) moves that check before persistence; exact CI passed. `cargo test --locked --test budget_admission` failed before the fix and passed after; the repair is merged. The immediate critical path is pending-handle lifecycle verification. The earlier 15/16 tool-round fixture did not cover this case.

The action-generation counter now lives in Rust. PR #39 (`85e0c03`) verifies 32 no-tool follow-up actions consume one drive budget; the 33rd is rejected and one unadmitted message remains queued. This is fixture-only. Pending lifecycle fixture independently passed on real host/native store: four prompt-preparation failures, two identical sends retained without duplicates, and idle replacement without message leakage. CI integration is pending. Next is moving nextTurn storage from Node pending handles into Rust at send time, preserving these regressions, then queue-mode differential testing. Preserve existing acceptance; retain failures and distinguish runtime policy from upstream defaults.

Nine leftover modified files were independently reproduced as exact rustfmt output from HEAD and preserved in a named git stash. Prior attribution to other workers was unsupported and is superseded. Use file-scoped formatting to avoid repeating this.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve earlier claims and corrections.

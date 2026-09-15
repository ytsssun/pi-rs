# Current checkpoint

Main `462efea` includes PR #34 user queues, PR #36 custom nextTurn staging, and PR #37 drive-level Rust budget. These are deterministic verified slices, not full Pi parity. Node still holds nextTurn pending handles and deferred custom delivery. Live evidence remains 0/3 complete protected-test workflows; see [results](experiments/integrated-live-1adafc1/README.md).

Independent budget audit found that rejected follow-up admission could append input before detecting exhaustion, leaving the same message queued. PR #38 (`462efea`) moves that check before persistence; exact CI passed. `cargo test --locked --test budget_admission` failed before the fix and passed after; integration is pending. This safety repair is the immediate critical path. The earlier 15/16 tool-round fixture did not cover this case.

The action-generation counter now lives in Rust, but equivalence to every old JS dispatch iteration is not established: terminal done iterations and follow-up boundaries need explicit differential tests before claiming an unchanged global limit. Next, finish those comparisons and Node pending-handle migration. Preserve existing acceptance; retain failures and distinguish runtime policy from upstream defaults.

Nine leftover modified files were independently reproduced as exact rustfmt output from HEAD and preserved in a named git stash. Prior attribution to other workers was unsupported and is superseded. Use file-scoped formatting to avoid repeating this.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve earlier claims and corrections.

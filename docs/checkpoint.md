# Current checkpoint

Main `d7a2338` includes Rust user queues, a drive-level action budget with admission-safety checks, and send-time nextTurn storage. PR #43 head `cb9ca6ea907bfff700cd50a74ffa6a3d8161876b` passed CI runs 35015384939 and 35015394505. Native lifecycle fixtures cover retry, independent identical sends, snapshots, and idle replacement. Node still dispatches effects, invokes upstream hooks, and handles deferred custom delivery. This is partial Pi compatibility, not a completed core replacement.

Live-model evidence remains 0/3 complete protected-test workflows; [results](experiments/integrated-live-1adafc1/README.md). No new live calls were made during queue migration. Rust budget fixtures prove bounded tool/follow-up execution, not exact equivalence to every old JS done-iteration count or upstream default limits.

## Current critical path

Worker is implementing and comparing upstream `all` / `one-at-a-time` user queue modes from `d7a2338` in an isolated worktree. Acceptance: executable pinned-upstream oracle, FIFO and mode-specific model contexts, steer priority, error/abort retention, default behavior unchanged. Selection belongs in Rust. Scope remains the supported final-response boundary; tool-boundary steering and full lifecycle are separate gaps. Coordinator must independently reproduce and require exact-SHA CI before integration.

PR #43 required repairs for omitted display normalization, Rust-backed nextTurn inspection, and preserving invalid user-nextTurn rejection before provider calls. Earlier local subsets missed these interactions; run combined replacement and steer gates after inspection API changes. Failed CI remains recorded in the board.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve evidence and corrections. The named coordinator rustfmt stash preserves nine unrelated formatting-only files; no worker ownership is inferred.

# Current checkpoint

Main `d7a2338` includes Rust user queues, a drive-level action budget with admission-safety checks, and send-time nextTurn storage. PR #43 head `cb9ca6ea907bfff700cd50a74ffa6a3d8161876b` passed CI runs 35015384939 and 35015394505. Native lifecycle fixtures cover retry, independent identical sends, snapshots, and idle replacement. Node still dispatches effects, invokes upstream hooks, and handles deferred custom delivery. This is partial Pi compatibility, not a completed core replacement.

Live-model evidence remains 0/3 complete protected-test workflows; [results](experiments/integrated-live-1adafc1/README.md). No new live calls were made during queue migration. Rust budget fixtures prove bounded tool/follow-up execution, not exact equivalence to every old JS done-iteration count or upstream default limits.

## Current critical path

PR #44 merged as `7f38537`: `all` / `one-at-a-time` user queue modes passed six executed upstream/native context comparisons and CI runs 35021981722 / 35021986171. Scope remains final-response boundary.

Current task: actual tool-boundary steering comparison. Audit commit `81e88c4` is not integrated: its upstream half never executes a tool, so its compatibility conclusion is rejected. Native observed context delays steer until after one additional model call. Pinned `agent-loop.ts:257` polls steering after tool results/turn_end; this suggests a real timing gap, pending equivalent executed oracle. Worker is replacing the unrelated upstream smoke with the same tool scenario on both sides. Acceptance: equal inputs, tool-time enqueue, recorded next-model contexts, execution count and signal state; then implement the smallest Rust-owned correction supported by that evidence.

PR #43 required repairs for omitted display normalization, Rust-backed nextTurn inspection, and preserving invalid user-nextTurn rejection before provider calls. Earlier local subsets missed these interactions; run combined replacement and steer gates after inspection API changes. Failed CI remains recorded in the board.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve evidence and corrections. The named coordinator rustfmt stash preserves nine unrelated formatting-only files; no worker ownership is inferred.

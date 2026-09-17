# Current checkpoint

Current software is our custom headless CLI plus Rust runtime, reusing selected original Pi components. It is **not an unchanged upstream CLI with core swapped out**. Executed negative injection probe fails at missing Agent.subscribe. [Review and next acceptance](core-replacement-review.md) supersede earlier ambiguous claims.

PR55 selected-model binding merged as 8b46fa3 after head 3f82d14 passed CI35171053480/35171049960. Earlier Rust lifecycle and provider text conversions remain integrated. Live protected-test workflows remain unsuccessful for pi-rs; upstream single baseline passed but requests differ. No full compatibility or daily-use reliability claim.

## Current critical path

Build an Agent-compatible Rust adapter under unchanged upstream AgentSession. Worker `/root/upstream_agent_adapter` owns an isolated prototype from 4f39af7, not main. Coordinator independently audited required direct methods/state in the review. Upstream Session persists message_end itself and installs prepareNextTurnWithContext; avoid double durable writes and honor per-turn refresh.

Frozen acceptance: upstream AgentSession executes deterministic tool edit, awaited message/tool/lifecycle events, queued follow-up, settlement and process reopen; external result checks; instrument Rust action ownership to exclude accidentally running upstream Agent loop. First artifact may establish only construction/one prompt; record remaining criteria rather than declaring milestone complete. No TUI/live/provider expansion until this seam is proven.

Recovery: inspect worker worktree/commits, or continue locally after capacity failure. Read only relevant review/board records. The old custom CLI remains runnable while integration is experimental. Merge-run CI for PR55 and this docs update still needs inspection.

## History

[Historical checkpoints](checkpoint-history.md) and [board](board.jsonl) preserve failures, wire/live evidence and corrections. Preserve unrelated worktrees and stash. Existing push authorization does not authorize release or new external communications.

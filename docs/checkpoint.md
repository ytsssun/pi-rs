# Current checkpoint

Current software is our custom headless CLI plus Rust runtime, reusing selected original Pi components. It is **not an unchanged upstream CLI with core swapped out**. Direct module injection fails at missing Agent.subscribe, but the new experimental Agent-shaped adapter passes the scoped SDK probe. [Review and next acceptance](core-replacement-review.md) supersede earlier ambiguous claims.

PR55 selected-model binding merged as 8b46fa3 after head 3f82d14 passed CI35171053480/35171049960. Earlier Rust lifecycle and provider text conversions remain integrated. Live protected-test workflows remain unsuccessful for pi-rs; upstream single baseline passed but requests differ. No full compatibility or daily-use reliability claim.

## Current critical path

Experimental adapter now runs under unchanged upstream AgentSession. Both upstream Agent and Rust adapter pass the same deterministic edit + queued follow-up, exact event sequence, canonical six-message history and fresh-process read assertions. Native trace proves Rust selected model/tool actions. Commands: `node --experimental-strip-types experiments/agent-session-rust-probe.mjs` and the same with `--upstream` (build native addon first).

Not verified: original CLI injection, fresh-process continuation, streaming updates, cancellation/recovery, full Agent API, or live model with this adapter. The scratch Rust journal is temporary; upstream SessionManager is canonical. No full compatibility claim.

Next frozen acceptance: fresh process opens the upstream canonical session, initializes Rust context from that history, executes a second independent edit through unchanged AgentSession, and verifies old history was neither lost nor duplicated. Then test the original CLI startup seam. No TUI/provider expansion.

Worker capacity failure was handled locally; artifacts and initial queue/edit failures are recorded in the review/board. Current branch CI must pass before integration. Recovery: inspect Git status and exact-head GitHub checks, run the two probe commands, then extend fresh-process continuation. Preserve `/tmp/pi-rs-agent-adapter` until integration.

## History

[Historical checkpoints](checkpoint-history.md) and [board](board.jsonl) preserve failures, wire/live evidence and corrections. Preserve unrelated worktrees and stash. Existing push authorization does not authorize release or new external communications.

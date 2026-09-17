# Current checkpoint

Current software is our custom headless CLI plus Rust runtime, reusing selected original Pi components. It is **not an unchanged upstream CLI with core swapped out**. Direct module injection fails at missing Agent.subscribe, but the new experimental Agent-shaped adapter passes the scoped SDK probe. [Review and next acceptance](core-replacement-review.md) supersede earlier ambiguous claims.

PR55 selected-model binding merged as 8b46fa3 after head 3f82d14 passed CI35171053480/35171049960. Earlier Rust lifecycle and provider text conversions remain integrated. Live protected-test workflows remain unsuccessful for pi-rs; upstream single baseline passed but requests differ. No full compatibility or daily-use reliability claim.

## Current critical path

Experimental adapter now runs under unchanged upstream AgentSession. Both upstream Agent and Rust adapter pass the same deterministic edit + queued follow-up, exact event sequence, canonical six-message history and fresh-process read and continuation assertions. Native trace proves Rust selected model/tool actions. Commands: `node --experimental-strip-types experiments/agent-session-rust-probe.mjs` and the same with `--upstream` (build native addon first).

Not verified: production CLI replacement, streaming updates, cancellation/recovery, full Agent API, or live model with this adapter. The scratch Rust journal is temporary; upstream SessionManager is canonical. No full compatibility claim.

Fresh-process continuation now passes locally: upstream canonical history seeds a new scratch runtime; second edit succeeds and canonical history grows from 6 to 10 messages with the original prefix unchanged. PR56 merged as fd12f42 after both exact-head checks passed.

Original upstream CLI now passes a two-process fixture probe with an explicit ESM package substitution and no vendored file edits: `node --experimental-strip-types experiments/upstream-cli-rust-probe.mjs`. Both processes execute original edit tools via Rust actions; canonical history grows from 4 to 8 messages with its original prefix preserved. This test-only facade preallocates one Agent and replaces the model stream with a fixed fixture; SDK options are not fully forwarded. It is not a production integration mode. PR57 merged as 1f985bb after exact-head CI passed.

Next frozen acceptance: replace the test-only singleton facade with a reusable synchronous Agent constructor, preserve SDK stream/conversion/context options, and repeat original CLI new/resume acceptance with a local deterministic provider through the original provider stack. Keep network credentials out of fixture children. No live success or broad compatibility claim until separately exercised.

Worker capacity failure was handled locally; artifacts and initial queue/edit failures are recorded in the review/board. Current branch CI must pass before integration. Recovery: inspect Git status and exact-head GitHub checks, run the two probe commands, then implement the reusable Agent constructor and original-provider fixture. Preserve `/tmp/pi-rs-agent-adapter` until integration.

## History

[Historical checkpoints](checkpoint-history.md) and [board](board.jsonl) preserve failures, wire/live evidence and corrections. Preserve unrelated worktrees and stash. Existing push authorization does not authorize release or new external communications.

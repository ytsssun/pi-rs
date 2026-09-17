# Current checkpoint

Current software is our custom headless CLI plus Rust runtime, reusing selected original Pi components. It is **not an unchanged upstream CLI with core swapped out**. Direct module injection fails at missing Agent.subscribe, but the new experimental Agent-shaped adapter passes the scoped SDK probe. [Review and next acceptance](core-replacement-review.md) supersede earlier ambiguous claims.

PR55 selected-model binding merged as 8b46fa3 after head 3f82d14 passed CI35171053480/35171049960. Earlier Rust lifecycle and provider text conversions remain integrated. Live protected-test workflows remain unsuccessful for pi-rs; upstream single baseline passed but requests differ. No full compatibility or daily-use reliability claim.

## Current critical path

Experimental adapter now runs under unchanged upstream AgentSession. Both upstream Agent and Rust adapter pass the same deterministic edit + queued follow-up, exact event sequence, canonical six-message history and fresh-process read and continuation assertions. Native trace proves Rust selected model/tool actions. Commands: `node --experimental-strip-types experiments/agent-session-rust-probe.mjs` and the same with `--upstream` (build native addon first).

Not verified: production CLI replacement, cancellation/recovery, full Agent API, or live model with this adapter. The scratch Rust journal is temporary; upstream SessionManager is canonical. No full compatibility claim.

Fresh-process continuation now passes locally: upstream canonical history seeds a new scratch runtime; second edit succeeds and canonical history grows from 6 to 10 messages with the original prefix unchanged. PR56 merged as fd12f42 after both exact-head checks passed.

Original upstream CLI now passes a two-process fixture probe with an explicit ESM package substitution and no vendored file edits: `node --experimental-strip-types experiments/upstream-cli-rust-probe.mjs`. Both processes execute original edit tools via Rust actions; canonical history grows from 4 to 8 messages with its original prefix preserved. This test-only facade preallocates one Agent and replaces the model stream with a fixed fixture; SDK options are not fully forwarded. It is not a production integration mode. PR57 merged as 1f985bb after exact-head CI passed.

Reusable synchronous Agent construction and SDK stream/context option forwarding now pass local tests. `node --experimental-strip-types experiments/upstream-cli-provider-probe.mjs` (also `--upstream`) runs the unchanged CLI through its original HTTP provider stack against a local SSE fixture: 4 requests, two processes, 8 canonical messages with original prefix and restored provider context intact. `experiments/agent-adapter-options.mjs` checks transform-before-convert ordering, option identity and independent instances. PR58 merged as 4e75671; merge CI passed. PR59 merged as bcee885 after exact-head CI35204762713/35204744632 passed; not live-model validation.

Streaming fixture now passes locally through original CLI: exact toolcall/text update event order matches upstream in both new/resume processes, four message_end events each and no duplicated canonical records. The provider probe contains these assertions. PR60 merged as 0fdcbb8 after exact-head CI35221184776/35221167862 passed; merge CI also passed.

Provider exception recovery now passes six local upstream/native comparisons: failure at stream creation, iteration or final result, each with/without abort. Temporary partial state is removed, Rust constructs terminal error/aborted messages, event signatures match, and a second prompt on the same Agent succeeds. Command: `node --experimental-strip-types experiments/agent-adapter-failure.mjs`. Initial implementation failed by propagating exceptions and leaving native model state waiting. This fix awaits exact-head CI.

Next frozen acceptance: exercise cancellation through unchanged AgentSession (including its abort/wait semantics), plus provider-returned aborted/error messages rather than thrown exceptions. Verify idle state, canonical history, queue retention and a later successful prompt. Current abort evidence covers abort followed by a thrown provider error only; cooperative tools and ignored abort signals remain unverified.

Worker capacity failure was handled locally; artifacts and initial queue/edit failures are recorded in the review/board. Current branch CI must pass before integration. Recovery: inspect Git status and exact-head GitHub checks, run the two probe commands, then verify partial-stream failure and cancellation recovery. Preserve `/tmp/pi-rs-agent-adapter` until integration.

## History

[Historical checkpoints](checkpoint-history.md) and [board](board.jsonl) preserve failures, wire/live evidence and corrections. Preserve unrelated worktrees and stash. Existing push authorization does not authorize release or new external communications.

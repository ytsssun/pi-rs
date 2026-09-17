# Current checkpoint

The installed pi-rs still uses our custom headless CLI. A separate experimental Agent adapter now runs the **unchanged upstream CLI and AgentSession**, using Rust model/tool scheduling and the original provider/tool stack. It is not yet the production entry point or a complete Pi replacement.

## Verified scope and current work

- Original CLI new/resume succeeds against a local HTTP/SSE fixture: two processes, four requests, preserved eight-message canonical history. Streaming text/tool event order matches upstream. Run `node --experimental-strip-types experiments/upstream-cli-provider-probe.mjs` (also `--upstream`).
- Provider exceptions at creation/iteration/result, with and without abort, match upstream and allow same-Agent reuse. PR61 merged as 6b659d8 after CI35227417972/35227398370 passed.
- Current branch adds **Session-level returned errors and cooperative abort/wait**, with and without queued follow-up. Both compare against original Agent/Session, including canonical history and later reuse. Run `node --experimental-strip-types experiments/agent-session-cancel.mjs` and `--queue`.
- Queue scenario initially failed because Agent.continue was unsupported. Rust now accepts `continue_queued` only after settlement with pending input; Rust chooses/consumes the queue and starts the new lifecycle. Targeted Rust guard test passes. PR62 merged as 275ec85 after CI35257021859/35247660542 passed.

All above are deterministic tests, not new live-model success. Historical live protected-test workflows failed for the custom pi-rs path; the experimental upstream CLI path has not yet been live-tested.

## Limits and next critical path

No production installation switch, complete Agent API, compaction/history replacement, full plugin coverage or tool-cancellation claim. Canonical persistence remains upstream SessionManager; the native journal is scratch. `continue()` supports queued input and scoped last-error retry; arbitrary transcript continuation/compaction remains unsupported. `clearAllQueues` remains unsupported.

Automatic retry now passes locally against original Session: `node --experimental-strip-types experiments/agent-session-retry.mjs`. Rust validates that active context differs only by the last failed assistant, excludes that entry from model context without changing the journal, and starts a new model turn without adding a user. Five canonical versus four active messages after retry and later reuse; provider-context assertions exclude the error and duplicate user. Full Rust tests/clippy and CLI provider regression passed. Pending exact-head CI before integration. The pre-fix failure is preserved in the board and commit ad84c71.

Scope: `continue()` supports queued inputs and this validated last-error retry, not arbitrary transcript replacement or compaction. Retry projection is process-local to the scratch runtime; upstream canonical persistence is unchanged.

Controlled live run now has an exact source commit `6597de1` and explicit `rust-core` engine. `gpt-5.4-mini`, upstream `9767ba2`, one repetition, no manual steering, context editing off. Stage 0 passed in 8.31s: real model fixed `maths.add`, ran the repository test, and preserved protected files. Stage 1 exited 0 in 7.06s and ran tests, but modified protected `test_maths.py`; the repetition failed external acceptance. Every request included the repository instruction, so this is a model/task-following failure, not missing-context evidence. Usage total: 18,178 tokens. Artifacts: `/tmp/pi-live-rust-core-corrected-20260917`; summary copied to `docs/experiments/rust-core-live-20260917/summary.json`. Earlier `/tmp/pi-live-adapter-20260917c,d` runs are historical and explicitly marked as mislabeled/non-controlled.

Next acceptance: use a task that does not ask the model to modify a protected test file, while keeping external tests protected, then run three clean repetitions of new/resume coding. This distinguishes model instruction adherence from runtime resume. Keep the current failure and exact artifacts; do not alter acceptance to make it pass. No context-editing expansion until live resume succeeds.

## Recovery

Inspect Git status and exact-head PR checks before integration. Build with `python3 scripts/build-native-session.py`; run Session cancellation cases and provider CLI probe. Run Rust tests/clippy for runtime changes. Coordinator owns CI through terminal status. Worker capacity failures are handled locally; do not redispatch unchanged work indefinitely.

## History

[Historical checkpoints](checkpoint-history.md), [board](board.jsonl), and [core integration review](core-replacement-review.md) preserve earlier scope and failures. Existing push/merge authorization does not authorize releases or new external communications.

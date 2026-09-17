# Current checkpoint

The installed pi-rs still uses our custom headless CLI. A separate experimental Agent adapter now runs the **unchanged upstream CLI and AgentSession**, using Rust model/tool scheduling and the original provider/tool stack. It is not yet the production entry point or a complete Pi replacement.

## Verified scope and current work

- Original CLI new/resume succeeds against a local HTTP/SSE fixture: two processes, four requests, preserved eight-message canonical history. Streaming text/tool event order matches upstream. Run `node --experimental-strip-types experiments/upstream-cli-provider-probe.mjs` (also `--upstream`).
- Provider exceptions at creation/iteration/result, with and without abort, match upstream and allow same-Agent reuse. PR61 merged as 6b659d8 after CI35227417972/35227398370 passed.
- Current branch adds **Session-level returned errors and cooperative abort/wait**, with and without queued follow-up. Both compare against original Agent/Session, including canonical history and later reuse. Run `node --experimental-strip-types experiments/agent-session-cancel.mjs` and `--queue`.
- Queue scenario initially failed because Agent.continue was unsupported. Rust now accepts `continue_queued` only after settlement with pending input; Rust chooses/consumes the queue and starts the new lifecycle. Targeted Rust guard test passes. PR62 merged as 275ec85 after CI35257021859/35247660542 passed.

All above are deterministic tests, not new live-model success. Historical live protected-test workflows failed for the custom pi-rs path; the experimental upstream CLI path has not yet been live-tested.

## Limits and next critical path

No production installation switch, complete Agent API, compaction/history replacement, full plugin coverage or tool-cancellation claim. Canonical persistence remains upstream SessionManager; the native journal is scratch. `continue()` currently supports queued input after an assistant, not general transcript continuation after retry/compaction. `clearAllQueues` remains unsupported.

Current reproducible gap: `node --experimental-strip-types experiments/agent-session-retry.mjs --upstream-only` passes, while the same command without that flag fails with `queued continuation requires a settled run and queued input`. This intentionally failing native probe is not included in the green compatibility suite yet; it freezes the pending acceptance, not a completed feature.

Upstream `_prepareRetry` removes the failed assistant from Agent state but retains it in canonical history. Acceptance: retry without duplicating the original user, preserve failed attempt in canonical history, exclude it from model context, finish successfully and accept a later prompt. The fixture expects five canonical messages versus four active Agent messages after recovery. Implement Rust transcript continuation/context selection with validation, preserving queue guard semantics. Do not erase the canonical failure or route this through another prompt.

## Recovery

Inspect Git status and exact-head PR checks before integration. Build with `python3 scripts/build-native-session.py`; run Session cancellation cases and provider CLI probe. Run Rust tests/clippy for runtime changes. Coordinator owns CI through terminal status. Worker capacity failures are handled locally; do not redispatch unchanged work indefinitely.

## History

[Historical checkpoints](checkpoint-history.md), [board](board.jsonl), and [core integration review](core-replacement-review.md) preserve earlier scope and failures. Existing push/merge authorization does not authorize releases or new external communications.

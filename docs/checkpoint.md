# Current checkpoint

Main `12fe88b` includes Rust-owned start/turn/end lifecycle and bounded formal CLI continuation after a normal agent_end callback enqueues followUp. PR #50 head e554ae24f76acf93412cf68df85226f0865c024a passed CI 35111871367 and 35111757424. Independent checkout `/tmp/pi-agent-end-verify` rebuilt and passed cli-end-continuation, end-continuation-budget and core agent-end-lifecycle fixtures. The CLI uses two runs/contexts and persists each user once; repeated callbacks stop at 32 requests with one unadmitted message retained. Merge CI35115453270 was still running at this update.

Live-model evidence remains **0/3 complete protected-test workflows**. No new live result, full ecosystem compatibility or percentage claim. Formal Session steer/error/abort cases, streaming/UI, parallel cancellation and provider exception lifecycle remain gaps.

## Current critical path

Provider exception lifecycle: branch `codex/provider-failure-lifecycle`, worktree `/tmp/pi-provider-failure-lifecycle`, contains intentionally failing `experiments/provider-failure-lifecycle.mjs`. Executed comparison shows upstream emits turn_end and agent_end with one failure assistant message and resolves; native emits only start events and rejects. This red experiment is outside main/CI until implemented. Run with `node --experimental-strip-types experiments/provider-failure-lifecycle.mjs` after building native addon.

Next: Rust handles a provider-failure action, persists a correctly shaped failure assistant and decides end events/recovery. Node reports provider exceptions as effects. Trace existing native-start/command-idle failure tests: they currently require rejection, so document the upstream-backed contract change and preserve their cleanup/recovery assertions rather than silently deleting them. Cover stream creation, iteration and result failures; keep context-hook/tool errors distinct. Validate failure payload, exactly-once end, pending queues and next successful drive before integrating. Full Session retry/compaction is outside this bounded slice.

## Recovery and history

Check merge CI first. Inspect the failure worktree and branch; worker capacity repeatedly failed, so continue locally. [Archived checkpoints](checkpoint-history.md) and append-only [board](board.jsonl) retain failures and prior evidence. Preserve unrelated stash/worktrees.

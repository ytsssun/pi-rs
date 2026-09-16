# Current checkpoint

Main `12fe88b` includes Rust-owned start/turn/end lifecycle and bounded formal CLI continuation after a normal agent_end callback enqueues followUp. PR #50 head e554ae24f76acf93412cf68df85226f0865c024a passed CI 35111871367 and 35111757424. Independent checkout `/tmp/pi-agent-end-verify` rebuilt and passed cli-end-continuation, end-continuation-budget and core agent-end-lifecycle fixtures. The CLI uses two runs/contexts and persists each user once; repeated callbacks stop at 32 requests with one unadmitted message retained. Merge CI35115453270 was still running at this update.

Live-model evidence remains **0/3 complete protected-test workflows**. No new live result, full ecosystem compatibility or percentage claim. Formal Session steer/error/abort cases, streaming/UI, parallel cancellation and provider exception lifecycle remain gaps.

## Current critical path

PR #51, branch `codex/provider-failure-lifecycle`, worktree `/tmp/pi-provider-failure-lifecycle`, head `038f21b`: implements provider_failure in Rust. The previously failing upstream comparison now passes stream creation/iteration/result failures, model metadata, zero usage and end-event payload/order. Drive returns an error assistant instead of rejecting provider exceptions, matching pinned Agent. Native-start, command-idle, queued-followUp and CLI lifecycle recovery assertions were retained and pass; provider rejection assertions explicitly changed. Full Cargo tests and clippy pass locally.

Independent checkout and complete CI remain required before merge. Review must inspect other provider failure assertions and keep hook/delivery failures distinct. If CI fails, preserve evidence and repair against the existing criterion. No full Session retry/compaction, live model or external abort claim. Implementation and evidence are on the PR branch; main remains prior verified behavior.

Next after integration: inspect the largest remaining user-visible runtime gap against the parity matrix, including exception recovery/resume and real-model workflow validation, rather than adding lifecycle details without a coding-agent use case.

## Recovery and history

Check merge CI first. Inspect the failure worktree and branch; worker capacity repeatedly failed, so continue locally. [Archived checkpoints](checkpoint-history.md) and append-only [board](board.jsonl) retain failures and prior evidence. Preserve unrelated stash/worktrees.

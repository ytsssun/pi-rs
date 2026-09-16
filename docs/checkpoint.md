# Current checkpoint

Main `12fe88b` includes Rust-owned start/turn/end lifecycle and bounded formal CLI continuation after a normal agent_end callback enqueues followUp. PR #50 head e554ae24f76acf93412cf68df85226f0865c024a passed CI 35111871367 and 35111757424. Independent checkout `/tmp/pi-agent-end-verify` rebuilt and passed cli-end-continuation, end-continuation-budget and core agent-end-lifecycle fixtures. The CLI uses two runs/contexts and persists each user once; repeated callbacks stop at 32 requests with one unadmitted message retained. Merge CI35115453270 was still running at this update.

Live-model evidence remains **0/3 complete protected-test workflows**. No new live result, full ecosystem compatibility or percentage claim. Formal Session steer/error/abort cases, streaming/UI, parallel cancellation and provider exception lifecycle remain gaps.

## Current critical path

PR #51 merged at `1c1d2305b41b1c85b406fe8bdfc6fc6bf42396fd` after exact-head CI35122543048/35122538539 and independent checkout verification. Rust now handles provider stream creation/iteration/result exceptions as persisted failure assistants and acknowledged end events. Full Session retry/compaction and external abort remain unverified.

New unchanged live smoke on 1c1d230: **0/1 complete workflows**, 1 accepted bugfix stage and 1 rejected resumed feature stage, zero manual steering. Both process exits, arithmetic assertions, test execution and history prefixes passed; resumed model modified protected test_maths.py. See [compact evidence](experiments/live-1c1d230-smoke/README.md). Historical 0/3 results remain separate. Repeated unchanged failure stops further identical repetitions.

Next: establish pinned upstream Pi baseline with the same gpt-5.4-mini, prompts, disposable workspace and parent-held acceptance. Verify AGENTS reaches both resumed model contexts, compare protected-file behavior, then decide a targeted fix. Do not change prompts/acceptance or impose a runtime guardrail before this evidence. No additional UI/provider surface work is prioritized over this daily-use failure.

## Recovery and history

Check merge CI first. Inspect the failure worktree and branch; worker capacity repeatedly failed, so continue locally. [Archived checkpoints](checkpoint-history.md) and append-only [board](board.jsonl) retain failures and prior evidence. Preserve unrelated stash/worktrees.

# Current checkpoint

## Current verified status

The installed CLI is still the custom pi-rs path. The experimental Agent adapter runs unchanged upstream CLI/AgentSession with Rust scheduling and original providers/tools; it is not a complete replacement or the installed default.

Earlier mini live evidence at clean commit `1416178`, pinned upstream `9767ba2`, `gpt-5.4-mini`, context editing off, zero steering: original Pi completed **1/3** full workflows; Rust core completed **0/3**. All six initial bug fixes passed. Every failed resumed stage implemented correct arithmetic, ran tests and exited 0, but modified protected `test_maths.py`; strict external acceptance failed. No guard or task change was introduced. Both initial HTTP requests match after temporary workspace normalization. Small samples do not establish causality, equivalence or speed gains. [Evidence](experiments/live-parity-1416178/README.md).

Deterministic fixtures pass original CLI new/resume, streaming event order, Session error/abort/wait/queued continuation and scoped automatic retry. PR63 merged as d8b77a2; PR64 merged as 1416178 and merge CI passed. Scratch journals remain per-process and disposable; upstream SessionManager remains canonical. The attempted persistent scratch reopen was reverted in PR64 before merge.

Latest fixed-model cohort at clean `ac0823c`: `gpt-5.4-2026-03-05` passed one upstream and one Rust smoke; Rust then passed **3/3 clean workflows, 6/6 stages**, zero steering, context editing off, 44,465 tokens. Same prompts/protected-file acceptance as mini. See [evidence](experiments/live-gpt54-20260917/README.md). This supports bounded trial, not full parity/reliability. Evidence commit fd716e7 has successful CI35282052618. It was pushed directly to main contrary to the coordinator PR gate; subsequent work returns to review branches.

## Critical path and frozen next experiment

The previous plan to change tasks was based on an incorrect claim: the existing task never requested protected-test modification. That plan is superseded. Keep its failure visible and do not add file-write guards to turn instruction-following failures into apparent passes.

Resume request audit passes for all 63 saved requests across both engines: unchanged system/developer instruction and tools within each run, exact two-user ordering, complete tool-call/result pairing, and restored previous-request prefix plus final assistant/new user. Normalized wire options/tool schemas match across all six runs. This rules out those specific missing-context/contract errors, not all runtime differences. Reproduce with `python3 experiments/audit-live-resume.py /tmp/pi-upstream-parity-1416178 /tmp/pi-rust-parity-1416178 --output NEW_JSON`.

Current branch implements queue clearing in Rust and exposes all/steering/follow-up Agent methods. Original Session.clearQueue comparison passes with active queued messages, abort/wait and later reuse; pending messages are returned to the caller and never executed. Rust selector/invalid-input tests pass. Full Rust tests/clippy passed before the additional selector test, which also passes. Await exact-head CI.

Next frozen milestone: expose the validated upstream CLI/Rust path through an explicitly experimental installed pi-rs option, allocating per-process scratch state automatically. Verify new/resume via installed binary without manually setting loader/scratch environment variables. Keep the existing default until plugin, session-control and cancellation gaps are characterized; no full replacement claim. No new TUI or provider implementation.

## Limits and recovery

No personal daily-use readiness claim. No complete plugin compatibility, general context replacement, tool cancellation or production integration mode. Queue clear now has scoped tests; transcript continuation only accepts queues or validated last-error retry. Retry projection is process-local to the scratch runtime.

Read AGENTS.md and coordinator.md, inspect branch/CI before integration. Latest evidence branch is `codex/live-parity-audit`. Reproduce live harness with `python3 experiments/integrated-live.py --engine rust-core --env-file .env --output NEW_DIRECTORY --model gpt-5.4-mini --repetitions 3`; this documents the command, not an instruction to repeat unchanged failures. Raw artifacts remain under `/tmp/pi-{upstream,rust}-parity-1416178`; durable summaries, diffs, native traces and request hashes are in the evidence directory. Never print credentials.

## History

[Checkpoint history](checkpoint-history.md), [append-only board](board.jsonl), and [architecture review](core-replacement-review.md) retain superseded findings and failures.

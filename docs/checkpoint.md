# Current checkpoint

## Current verified status

The installed CLI is still the custom pi-rs path. The experimental Agent adapter runs unchanged upstream CLI/AgentSession with Rust scheduling and original providers/tools; it is not a complete replacement or the installed default.

Latest live evidence at clean commit `1416178`, pinned upstream `9767ba2`, `gpt-5.4-mini`, context editing off, zero steering: original Pi completed **1/3** full workflows; Rust core completed **0/3**. All six initial bug fixes passed. Every failed resumed stage implemented correct arithmetic, ran tests and exited 0, but modified protected `test_maths.py`; strict external acceptance failed. No guard or task change was introduced. Both initial HTTP requests match after temporary workspace normalization. Small samples do not establish causality, equivalence or speed gains. [Evidence](experiments/live-parity-1416178/README.md).

Deterministic fixtures pass original CLI new/resume, streaming event order, Session error/abort/wait/queued continuation and scoped automatic retry. PR63 merged as d8b77a2; PR64 merged as 1416178 and merge CI passed. Scratch journals remain per-process and disposable; upstream SessionManager remains canonical. The attempted persistent scratch reopen was reverted in PR64 before merge.

## Critical path and frozen next experiment

The previous plan to change tasks was based on an incorrect claim: the existing task never requested protected-test modification. That plan is superseded. Keep its failure visible and do not add file-write guards to turn instruction-following failures into apparent passes.

Next: audit resumed model requests against original Pi at the context and tool-contract level using recorded traces before more live spending. Verify user ordering, system/developer instructions, tool-result pairing and available tool schemas. If no integration discrepancy is found, choose one bounded stronger-model comparison with identical acceptance, reporting model/config as a new cohort. Do not mechanically repeat gpt-5.4-mini. Separately retain missing Agent API/compaction/tool-cancellation cases as implementation gaps.

## Limits and recovery

No personal daily-use readiness claim. No complete plugin compatibility, general context replacement, tool cancellation or production integration mode. `clearAllQueues` is unsupported; transcript continuation only accepts queues or validated last-error retry. Retry projection is process-local to the scratch runtime.

Read AGENTS.md and coordinator.md, inspect branch/CI before integration. Latest evidence branch is `codex/live-parity-audit`. Reproduce live harness with `python3 experiments/integrated-live.py --engine rust-core --env-file .env --output NEW_DIRECTORY --model gpt-5.4-mini --repetitions 3`; this documents the command, not an instruction to repeat unchanged failures. Raw artifacts remain under `/tmp/pi-{upstream,rust}-parity-1416178`; durable summaries, diffs, native traces and request hashes are in the evidence directory. Never print credentials.

## History

[Checkpoint history](checkpoint-history.md), [append-only board](board.jsonl), and [architecture review](core-replacement-review.md) retain superseded findings and failures.

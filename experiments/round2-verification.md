# M2 independent verification

2026-09-06. **Tested against the working integration binary; clean candidate verification pending.** No live inference: loopback HTTP model double and scripted fixtures supply model decisions. Filesystem edits and Python tests are real subprocesses in ephemeral directories.

## Independent scenario

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
python3 experiments/round2-coding.py
```

Observed **28/28 checks pass**. The verifier constructed the small broken Python repository independently of implementation tests. `add(2,3)` initially fails; the model double requests a read, a real failing test, a full-file write repairing arithmetic, and another test that prints `INITIAL_TEST_PASS`. Assertions inspect file bytes, process exit, persisted failing/successful output, and tool evidence actually sent to the next HTTP request.

A second CLI process resumes with a new user request, writes a negative-input test and executes it (`FOLLOWUP_TEST_PASS`). The entire prior message prefix is unchanged, all calls have exactly one matching result, and provider usage spans both turns. Completed resume makes no new HTTP request or session change. A persisted 40-character context policy trims provider-visible output while preserving the canonical failure text.

Boundary checks: fabricated write/bash calls without opt-in have no effect and yield correlated errors; one-second bash timeout yields an error; normal background child does not hold the CLI open; 100KB output is bounded with a notice; `../` file escape is refused. Crash injection waits for an actual append, kills the Rust process, lets the shell finish, then confirms uncertain resume refuses automatic replay and leaves the session unchanged. Explicit resolution preserves the inspected outcome without another append.

This is stronger than a successful fixture final answer, but it does **not** prove that a real model can autonomously solve the repository. No claims of complete Pi compatibility, exactly-once external effects, malicious-filesystem confinement, TUI, cross-provider coverage or performance advantage follow from these checks.

## Relationship to upstream

Fixed upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`: source inspection of `packages/coding-agent/src/core/tools/write.ts` confirms `{path,content}`, create/overwrite and automatic parent directories. `bash.ts` confirms `{command,timeout?}` (seconds) and nonzero process exit becoming an error. These inputs/effects informed the independent scenario. This report alone does not claim execution of original upstream write/bash; dedicated oracle evidence, if added, must name its exact compared scope. M1 truncation oracle was independently rerun; see round2-baseline.md.

# Project coordinator operating contract

This file is the portable control plane for pi-rs. A new task or process can resume without relying on chat history.

## Authority

- `docs/checkpoint.md`: current verified state, limits and immediate critical path.
- `docs/board.jsonl`: append-only task, discovery, experiment, decision and handoff records. Status values are `proposed`, `tested`, `verified`, or `superseded`.
- Git: implementation and reviewable integration history. Never rewrite shared history.
- `docs/architecture.md`: current runtime map and feature classification.

## Coordinator loop

1. Read this contract, checkpoint, architecture, and the newest relevant board records.
2. Inspect `git status`, branch and remote before touching files. Preserve unrelated work.
3. Pick one critical-path task whose dependency is satisfied. Prefer removing a blocker to adding surface area.
4. Assign a bounded worker only for independent work with a named artifact; otherwise implement directly. At most three workers plus the coordinator, within the available execution slots.
5. Require commands, inputs, outputs, and limitations from every worker. Treat worker claims as proposed until independently reproduced.
6. Integrate only after independent tests and source review. Run the narrow test first, then the relevant regression suite.
7. Append evidence and supersessions to the board, update checkpoint, commit and push the reviewable work branch; merge only after successful exact-head CI.
8. Leave a precise next action and recovery command in the checkpoint. If no useful work is executable, stop rather than spin.

## Priority selection and runtime boundary

Use the current checkpoint and executed parity gaps to choose the largest unblocked obstacle to replacing upstream Pi core. Rust owns execution policy; Node preserves unchanged ecosystem implementations and executes effects requested by Rust. Keep providers, plugin loading and callbacks in Node where required for compatibility. Migrate scheduling or recovery decisions into Rust with upstream-backed regression evidence; record any temporary Node policy and its migration task.

Select a user-visible acceptance case before adding a runtime mechanism. Measure progress by behavior controlled by Rust and reproducible compatibility, rather than language line counts. Keep the simple model → tool → result loop central. Whole-ecosystem compatibility remains the goal; finite fixtures establish only their tested scope. Preserve the pinned upstream checkout unchanged.

After completing a milestone, update the checkpoint and begin the next valuable unblocked task. A worker capacity failure calls for inspection of preserved artifacts and local continuation or bounded reassignment. Repeated capacity failures are environment evidence, not a reason to repeat an unchanged dispatch indefinitely.

## Recovery

```sh
git fetch origin
git status --short --branch
sed -n '1,80p' docs/checkpoint.md
tail -30 docs/board.jsonl
```

If a worker disappears, inspect its worktree and commit state before restarting it. If the coordinator process exits, start a new task in this repository and follow the loop above. A heartbeat can wake a task, but all durable state must remain in these files and Git.

## Active scheduling setup (2026-09-11)

App thread heartbeat `pi-rs-coordinator` was accepted as ACTIVE at a 30-minute interval. Scheduled wake-ups have been observed; each wake-up must inspect current state before acting. The old goal is blocked; this heartbeat is a separate wake-up mechanism. Maximum concurrency is one coordinator plus three child agents (four total). Workers use isolated worktrees and submit branches/PRs; they do not push main. The coordinator must inspect GitHub CI results, not infer success from workflow installation. First dispatched task: `/root/ci_failure_audit`, investigating failed runs 34560998771 and 34560892045.

### Worker completion gate

A worker is not complete when it has made a commit or when CI is merely queued. After every push, the coordinator must poll the exact GitHub run until `status=completed`, inspect failed logs if `conclusion=failure`, and only then record `verified` or a new remediation task. A fast failure is still a failure; never report “triggered” as validation. For local changes, run the relevant acceptance command from a clean checkout or explicitly record why that is impossible.

### Worker handoff and CI ownership

For implementation or CI repair, the assigned worker owns verification through terminal CI status for its exact pushed SHA. Its handoff includes SHA, PR, run URL, acceptance commands and results, failures and remaining limits. Queued, cancelled, missing, timed-out or failed checks mean pending or blocked, not complete. Inspect failure logs, repair the cause, rerun acceptance, and follow the new SHA after each push. After two failures with the same cause, reassess the approach and record evidence before another attempt.

If execution ends before CI finishes, persist the run ID, SHA, failure evidence and exact next action; the coordinator explicitly assumes ownership. The coordinator independently verifies acceptance and exact-SHA checks before integration, then checks the main-branch merge run and updates checkpoint. Prior green runs do not validate conflict resolutions or later changes.

Acceptance review must trace every frozen criterion to executed assertions, including the actual entry point. Read fixture source before accepting its PASS output: manual lifecycle calls do not establish native-drive integration. Missing cases remain unverified even when CI is green.

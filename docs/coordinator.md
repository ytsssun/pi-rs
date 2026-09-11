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
4. Assign a bounded worker only for independent work with a named artifact; otherwise implement directly. At most four concurrent workers including the coordinator.
5. Require commands, inputs, outputs, and limitations from every worker. Treat worker claims as proposed until independently reproduced.
6. Integrate only after independent tests and source review. Run the narrow test first, then the relevant regression suite.
7. Append evidence and supersessions to the board, update checkpoint, commit and push to `origin/main` when the work is reviewable.
8. Leave a precise next action and recovery command in the checkpoint. If no useful work is executable, stop rather than spin.

## Current priority order

1. Preserve and simplify the single model → tool → result loop.
2. Validate installed and remote installation paths from a clean directory.
3. Replace placeholder session and prompt metadata with user-visible configuration.
4. Extend provider compatibility through the existing Node boundary, with deterministic fixtures before live calls.
5. Expand the parity matrix only when a capability has an executable acceptance case.

Do not claim a parity percentage without a documented denominator. Do not add a second runtime, orchestration platform, or plugin ABI to solve an unmeasured problem. Keep the upstream Pi checkout pinned and unchanged.

## Recovery

```sh
git fetch origin
git status --short --branch
sed -n '1,80p' docs/checkpoint.md
tail -30 docs/board.jsonl
```

If a worker disappears, inspect its worktree and commit state before restarting it. If the coordinator process exits, start a new task in this repository and follow the loop above. A heartbeat can wake a task, but all durable state must remain in these files and Git.

## Active scheduling setup (2026-09-11)

App thread heartbeat `pi-rs-coordinator` was accepted as ACTIVE at a 30-minute interval. Scheduled execution has not yet been observed. The old goal is blocked; this heartbeat is a separate wake-up mechanism. Maximum concurrency is one coordinator plus three child agents (four total). Workers use isolated worktrees and submit branches/PRs; they do not push main. The coordinator must inspect GitHub CI results, not infer success from workflow installation. First dispatched task: `/root/ci_failure_audit`, investigating failed runs 34560998771 and 34560892045.

### Worker completion gate

A worker is not complete when it has made a commit or when CI is merely queued. After every push, the coordinator must poll the exact GitHub run until `status=completed`, inspect failed logs if `conclusion=failure`, and only then record `verified` or a new remediation task. A fast failure is still a failure; never report “triggered” as validation. For local changes, run the relevant acceptance command from a clean checkout or explicitly record why that is impossible.

# Current checkpoint

Main `8772e68` includes Rust user/nextTurn queue ownership, both user queue modes, and steering admission after sequential tools or parallel batches. PR #46 head `ee02bc481fd9ce25a5cf2aa69787d02276711123` passed CI 35044688424 and 35044691491. Executed pinned-upstream/native fixtures explicitly assert sequential concurrency=1 and parallel concurrency=2, context order and complete tool-result pairing. Budget exhaustion and batch termination retain unadmitted steering. Parallel external cancellation, full lifecycle/stream events and complete Pi compatibility remain open.

Live-model evidence remains 0/3 complete protected-test workflows; [results](experiments/integrated-live-1adafc1/README.md). Queue changes used deterministic fixtures only. No new live success or speed claim. The 37-group inventory is not an exhaustive parity percentage.

## Current critical path

Enable an unchanged upstream extension that requires agent/turn lifecycle events through the formal CLI. Worker is selecting a concrete extension and pinned event-order oracle from `8772e68` in an isolated worktree. Acceptance: extension has an observable effect, actual tool roundtrip, follow-up and provider-failure cleanup coverage; Rust owns lifecycle transitions, Node dispatches callbacks. Non-streaming scope must be explicit. Integrate only after independent reproduction and exact-SHA CI. Complete event parity is not implied by one working extension.

Review lesson: execution-mode assertions are required. Earlier audit omitted native parallel mode and overstated success; earlier upstream sequential label overlooked its parallel default. Both are superseded in the board. Avoid expanding scheduling experiments without a user-visible compatibility target.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) retain failures and corrections. Unrelated rustfmt-only changes remain preserved in a named stash.

## Lifecycle experiment in progress

`784337c` independently reproduces a Rust action/ack pause before model selection and an unchanged extension status effect. It remains outside main and manually drives callbacks. Worker is wiring the real driver/CLI and adding initial-context, follow-up and failure-cleanup assertions. The original formal CLI acceptance is unchanged; prototype success is not completion.

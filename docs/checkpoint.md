# Current checkpoint

Main includes PR #48: Rust-owned acknowledged `turn_end`, following the existing `agent_start` and `turn_start` bridge. PR head `5f09b7af02593bd822860ce9c848f5db2b0aec3b` passed CI runs 35064011785 and 35064007914. Coordinator independently ran the turn-end, native-start, formal CLI agent-start fixtures and Rust turn_end/batch_steer tests on the integrated head before merging. This is deterministic evidence, not live-model validation.

Live evidence remains **0/3 complete protected-test workflows**; [results](experiments/integrated-live-1adafc1/README.md). Full lifecycle/streaming, interactive UI, parallel external cancellation and complete Pi compatibility remain open. The 37-group inventory is not an exhaustive parity percentage.

## Current critical path

PR #49 merged as `b6fcc764baa4ec558e6460daed307c4754f7b2dd`: Rust-owned agent_end action/ack, core run payload and unchanged CLI extension reaction. Final head ab76936 passed CI 35097876525 and 35097878300 after preserving both sides of the append-only board conflict. The earlier settled/done regression remains recorded; public completion is normalized to done. Local Cargo/clippy and selected Node workflow regressions passed; CI supplies the complete workflow gate. Merge-run status still requires inspection.

Next: Rust-owned AgentSession continuation of messages queued in agent_end. Executed unchanged upstream test `test/suite/agent-session-queue.test.ts`, named `delivers follow-ups queued during agent_end`, passes (1 passed, 13 skipped). Reproduce from vendor/pi-mono/packages/coding-agent with `../../node_modules/.bin/vitest run test/suite/agent-session-queue.test.ts -t 'delivers follow-ups queued during agent_end'`. It uses the actual Session harness and a one-shot extension followUp, expecting hello then conflict report after one session.prompt. Native currently retains the callback queue: core behavior matches but formal CLI Session behavior does not.

Frozen next acceptance: run the same one-shot end-callback followUp through formal pi-rs CLI; both messages must reach model contexts and persisted history once before CLI exits, each run has exactly one start/end pair, no duplicate user input. Preserve core Agent queue retention as a separate mode. Rust owns the continuation decision and budget; add bounded repeated-callback negative coverage. Extend executed upstream cases to steer/error/abort before making claims about them. Thrown-provider failure event parity remains a distinct gap. No new live validation.

Worker capacity errors repeated; coordinator is executing locally, with no further unchanged redispatch. Recovery: inspect merge CI, start an isolated branch from current main, reuse the upstream Session harness/test for the native red case, implement only after the mismatch is reproduced.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) retain prior states, failures and superseded claims. Unrelated rustfmt-only work remains preserved in a named stash.

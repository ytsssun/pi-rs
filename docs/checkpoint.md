# Current checkpoint

Main `fe53f03` includes PR #48: Rust-owned acknowledged `turn_end`, following the existing `agent_start` and `turn_start` bridge. PR head `5f09b7af02593bd822860ce9c848f5db2b0aec3b` passed CI runs 35064011785 and 35064007914. Coordinator independently ran the turn-end, native-start, formal CLI agent-start fixtures and Rust turn_end/batch_steer tests on the integrated head before merging. This is deterministic evidence, not live-model validation.

Live evidence remains **0/3 complete protected-test workflows**; [results](experiments/integrated-live-1adafc1/README.md). Full lifecycle/streaming, interactive UI, parallel external cancellation and complete Pi compatibility remain open. The 37-group inventory is not an exhaustive parity percentage.

## Current critical path

PR #49 (`codex/rust-agent-end`, current head `378f147`) adds the core Rust agent_end action/ack. Worktree `/tmp/pi-rust-agent-end`; independent checkout `/tmp/pi-agent-end-verify`. Coordinator took over after two worker capacity failures. Stop/error/aborted upstream comparisons, unchanged CLI extension reaction, run isolation and stale/double ack tests pass. Full Cargo tests/clippy passed in the independent checkout at 64ea78e; later changes are confined to JS completion normalization and evidence.

Initial CI 35077670461 failed: internal settled action leaked through the driver instead of existing done result. Acceptance was preserved; corrected head 378f147 passes the failing case in the independent checkout. Exact-head CI 35089102870 and full local Node regression remain pending. Do not merge until successful terminal CI and review. Main 7cd763d CI35074671962 passed; prior merge run was cancelled by the later push.

The broader lifecycle milestone remains incomplete: AgentSession automatically continues messages queued by end callbacks, while the implemented core Agent contract leaves them pending. Thrown provider exceptions also differ: executed upstream produces a failure message and turn_end/agent_end, native currently propagates after cleanup. Next work is an executed Session continuation oracle and Rust-owned continuation; preserve distinct core and formal CLI behavior. No new live validation.

Recovery: inspect PR #49 exact head and CI, read `/tmp/pi-agent-end-all-node.log`, reproduce any failed existing assertion without lowering it, then integrate. Keep both remaining gaps explicit and continue with the Session oracle.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) retain prior states, failures and superseded claims. Unrelated rustfmt-only work remains preserved in a named stash.

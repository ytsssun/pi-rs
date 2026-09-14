# Steer semantics audit

Status: tested against pinned upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, pi-rs baseline `f570fc0`.

## Correction

The initial audit in `14bce1b` is superseded. It incorrectly stated that steering aborts the current turn and requires aborted settlement. That claim was not based on an executed upstream probe. Steering and abort are separate operations.

## Executed upstream evidence

Run `node --experimental-strip-types experiments/upstream-steer-boundary.mjs` with the pinned vendor dependencies installed. The fixture executes the actual upstream `Agent`, using an explicitly blocked fixture stream (no live provider).

- Queue two steer messages while the first stream is blocked: signal remains un-aborted, neither message enters history, and only one provider call has started.
- Release a normal final response: default one-at-a-time admission produces two subsequent model requests in FIFO order, with each message present once in in-memory history.
- Prompt again on the same Agent: consumed steer messages do not replay.
- Release an aborted or error response: the run ends with both steering messages still queued and no subsequent model call.

Source: `packages/agent/src/agent.ts:283-285` only enqueues; `agent.ts:475-482` drains through the queue callback. `packages/agent/src/agent-loop.ts:167-260` polls initially and after completed turns, injects pending messages before the next response, and returns immediately on error/aborted results. These are fixed-reference paths under `vendor/pi-mono`.

## pi-rs gap and next acceptance

At `f570fc0`, `prototype/architecture/native-runtime-driver.mjs` drains steer only after Rust reports done. Custom steer is persisted as deferred content without a subsequent model request; user steer needs an external consumer or throws. It does not implement upstream turn-boundary admission before the next model response during a continuing tool loop.

The next implementation should add boundary admission through Rust with FIFO/default one-at-a-time handling, persist only accepted messages once, preserve pending messages when error/aborted ends a run, and prove subsequent same-host execution. Native subprocess recovery/no-replay needs its own test: the upstream Agent probe is in-memory and proves no disk persistence or restore behavior. Tool-boundary delivery is source-backed here, not exercised by this blocked-stream probe.

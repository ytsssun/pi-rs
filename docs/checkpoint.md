# Checkpoint — M7 event/tool parity proposed; implementation remains

## Current verified status

Latest provider check: `python3 scripts/build-native-session.py` then
`python3 experiments/native-provider-http.py` passes four local HTTP cases through
Node-API and the shared Rust transport: success/usage, incomplete response, HTTP
429, and redirect refusal. Native and CLI now share the 120-second/no-redirect
client configuration. This is not live inference. Native requests still block the
Node event loop; message-schema conversion and live coding/resume remain open.

Evidence correction: the current `upstream-event-trace.mjs` constructs a handwritten
trace rather than executing upstream Pi. Its comparison cannot establish upstream
lifecycle parity. Earlier parity claims based on that comparison are superseded;
M7 remains incomplete. Likewise the delayed tool fixture awaits its own updates;
that does not establish a runtime barrier for non-awaiting plugins.


Architecture direction: Rust core through Node-API, pinned upstream JS ecosystem
host unchanged. Architecture assessment now has integrated evidence; this is NOT
complete Rust rewrite, all-plugin compatibility, production readiness or measured
performance improvement. Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains reference.
Starting commit for this closeout: e1e6ab934f56481464c9e2cacb90e3ad159c7e4a.

Native PiRuntime now decides sequential model/tool continuation and writes through
PiSessionStore. Actual JS loader/runner/wrappers and context hooks are used. Four
fresh processes prove persisted followup/reset/fork with branch-local projection,
prior hook edits retained and canonical file prefix untouched. Five independent
upstream/native message and model-view comparisons pass. Pending-branch cross-write
was found and fixed; regressions retain failure evidence. Writer7, native lifecycle
and cargo test --locked also passed.

Reproduce current integrated evidence:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-runtime.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/integrated-control.mjs
```

Decision: docs/architecture-decision.md. Integrated scope/method/results:
docs/integrated-runtime-evaluation.md; independent frozen and overall goal audit:
docs/integrated-runtime-review.md. Reports in experiments/native-runtime-results.json
and experiments/integrated-control-results.json. No credentials/live model calls.
Node/platform caveats in docs/real-plugin-host.md apply. Core Rust/session code is
real, but model responses and clock are fixtures. No public native-runtime CLI yet.

## Next implementation milestone (no architecture signoff required)

Frozen acceptance: [M7 event and tool-hook parity](event-parity-milestone.md).

Bring native runtime event/tool-hook ordering toward pinned Pi conformance, reusing
original JS extension host. Start with actual before_tool/tool_result and agent/turn/
message/tool lifecycle events, including an async partial-update barrier and tool
failure. Derive external cases from original AgentSession/agent-loop, including
steering/cancel interactions before adding those transitions. Preserve sequential
baseline and current-view context semantics. Keep active operations correlated to
their session; no pending branch cross-write or completed-tool replay.

Acceptance for that milestone must be frozen in a new project record before edits;
it is product conformance work, not a claim more architecture research is required.
Then integrate live provider/public CLI path and expand full plugin/API coverage.
Do not publish/release or claim full compatibility from current fixtures.

## Remaining limits

Full session migrations/header/labels/aliases, arbitrary JSON edges, parallelism,
stream/events/cancel/steering/batch termination, crash/partial-write resolution,
actual provider transport through new native loop and cross-platform production
FFI packaging remain incomplete. Unfinished persisted calls reject explicitly, not
fully recover. Projection supports one text tool block. Pending branch/external
message changes currently reject; rich Pi steering is future work. Existing CLI
still uses its previous native-session path; native addon is an integration prototype.

## Preserved project objective and operations

Only Pi core runtime is rewritten in Rust; entire existing ecosystem must ultimately
work without plugin changes. JS remains necessary for plugins/UI/provider adapters.
TS control already performs tested context editing; Rust serves requested runtime
ownership, not a proven speed advantage. Do not change these goals, narrow full
compatibility, or adopt significant licensing/distribution changes without user.
No global memory edits; project files/append-only board are authoritative.

Main pushes authorized, no force push/release/publication. This cycle coordinator+
independent reviewer used2workers within cap4; findings changed implementation and
coverage without user intervention. No background48hour promise or model spend.

## History

Earlier checkpoints: docs/checkpoint-history.md. Evidence index and alternatives:
docs/architecture-evaluation.md, docs/plugin-seams.md, docs/architecture-decision.md.
Board T029 integrated fixture milestone tested; architecture assessment T022 closed
with explicit full-product limits. Subsequent work follows the project goal, not
an invented claim that the complete coding agent already replaces Pi.

## Execution continuity

The project checkpoint and append-only board are the durable recovery mechanism. The Codex goal is active for this task, but a completed turn does not itself guarantee background execution: the app/user or an explicitly configured heartbeat must start another turn. Worker completion can notify the coordinator while this task is active; it cannot revive an exited process. On abnormal exit, resume from `git status`, the latest checkpoint, and `python3 scripts/board.py list`; never infer work from chat claims. No herdr executable or existing project automation was found in this environment.

Latest evidence: `node experiments/compare-event-trace.mjs` passes lifecycle, tool identity and error semantics for the deterministic sequential case. The async hook probe requires the documented upstream build bootstrap; after `sh scripts/bootstrap-upstream.sh --build` it runs successfully. It remains prepared execution only, not a full native runtime parity pass.

Async hook probe now runs after `sh scripts/bootstrap-upstream.sh --build`; it requires `--experimental-vm-modules` on Node 22.18. Results cover ordered partial updates, awaited sinks, thrown tool errors, cooperative abort, and sink rejection. It remains prepared execution only and is not yet wired into Rust runtime.

Verified E033: lifecycle differential and five-case upstream async contract both pass on current main after bootstrap. This does not prove native sink completion/rejection parity end to end or live provider operation.

Verified live provider smoke: with existing `.env` authorization, `gpt-5.6-luna` and reasoning `none` completed a read-only request, then a separate process resumed the session and completed a follow-up request. This validates legacy CLI provider/session flow only; it does not validate native Node-API provider integration or autonomous coding.

Verified E037: `experiments/native-provider-live.mjs` sends a real gpt-5.6-luna request through Node-API `provider_chat` and receives the expected marker. The model omitted punctuation, so the probe accepts the semantically equivalent marker. This is provider transport only; native Rust model/tool/session continuation and live coding/resume remain unverified.

E038 failed: native live harness reached the real provider but OpenAI returned HTTP 400 before a model response. The native host passes Pi tool definitions directly; Chat Completions requires conversion to `function` tool objects. No live native coding/resume success is claimed.

Verified E039: fresh native Node-API harness with real `gpt-5.6-luna` completed model → unchanged JS `read` tool → model → turn end. This is the first live model execution through the native runtime. It is one read-only scenario in one process; cross-process native resume, mutations, and repeated trials remain unverified.

Verified E040: native live harness now supports `seed`/`resume`. Two independent processes using gpt-5.6-luna completed model → unchanged JS read tool → model; the second opened the first session successfully with no prior tool replay. This remains read-only and one trial; mutation coding and repeated independent runs remain open.

Verified E041: isolated native live mutation/resume passed across two processes with gpt-5.6-luna. Seed autonomously wrote `NATIVE_LIVE_OK` via unchanged JS `write`; resume autonomously read it and completed. External check matched exact file content. This is one scenario; three-run reliability, broader mutation tools, and crash recovery remain open.

Verified E042: three fresh isolated native live seed/resume runs with gpt-5.6-luna passed. Each autonomously wrote `NATIVE_LIVE_OK` through unchanged JS `write`, resumed in a new process, read the file, and passed an external exact-content check without steering. This is a small scenario; edit/bash, crash recovery, streaming and broad plugin compatibility remain open.

Verified E043: native live resume autonomously selected `edit`, replaced NATIVE_LIVE_OK with NATIVE_LIVE_EDITED, then selected `read`; external exact-content check passed. This is a simple exact replacement fixture and not full Pi edit semantics; bash, repeated edit runs, crash recovery and broader compatibility remain open.

Post-system-prompt live check: isolated seed/resume with gpt-5.6-luna still completed write, edit and read through unchanged JS tools; external target content was `NATIVE_LIVE_EDITED`. This is a regression smoke, not a new reliability sample.

Verified E044: native live seed/resume now includes `bash`; gpt-5.6-luna autonomously ran an exact-content shell test in both processes, with `isError: false`. This is one isolated scenario and uses a bounded harness bash wrapper; production command parity and repeated trials remain open.

E045 repetition audit: two clean native live bash seed/resume runs passed; the attempted third run was invalid because the command used an incorrect environment assignment and reused an existing session path. It is excluded from reliability counts; the three-run gate remains open.

Verified E046: corrected third clean native live bash seed/resume run passed. Together with the two valid E045 runs, the three-run reliability gate passes; the prior invalid attempt remains excluded.

Verified E048: native pending marker is flushed even before an assistant entry, allowing reopen recovery. `experiments/native-inflight-recovery.mjs` proves reopen blocks unresolved replay and explicit `resolve_in_flight` succeeds. This is deterministic marker recovery; abrupt process termination during a real provider/tool call remains untested.

Verified E050: native driver now owns the async tool-update barrier. `experiments/native-update-barrier.mjs` covers successful non-awaited update, rejected sink, and undefined rejection; no tool result/model continuation occurs before sink settlement and late updates are ignored. This is deterministic fixture evidence, not live-model parity. Upstream audit found parallel scheduling requires full-batch preflight, source-order persistence, and whole-batch sequential override; `maxConcurrency` would be a deliberate extension, so parallel implementation remains pending.

## Current execution note (2026-09-08)

The next batch implementation is not yet started. Independent clean verification attempted `cargo test --locked` but the current host has no `cargo` executable, so no fresh Rust compile result is claimed. JavaScript fixture verification remains available; restore a Rust toolchain before treating native source changes as build-verified.

Verified E052: the Rust toolchain is installed at `/Users/stevensun/.cargo/bin` but was absent from PATH. Running `/Users/stevensun/.cargo/bin/cargo test --locked` passed all 32 integration/unit tests and doc tests. F051 is superseded as an environment PATH issue; future verification should use the absolute toolchain path or export its bin directory.

Verified E053: `experiments/upstream-parallel-contract.mjs` executable check confirms the pinned upstream source contains whole-batch sequential override, source-order preflight, Promise.all execution barrier, and source-order result persistence. This strengthens the Rust batch acceptance contract; pi-rs batch implementation remains outstanding.

Tested E054: Rust runtime now has an opt-in `parallel:true` batch action with per-call request IDs; `batch_result` validates count/IDs and persists source-order tool results. Default sequential behavior is unchanged. Cargo tests pass. The native JS driver still needs batch execution/preflight semantics, so this is not a live or full upstream compatibility result.

Tested E055: native driver now passes `parallel` to Rust `begin`, executes `tool_batch` calls concurrently, and submits source-correlated `batch_result` outcomes. Existing sequential fixture and `/Users/stevensun/.cargo/bin/cargo test --locked` pass. This is an opt-in prototype; full upstream preflight/abort semantics and live batch verification remain open.

Verified E056: `experiments/native-batch.mjs` sends batch outcomes in reverse completion order; Rust maps by request ID and persists `one,two` source order. The prior positional-matching failure was fixed in `2a747fe`. This remains deterministic native evidence; preflight/abort, sequential override, and live model batch execution remain open.

E056 initial run is superseded: it used a stale native addon. Verified E057 after `python3 scripts/build-native-session.py`: reverse-order batch completion passes and source order is persisted.

Tested E058: native batch driver now completes lookup and argument validation for every call before starting execution. An invalid later call therefore prevents partial batch execution. Existing sequential integration fixture and syntax checks pass; hook-driven preflight abort and executionMode sequential override remain open.

Tested E059: native batch host honors registered `executionMode: "sequential"` by serializing the entire batch; otherwise it executes admitted calls concurrently. Existing integration fixture and syntax checks pass. Hook-driven preflight abort and live batch remain open.

# Current correction — batch block semantics

E085 corrects a prior compatibility error: per-tool block does not cancel its peers; blocked immediate outcomes skip tool_result hooks. Both block and input-mutation fixtures pass. Earlier zero-execution block and blocked-result-hook claims are superseded. Actual AbortSignal cancellation remains unimplemented/unverified. Full Pi compatibility is not achieved.

## Historical checkpoint (claims require their later corrections)

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

Tested E060: batch preflight now invokes unchanged Pi `ExtensionRunner.emitToolCall` for every call before execution and turns hook blocks into error outcomes. Existing integrated fixture, syntax and diff checks pass. A dedicated hook-abort fixture and full upstream event differential remain open.

Tested E061: batch admission now propagates any preflight hook block across the whole batch, so no call executes after a batch-level abort. Existing integration and syntax checks pass; dedicated hook-abort fixture remains to be added.

Verified E062: duplicate request ID submission is rejected without consuming pending batch; a valid reverse-order retry then succeeds and persists source order. This closes a session-integrity bug found during batch verification.

Verified E063: independently rebuilt and reran `experiments/native-batch-hook-abort.mjs`; a second tool_call hook block causes zero executions for both calls, source-order error results, and continued runtime progress.

Tested E064: batch `write/edit/bash` calls now write native in-flight pending markers before execution, aligning mutation durability with sequential path. Existing integration and syntax checks pass; batch crash/reopen recovery remains unverified.

Verified E065: two batch mutation markers survive simulated process exit 9; reopen blocks replay until both are explicitly resolved, then a new turn begins. This validates durable batch recovery markers but not crash during actual concurrent execution.

T066 in progress: live harness now accepts `parallel` stage and passes `parallel:true` to the Rust/native driver for two independent file tasks. Syntax verified; no live model call has yet been counted.

Verified E067: live `gpt-5.6-luna` with existing `.env` completed the opt-in parallel stage in an isolated workspace. Rust emitted tool batches; unchanged-style JS write/read tools produced two files exactly `PARALLEL_OK`, then model follow-up reads completed. Trace had no steering. This is one live run, not a reliability or performance claim.

Verified E068: three additional fresh isolated live `gpt-5.6-luna` parallel runs passed (3/3). Each produced two batch phases and exact external `PARALLEL_OK` contents for both files, with no steering. This is narrow scenario reliability evidence, not general Pi compatibility or performance evidence.

Verified E069: a live `gpt-5.6-luna` parallel session was closed and reopened in a fresh process; `parallel-resume` independently read both prior files and completed without replaying writes. External contents remained exact `PARALLEL_OK`. One recovery run, no steering.

Tested E070: Rust batch_result now honors all-results termination semantics: only an all-`terminate:true` batch returns done; mixed outcomes continue to model. Cargo test passes. Native terminate fixture and live validation remain open.

Verified E071: native batch termination fixture proves mixed terminate flags continue to model, while all results requesting termination return done.

E071 initial termination fixture was superseded due to a test script field typo. Verified E072 after correction: mixed terminate flags continue to model; all terminate=true returns done.

Verified E073: native batch preflight now supplies Pi-compatible `tool_call` event `input` (retaining args for internal compatibility). The hook-abort fixture asserts input presence; rebuilt native addon passes zero-execution/source-order checks.

Tested E074: native batch execution now invokes Pi `ExtensionRunner.emitToolResult` and applies returned result mutations before Rust persistence. Existing integration and syntax checks pass; dedicated result-hook mutation/throw fixture remains open.

Verified E075: abort fixture now registers an unchanged Pi `tool_result` hook and confirms both blocked outcomes traverse it in source order while zero tools execute. Native addon rebuilt before the run.

Verified E076: native batch `tool_result` hook events now match Pi's declared shape (`type`, `input`, `content`, `details`, `isError`, optional `usage`). Abort fixture asserts the shape and still passes zero execution/source order.

E076 is superseded: strengthening the abort fixture to assert full tool_result event shape exposed that only one blocked outcome reached the hook, contrary to the two-result expectation. No full event-shape compatibility claim is made; investigate before retrying.

Verified E077: blocked batch entries now retain validated arguments and tool metadata. The full tool_result event-shape abort fixture passes with both outcomes observed in source order and zero execution; prior E076 failure was caused by missing metadata on propagated blocked entries.

Verified E078: native batch abort fixture now has Pi `tool_result` hook rewrite blocked content; rebuilt run confirms both rewritten values persist in canonical Rust session messages in source order, while tools execute zero times.

F079 proposed: native provider adapter currently uses synchronous Rust `provider_chat` and emits only a terminal stream event. True token/tool streaming remains an explicit compatibility gap; no latency or end-to-end performance claim is made.

Verified E081: deterministic stream assembler covers ordered text deltas, incremental tool JSON, terminal done/error, EOF without terminal rejection, and post-terminal rejection. This is a JS seam fixture only; Rust nonblocking transport and live streaming remain unimplemented.

Tested E082: batch preflight now preserves Pi's mutable `tool_call` input object for execution, including in-place hook mutations, without revalidation afterward. Existing integration and syntax checks pass; a dedicated mutation fixture remains open.

Verified E083: `experiments/native-batch-input-mutation.mjs` proves validation before hooks and execution of hook-mutated arguments without revalidation. E082 inadvertently removed initial validation; this regression is repaired. The fixture also checks the tool_call event type. Invalid arguments currently reject the driver rather than producing a per-call error outcome; full batch compatibility remains incomplete.

Verified E084: invalid batch arguments become per-call error outcomes; a valid peer executes and the model continues. Preflight now runs in source order rather than Promise.all. Reproduce with `TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-batch-input-mutation.mjs`. Existing sequential fixture passes. Remaining correction: previous records conflated per-tool hook block with AbortSignal cancellation; full batch compatibility is not verified.

Tested E086: native batch driver forwards tool `usage` and `terminate` fields into Rust batch_result. Input mutation/invalid argument fixture and syntax checks pass. Live terminate remains unverified.

Verified E087: immediate batch outcomes now traverse Pi `tool_result` hooks before Rust persistence, matching upstream prepared-tool flow. Existing hook-abort and input-mutation fixtures pass; dedicated result-hook error behavior remains open.

Verified E088: immediate blocked outcomes retain input and traverse Pi `tool_result`; fixture accepts completion-order hook callbacks while asserting canonical persistence source order. This corrected an overstrict test assumption about parallel hook event order.

Verified E089: corrected immediate result-hook fixture passes after native rebuild. Per-tool block leaves the peer executable; both result hooks receive complete Pi-shaped events and hook mutations persist in canonical source order. Parallel hook callback order is not constrained.

Verified E090: tool_result hook `usage` now propagates through native driver and Rust batch_result into canonical session messages. Abort fixture asserts usage on both source-ordered outcomes; native rebuild and cargo tests pass.

Verified E091: independent regression matrix passed after recent hook and result-path changes: native rebuild; batch ID/order, termination, input mutation/invalid outcome, per-tool block/result hooks; stream assembler; and `/Users/stevensun/.cargo/bin/cargo test --locked`. This matrix contains no live model call.

Verified E092: Rust provider module now has a tested SSE data payload parser (multiline data, `[DONE]`, empty/invalid payload errors). This is parser groundwork only; the active transport remains blocking and native live streaming is not implemented.

Verified E093: Rust `SseDecoder` now buffers split chunks and emits multiple complete SSE events, including `[DONE]`, while rejecting incomplete final events. Provider transport remains blocking; this is parser-only groundwork.

Verified E094: Rust SseDecoder handles standard CRLF event separators in addition to LF, with unit coverage. This remains parser groundwork, not live streaming transport.

Verified E096: independently reran bounded Rust `StreamQueue` targeted tests and full cargo suite. Capacity, terminal exactly-once, wait wakeup, close, and post-close rejection pass. Queue is not yet exposed through Node-API or connected to HTTP provider.

Verified E097: rebuilt native addon and independently exercised `queue_create`, `queue_push`, `queue_poll`, and `queue_close`; ordered event and terminal propagation pass. Queue is not connected to HTTP provider or an asynchronous producer yet.

### E098 — bounded producer helper (verified)
- Added `spawn_producer` for dedicated-thread production into `StreamQueue`.
- Queue close cancels production without error; overflow is surfaced through join result.
- Evidence: `/Users/stevensun/.cargo/bin/cargo test --locked stream_queue` (4 passed).
- Commit: `e39ca9b` (pushed `origin/main`).

### E099 — native queue seam regression (verified)
- Rebuilt the native addon and reran `node experiments/native-queue-seam.mjs` after adding blocking poll support.
- Evidence: output `{"verified":true,"orderedPoll":true,"terminal":true,"close":true}`.
- The fixture remains deterministic; it does not exercise live HTTP streaming.

### E100 — native batch producer seam (verified)
- Rebuilt addon to `target/native-session.node` and exercised `queue_push_batch` from Node.
- Evidence: ordered delta then terminal event observed through `queue_poll`; no error.
- This is a deterministic native fixture; live HTTP provider producer remains open.

### E101 — reproducible Node producer fixture (verified)
- `python3 scripts/build-native-session.py && node experiments/native-batch-producer.mjs` passed.
- Node can publish ordered events and terminal state through the native queue seam.
- This remains fixture-only; no network or background provider handle is exposed yet.

### E102 — managed stream status lifecycle (verified)
- Native fixture verifies stream handle creation, producer status query, blocking event consumption, terminal delivery, and close.
- Evidence: `python3 scripts/build-native-session.py && node experiments/native-fixture-stream.mjs` => all flags true.
- This remains deterministic fixture coverage; live provider handle is not yet exposed.

### E103 — live native provider stream smoke (verified)
- Loaded existing environment credentials without printing them; invoked `provider_stream_start` with the configured low-cost model and a minimal request.
- Evidence: native addon rebuilt; Node observed 4 queued events, terminal=true, elapsed 1677 ms, process exited 0.
- Event payloads were intentionally not persisted; this proves transport/queue lifecycle only, not coding-task quality or Pi compatibility.

### E104 — live stream tool-call probe (failed, retained)
- A real provider stream request with one minimal `echo` tool returned one terminal `error` event; no tool-call event was observed.
- Credentials and payload were not persisted. This is a live failure requiring attribution (provider request schema/model behavior vs native translation); it does not invalidate E103 transport success.

### E105 — live tool-call SSE with OpenAI function schema (verified)
- Re-ran live provider stream using canonical `{type:function,function:{...}}` tool schema.
- Evidence: observed initial tool call metadata, incremental JSON argument chunks, `finish_reason: tool_calls`, and terminal `[DONE]`; process exited 0.
- Prior E104 failure is superseded as a malformed tool-schema probe, not a provider transport failure.

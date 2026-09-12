# Current checkpoint

Main `0ef20e4` includes PR #9 formal CLI lifecycle events and quarantine records for two rejected newSession worker attempts. Exact SHA `03d5557` CI `34657605731` passed all Rust, native session, command, idle, blocked-tool, and lifecycle checks; independent review and local fixture also passed. CLI now emits one `session_start(reason: startup)` after validation and one `session_shutdown(reason: quit)` with cleanup. Unknown explicit commands are rejected before session creation; invalid model/arguments remain side-effect free. No live-model validation in this slice.

Reproduce: `node --experimental-strip-types experiments/cli-lifecycle.mjs`. Coverage limits: signal-driven shutdown, valid explicit `--command` lifecycle, active-provider abort ordering, runtime rebind and newSession remain unverified. Issue #3 remains open. Next critical path is a mutable runtime owner for idle-only same-workspace newSession, beginning with upstream before-switch veto and stale-context semantics; two worker prototypes were rejected for fake managers/incomplete acceptance. Do not implement resetLeaf as a substitute.

Recovery: inspect current main CI/PRs, read coordinator and newest board records, then inspect active workers before starting work. Worker lifecycle handoff failed to push initially; coordinator took ownership, caught duplicate host loading and missing CI invocation, corrected both, and only then merged after exact SHA CI. Session identity remains UUIDv4 versus upstream UUIDv7; timestamps are current on native driver actions.

## Historical checkpoint (later corrections take precedence)

# Current checkpoint

2026-09-09 correction: installer completed successfully at `~/.cargo/bin/pi-rs` (previous chat report of interruption was incorrect). Installed executable passed external write/resume/extension rejection acceptance with `python3 experiments/formal-cli.py --binary "$HOME/.cargo/bin/pi-rs"`. Source assets remain required; remote curl bootstrap is not yet independently validated. Streaming already uses `nativeProviderStream → assembleNativeQueue → StreamAssembler`; previous claims that this bridge was missing were incorrect. Removed the unused ID-keyed ChatDeltaAccumulator rather than wiring an incompatible duplicate into the runtime. Next: independently validate remote installation and registered-provider selection through the formal CLI.

Formal Cargo `pi-rs` now launches the existing Node host with Rust Node-API runtime and original Pi tools/extensions. Build: `python3 scripts/build-native-session.py` then `cargo build --locked --bin pi-rs`. Source checkout and Node dependencies remain required; this is not a standalone package.

Deterministic external acceptance: `python3 experiments/formal-cli.py` passes original write → new-process resume/edit, exact filesystem assertions, canonical prefix retention, and unchanged protected-path extension rejection. No live call was performed for this launcher migration. Legacy Rust snapshot CLI is preserved as `pi-rs-legacy`; historical harnesses explicitly target it.

ModelRuntime provider resolution is now verified for built-in OpenAI models: local `.env` catalog/auth resolves models and the formal CLI routes the resolved ID into Rust transport (E269). Provider registration lookup is deterministic only; custom provider request composition and OAuth remain open.

Live baseline now verified: gpt-5.4-mini completed bug, behavior, and fresh-process resume scenarios 9/9 with no steering (E223). Context-editing long-task validation has three preserved model-behavior failures: the model omitted a requirement read from diagnostics; runtime/provider/tool paths remained healthy (E224/E225). E263 verifies live model metadata lets a fresh `--resume` omit `--model`; E264 preserves fixture resume compatibility after correcting an invalid restriction. E243 verifies explicit non-trigger custom messages persist after execution and enter fresh-process model context. Other message scheduling modes fail explicitly without a consumer; full message delivery remains incomplete. E255 adds a broader pinned Runner method/event inventory; the earlier 14/14 action count is only one surface and is not a parity percentage.

Next critical path: implement Rust-owned extension message scheduling and verify upstream ordering at tool boundaries; define the parity inventory alongside this work. E226 already inspected context projection bytes. Do not add a second sidecar runtime. Full parity remains unmeasured; define an explicit upstream capability denominator before reporting a percentage.

E252: live long-read context projection passed with `--context-tool-chars 1200`: model selected read/bash/write/bash and wrote exact LONG_OK; canonical history retained.

E251: three independent live formal CLI coding/recovery runs passed 3/3 with gpt-5.6-luna, no steering; each fresh process read, edited, and bash-verified exact content.

E250: live formal CLI now verified real tool execution and fresh-process continuation: gpt-5.6-luna independently selected write/bash, then read/write/bash after --resume; exact external assertions passed (E249/E250).

E248: formal `pi-rs` CLI completed a real OpenAI `gpt-5.6-luna` request (exit 0, exact OK, usage recorded, 3.02s wall) using project `.env`; no-tool single-turn only.

E242: extension `pi.appendEntry(customType, data)` now preserves both arguments through the original loader and native store; separate-process recovery passes after the first assistant message flush. Reproduce: `node --experimental-strip-types experiments/extension-entry-recovery.mjs`. Custom-only sessions retain upstream deferred persistence. Remaining priority: actual consumer semantics for queued extension messages and an evidence-backed parity denominator.

## Historical checkpoint (later corrections take precedence)

# Current checkpoint

E194: registered extension commands are now returned by pi.getCommands; regression reproduced before the fix and passes afterward. Prompt/skill command sources remain open. Next: validate command collision/namespacing against pinned upstream, then connect command execution to the unified entry. H031 rollback blocker is withdrawn: 6cbd0ed is an ancestor of d46844f; unchanged branch pointers were misinterpreted.

E193 revalidates live actual-CLI provider continuation from the authoritative baseline: write in one process, edit after fresh --resume, exact external assertion passes.

E192 verifies host action thinking-level roundtrip (off → high) through the bound extension runtime; this is in-process state only.

E191 verifies empty fixture input is rejected before session creation, with a clear error and no side effects.

E190 revalidates live actual-CLI write → bash after implementing getThinkingLevel: both tools succeed and an external exact file assertion passes.

E189 verifies live actual-CLI edit → bash continuation: exact external edit and successful bash result, with gpt-5.4-mini and no steering.

E185 records three independent live actual-CLI write → fresh-process resume → edit successes with exact external assertions and no steering.

E182 verifies exact projected toolResult truncation at a fixed limit, including the canonical-retained marker, while the persisted canonical result remains complete.

E180 verifies a live long-read run with context-tool-chars=20 completes and persists a session. It does not yet expose an independent assertion of the exact model-view bytes; context editing correctness remains partially verified.

E179 verifies three fresh live CLI write → independent-process resume → edit runs with exact external assertions and no steering. This strengthens the core coding loop; provider breadth, crash-during-call recovery, and full Pi ecosystem compatibility remain open.

Current correction (E174): protected live acceptance now requires a correlated attempted write and extension rejection; file absence alone cannot pass. Deterministic counterexamples pass; live rerun of this gate is pending. E168/E169/E172 used the custom-tool native harness, not the original-tool CLI. E169 resumed reads were sequential. Next: validate this gate against persisted live sessions, then move these acceptance cases onto the actual CLI. E177 additionally verifies the same unchanged extension allows a safe live write with exact external content.

The Rust/Node-API runtime now has a live unified entry with original Pi tools: E145/E146/E147/E149/E150/E153 passed under independent external checks. It remains an integration prototype; the shipped Rust CLI
still uses the legacy execution path. Running CLI help does not prove extension
integration or a clean build (E128 overstated both).

Current work: unified execution path remains the priority.

Latest verified unified-entry results: E145 live original read, E146 live original write, E147 fresh-process write/read resume, E148 unchanged protected extension load, E149 fresh-process write/edit resume, and E168/E169 live parallel write/read plus fresh-process parallel recovery. E144 remains the pre-fix failure that exposed incorrect tool registration. The new entry is still experimental and has not replaced the legacy CLI. The latest change fixes E172 live unchanged protected extension interception now passes: an explicit write call is rejected, the model continues, and the external .env absence assertion passes.
E158 confirms the same policy projection/reset behavior through the existing Rust context path; unified-entry policy persistence is E157, while live model-view trimming remains unverified.
E160 adds a live unified-entry long-read run with context-tool-chars=10; completion and canonical session persistence passed. Exact model-view truncation bytes still need a direct external assertion.
live harness acceptance/reporting: per-scenario file checks, byte-exact text (no
trim), and unknown-stage rejection. Reproduce offline counterexamples with
`node --test experiments/native-live-acceptance.test.mjs`.

Evidence limits: E121 compared against a handwritten lifecycle trace, not executed
upstream Pi; upstream lifecycle parity remains unverified. E132/E133 checked trimmed
parallel file content, so exact-byte claims are superseded. No fresh live run has
been performed under the stricter acceptance introduced here. E126 was a tool-loop
smoke, not independent coding-task completion. Existing live/fixture results remain
historical evidence within their stated scope, not full Pi compatibility.

Next executable work: connect a user-facing Node entry to the Rust runtime and
unchanged extension host, retaining Pi tool implementations. Freeze the CLI entry
acceptance before implementation: new request, real tool execution, persisted
session, fresh-process follow-up, unchanged extension hook, and rejection of
invalid CLI inputs before effects. Do not rerun unrelated passing legacy tests as
substitutes for this integration.

## Historical checkpoint (preserved; later corrections take precedence)

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

### E106 — live provider through native bridge (verified)
- Real provider request flowed through native queue and `assembleNativeQueue` into canonical Pi output.
- Evidence: 1 content item, 2 characters, `stopReason: stop`, process exit 0; no payload persisted.
- Tool execution and session persistence remain unverified in this path.

### E107 — live tool call through native bridge (verified)
- Real provider tool-call stream consumed via native queue and assembled into one canonical tool call named `echo` with `text` argument.
- Evidence: output `items=1`, `toolName=echo`, `argKeys=[text]`, process exit 0. Stop reason is currently `eof` because native terminal `[DONE]` is not yet mapped to assembler `done`.
- This exposes the next fix: preserve provider finish reason/usage and then invoke runtime tool execution.

### E108 — live tool bridge terminal mapping (verified)
- Live provider tool call passed through native queue and bridge with canonical `echo` call and `text` argument.
- Evidence: `name=echo`, `args=[text]`, `stop=stop`, process exit 0; terminal no longer misclassified as EOF.

### Correction — stream completion fidelity
E108's claim that converting a tool-call finish into `stop` was a correct fix is superseded. The bridge previously fabricated stop/EOF success and could accept incomplete streams. The adapter now preserves `toolUse` versus `stop`; the native bridge requires an explicit terminal marker and a supported provider finish reason. Late usage chunks are preserved. Evidence: `node experiments/native-stream-terminal.mjs` and `node experiments/openai-stream-canonical.mjs` pass. These are deterministic tests, not new live runs. Runtime integration and transport cancellation remain open.

### Shared provider request encoding
Streaming and synchronous HTTP requests now use the same Rust `chat_request` encoder. Pi tool definitions and canonical assistant/toolResult messages no longer bypass translation in streaming. Streaming requests request usage explicitly. Verified by `cargo test --locked --lib provider` (2 passed), including exact tool-call ID, arguments and toolResult encoding. This corrects E105's attribution: callers using the Pi-shaped tool schema were valid at the Pi boundary; the streaming implementation lacked conversion. Live runtime integration remains open.

### E109 — live streaming runtime tool loop (verified)
- Added opt-in `streaming:true` to the existing `nativeProviderStream`; it starts the native provider handle, consumes the queue through the bridge, and returns the canonical assistant message to the existing Rust-driven runtime loop.
- Independent live run: `node --env-file=.env --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-stream-runtime-live.mjs` after native rebuild.
- Evidence: model `gpt-5.4-mini`, 2 model turns, 1 real `echo` tool execution with exact `STREAM_RUNTIME_OK`, persisted toolResult, final assistant `stop`, exit 0, `humanInterventions:0`; usage recorded for both assistant turns.
- This verifies one live tool loop and persistence in-process. Cross-process resume from this streaming path, broader tool safety, and full plugin compatibility remain open.

### E110 — live streaming cross-process resume (verified)
- Existing live harness now opts into `nativeProviderStream({streaming:true})`.
- Seed and a separate resume process both completed with real model-selected `write`, `edit`, and `bash` tools; external file check passed exactly (`NATIVE_LIVE_EDITED`), exit 0, no steering.
- Trace showed 4 model turns in seed and 3 in resume. This verifies the requested live streaming + process recovery scenario for the fixture workspace; broader Pi compatibility remains open.

### E111 — harness external assertion rerun (verified)
- Fresh live seed/resume run with streaming provider passed harness-owned external assertion: expected and actual `NATIVE_LIVE_EDITED`; no model output was trusted for acceptance.

### E112 — live resume session audit (verified)
- Fresh seed/resume run after harness assertions: external file assertion passed (`NATIVE_LIVE_EDITED`), and resume session contained 5 persisted toolResult messages and 7 assistant messages.
- No human steering was used. The initial output parsing mistake was a verifier-command error and is retained separately from product results.

### E113 — repeated live streaming resume matrix (verified)
- Three fresh seed/resume pairs passed the harness-owned external file assertion and persisted-message checks.
- Each resume reported 5 toolResult and 7 assistant messages; no manual intervention was used. This is a three-run stability sample, not a reliability guarantee.

### E114 — live provider transport error containment (verified)
- With an intentionally unreachable local base URL, native provider stream returned a terminal error event; no normal completion was emitted.
- This verifies transport failure containment only; session rollback semantics remain covered by deterministic runtime tests.

### E115 — unchanged Pi extension sidecar (tested)
- Ran `node prototype/test-extension-sidecar.mjs` against the pinned upstream `protected-paths.ts` without modification.
- Protected-path blocks, allowed paths, malformed hook inputs, and malformed JSON behavior matched the fixture expectations. This validates the Node extension host in isolation; it is not yet proof that the extension is wired into the Rust-driven live runtime.

### E116 — protected-path extension in live harness (tested)
- Fresh live seed with unchanged `protected-paths.ts` loaded through `real-plugin-host` completed write/edit/bash and persisted messages.
- The model used a non-protected target, so this does not test blocking; output showed `verified:true`, `toolResults:3`, `assistants:4`, exit 0. External result was `NATIVE_LIVE_EDITED` (seed expectation metadata was not applicable).

### E117 — protected path hook through real extension runner (verified)
- Loaded pinned unchanged `protected-paths.ts` through `real-plugin-host` and emitted a write `tool_call` for `.env`.
- Evidence: runner returned `block:true` with reason `Path ".env" is protected`.
- This proves the extension hook contract at the JS runner seam; full Rust driver integration still requires running the same hook inside a live driver turn.

### E118 — sequential hook bypass fixed (verified)
- A live protected-path probe initially modified `.env`, proving sequential runtime bypassed `emitToolCall`.
- Added the missing hook call; deterministic batch hook regression passed, and a fresh protected live probe exited 0 without creating `.env` (session retained one blocked toolResult and two assistant messages).
- The prior failure is retained as the bug-finding evidence; this does not claim all extensions are compatible.

### E119 — corrected seed external assertion (verified)
- Fresh streaming seed run after the harness expectation fix passed its own external assertion: `NATIVE_LIVE_EDITED`; session contained 3 toolResult and 4 assistant messages.

### Sequential result interception correction
The parameter-mutation experiment now registers a tool_result interceptor and checks exact persisted replacement content in sequential/parallel and valid/invalid-input combinations. Before the fix, sequential execution failed with no result hook calls (`[]` versus `[a,b]`). The driver now invokes the unchanged ExtensionRunner result interceptor before sending the result to Rust. Both `node experiments/native-batch-input-mutation.mjs` and `node experiments/native-batch-hook-abort.mjs` pass. Deterministic evidence only; remaining event lifecycle and termination parity are not implied.

### E120 — live protected extension runtime block (verified)
- Fresh protected live run with unchanged `protected-paths.ts` loaded in the Rust-driven harness passed: no `.env` was created, one attempted write produced a persisted toolResult, and two assistant messages were persisted.
- External check reported expected/actual null with `passed:true`; this scenario intentionally asserts absence of the protected file.

## Latest verified progress (E122)
The pinned upstream async tool contract and native sink rejection probe both pass. Partial updates are ordered and awaited before executor settlement; late updates are ignored; thrown tools, cooperative abort, and sink rejection are preserved. This remains a prepared-tool/bridge probe, not proof that the full Rust agent loop is wired to every async extension path.

E123 verifies the barrier in the integrated native runtime driver: continuation waits for async update sinks, late updates are ignored, and sink rejection (including undefined rejection) prevents the next model call. Full provider and crash-recovery coverage remain open.

E124 revalidated durable unresolved-tool recovery across process boundaries: abrupt child exit leaves a marker, reopening blocks replay, and explicit resolution enables a new turn. Actual crash during live provider execution remains open.

E126 is a fresh live regression pass for native streaming runtime coding: gpt-5.4-mini completed a two-turn model/tool loop with one tool execution, persisted usage, and zero human intervention. This is one run and does not establish reliability or performance.

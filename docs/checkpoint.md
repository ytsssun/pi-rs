# Checkpoint — M7 event/tool parity proposed; implementation remains

## Current verified status

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

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit123dc3fc126be6abbd733fb2d4f5aebda7737719; main authorized.
Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Node-API addon links actual Rust PiSessionStore/Index; native path passes frozen7
writer oracle cases and unchanged Todo three-process persisted continuation.
Native/helper Todo results match. Lifecycle tests verify isolated/stale/cross-env
handles, failed-open no allocation,64create/close cycles and Rust Drop on natural
Worker exit/termination. Registration rejects prior instance data instead of leak-
prone overwrite. Explicit close/env exit tested, not arbitrary GC/leak freedom.

Reproduce:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/native-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs --native
node experiments/native-store-lifecycle.mjs
```
Evidence: experiments/native-write-results.json, native-store-todo-results.json,
native-store-lifecycle-results.json and docs/native-store-review.md.
Design: docs/native-store-evaluation.md. No new dependencies/model calls/credentials.
Node/platform caveat unchanged; original Rust core Cargo suite passed123dc3f,
this cycle builds/links that unchanged core and tests native integration.

## Limits and next milestone

v3 subset, fixture clock/IDs/lifecycle, no CLI/model-driven loop integration or
complete session migration/header/labels/recovery. Native JSON DTOs are fresh
objects, no alias parity. Store lifetime explicit close/env exit only, raw FFI
not production-hardened. Native abort has only prior bounded probe coverage;
multiple sink rejection ordering and actual UI lifecycle remain unverified.

Next run actual upstream UI factory mounting/disposal with objects in JS, then
consolidate ownership decision and compatibility obligations against the inventory.
Node-API candidate now has integrated Rust session evidence. Context editing TS
control works already; Rust justified by requested ownership, not unmeasured speed.
Do not repeat native writer cases absent new changes. Integrate remaining seams
rather than accumulate isolated proofs. Full ecosystem compatibility target stands.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T028 native session integration subset tested;
D008 native primary candidate strengthened, full compatibility still unproven.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent native lifecycle/source review verified per-env cleanup and registration guard without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

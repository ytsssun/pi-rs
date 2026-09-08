# Current checkpoint — core-only Rust architecture evaluation

## Decision and verified state

Starting commit0788e3bc96ff439a0dd757b6f3f949b54e6217b3; main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Architecture direction accepted: upstream JS ecosystem host + Rust runtime exposed
through Node-API. Full compatibility not established. Reason/ownership/alternative
comparison and frozen next acceptance: docs/architecture-decision.md, independently
reviewed in docs/architecture-decision-review.md.

Original UI widget/header/footer lifecycle methods now tested with actual extension
runner, Text/Container/Theme and native session callbacks. Identity, replacement
ordering, disposal, built-in restoration and stale context assertions pass. Naive
JSON component negative fails expected identity check. Initial padding expectation
error preserved; exact upstream40column output now asserted.

Reproduce:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/ui-lifecycle.mjs
```
Negative: append `--json-component-counterexample`. Evidence:
experiments/ui-lifecycle-results.json; independent review above. This invokes
original methods on fixture-initialized fields, not full InteractiveMode constructor,
terminal startup, custom overlay/focus or shutdown lifecycle. No provider calls.

## Next milestone — integrated Rust state machine

Implement one Rust-owned native model/tool/session flow. Rust decides actions and
continuation; JS loads/executes original tools/providers and UI. Reuse native session
module and context policy, persist results, restore/follow up in fresh process,
include failure/cancel, assert canonical history and current-view projection. Frozen
criteria in architecture-decision.md. Independent audit requires integrated evidence;
UI alone cannot complete architecture goal. Do not repeat isolated green probes.

Existing evidence: native7writer cases/Todo3process persistence,19read cases,
callback identity/reentry and5async cases. Remaining: integrated scheduler, complete
session interface/migrations, alias contracts, async rejection order, provider
integration, full UI and distribution/recovery. TS context control works, so Rust
is an ownership choice, not a proven speed gain or unique context-editing necessity.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; D009 direction accepted for implementation;
T029 integrated Rust state machine proposed with frozen acceptance.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent architecture review focused next work on integrated Rust state machine without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

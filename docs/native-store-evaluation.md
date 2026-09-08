# Native integration of Rust Pi sessions — starting123dc3f

Status: tested integrated session subset, not complete core or plugin compatibility.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.

The new Node-API addon links the actual PiSessionStore/PiSessionIndex modules rather
than duplicating session logic. Native backend calls execute synchronously inside
the Node process; helper spawning is no longer in this path. The existing helper
adapter remains a comparison. Build script uses Cargo's locked compiler-artifact
paths to link root pi_rs and already-declared serde_json; no dependencies added.
This is still raw FFI prototype/build tooling, not a supported binary distribution.

## Evidence actually obtained

Frozen seven-scenario writer acceptance runs unchanged against native adapter and
original upstream. Actual unchanged Todo runs seed/continue/verify in three fresh
processes through native session storage, persisting gamma and branch-local policy
reset. Native and helper Todo outputs compare equal except declared transport.
No TS SessionManager instantiated in Todo flow; IDs/clock still fixture-injected.

Native registry belongs to each napi_env and owns independent Rust session instances.
Opaque string handles include a checked process-wide environment generation and
per-environment sequence. Explicit close removes the store; stale or foreign handles
reject. The addon registers a Rust-only environment finalizer. Session operations
hold no registry borrow while calling JS value APIs or plugin callbacks; these
operations themselves do not invoke user closures. Prior native callback reentry
probe covered callbacks separately, not session operation callback emission.

Independent lifecycle tests verify invalid input rejection, no allocation on failed
open, session isolation, stale handles after new allocations, handles rejected
across Workers in both directions, and64bounded create/close operations returning
registry count to0. One natural Worker exit and one explicit worker.terminate each
invoke registry Drop with one retained store. Diagnostics show2environment and
2retained-store drops. These counters verify destructor entry/ownership cleanup,
not allocator leak freedom, JS garbage-collection finalization or crash safety.
No arbitrary capacity maximum was introduced as a new compatibility restriction.

Source review identified a registration hazard: Node-API set_instance_data can
replace prior data without calling its finalizer. The addon now rejects nonempty
instance data on registration rather than overwriting an owned pointer. Lifecycle
script has a bounded deadline and terminates workers even on assertion failure.

## Decision progress and next work

Node-API primary-candidate recommendation now has integrated Rust session ownership
evidence, not only a scalar pass-through experiment. Original JS host can run an
unchanged stateful plugin while Rust owns persisted session trees. Continue this
route for integration; no reason found to abandon Rust or require a TS-owned core.

Still required before full compatibility: complete SessionManager interface and
migrations, alias/opaque-value contracts, provider/core loop integration, actual UI
factory mounting/disposal, async cancellation and multiple-rejection order, cross-
platform packaging and failure recovery. Session DTOs currently cross JSON and
return fresh objects; that does not establish upstream object-alias behavior.
Stores remain allocated until explicit close or environment exit; no per-store
GC cleanup claim. Native panic aborts host process; no isolation claim.

Next milestone: exercise actual upstream UI factory lifecycle while keeping JS
objects local, then consolidate module ownership and remaining compatibility gates
into an architecture decision. Integrate native session/context projection path
where it contributes evidence; avoid measuring progress by more isolated fixtures.
Existing TS context-editing control already works, so Rust is justified by user's
runtime ownership goal, not a claimed unique capability or speed improvement.

## Reproduce

```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/native-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs --native
node experiments/native-store-lifecycle.mjs
```

Results: experiments/native-write-results.json, native-store-todo-results.json,
native-store-lifecycle-results.json. Independent review: docs/native-store-review.md.
Darwin arm64/Node22.18 executed; Linux option untested, upstream declares22.19+.
No live model, keys, API spend, extra dependencies or performance measurement.
Underlying Rust core source unchanged this cycle; locked library build and reused
integration acceptance passed. Prior full Cargo suite passed at123dc3f.

Node-API reference (versioned):
https://nodejs.org/download/release/v22.18.0/docs/api/n-api.html#napi_set_instance_data

# Architecture decision: upstream JS host with a Rust runtime through Node-API

Decision status: accepted as the reversible implementation direction. Compatibility
status: incomplete/unverified beyond recorded cases. This is not a release claim.
Baseline0788e3b; upstream Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT).
Independent review: docs/architecture-decision-review.md.

## Judgment

Yes, TS is natural for Pi's plugin host. Keep it there. Existing plugins carry
closures, classes, npm dependencies, UI factories and live JS values; translating
that ecosystem into Rust would expand scope and obstruct unchanged-plugin support.
It does not follow that canonical session state and runtime scheduling must also
remain TS. Native reentry and an unchanged stateful plugin backed by Rust session
persistence now provide concrete counterevidence to that stronger claim.

Choose **Rust runtime + Node-API + the pinned upstream JS ecosystem host**. Rust
owns runtime decisions/state; JS executes the existing ecosystem and adapts its
interfaces. Do not replace the Rust objective with a TS fork. Retain TS control
experiments and IPC probes for differential verification. Do not ship a hidden TS
agent loop and call it a Rust rewrite because its storage happens to be Rust.

Context editing alone is not a reason that Rust is necessary: the TS control already
performs the demonstrated projection/reset/restore operations. Rust is justified
here by the user's explicit runtime ownership/evolution goal. No startup, memory,
concurrency, development-cost, model-quality or end-to-end speed advantage has been
measured. Native shares crash fate with Node; it does not supply process isolation.
A JS runtime remains part of deployment, so this is not a standalone Rust-only binary.

## Module ownership

| Responsibility | Target owner | Present evidence / remaining obligation |
| --- | --- | --- |
| Canonical session tree, append/branch/policy/recovery state | Rust | v3 read/write + native session persistence tested; migration/full API/recovery incomplete |
| Agent state machine, next model/tool/turn, steering/cancel decisions | Rust | Isolated dispatch/reentry shown; integrated native agent state machine still missing |
| Context policy and projection decisions | Rust | TS/Rust projection and original hook chains tested separately; integration with native state machine remains |
| Loading/resolution, extension closures, event dispatch mechanics | Upstream JS host | Actual unchanged Kimi/Todo through loader/runner tested; full package/API inventory still required |
| UI factories, components, themes, focus/terminal rendering | Upstream JS host | Identity and limited original mounting/replacement/disposal methods tested; real app/terminal/overlay lifecycle unverified |
| Provider transports/auth adapters | JS initially, governed by Rust runtime requests | No integrated Rust scheduler to actual adapter proof yet; existing CLI provider evidence is a separate path |
| Boundary data/reference lifetimes | Typed native adapter; opaque JS objects stay local | Native callbacks/errors/objects and environment cleanup tested; fresh session JSON views do not prove alias compatibility |

Node-API is the interface implementation, not the place to bury a second state
machine. Production binding should expose coherent session/runtime methods, with
clear instance lifetime and no Rust borrow held across reentrant JS calls. Existing
handwritten FFI is experiment code; packaging/safety/platform validation remain work.
No dependency or licensing change is approved by this document itself.

## Why not the alternatives as primary direction

A TS fork is the lowest-distance route for the tested context-editing feature and
remains a credible control. It would not satisfy the requested Rust core ownership
on its own. Helper-based IPC works in tested reentry cases and could retain objects
locally via handles; it is not disproven. It adds lifecycle/correlation machinery
in the current prototype and becomes attractive if process isolation is a stronger
requirement. No measured transport cost comparison favors either option yet.

Full compatibility remains a target for the pinned Pi ecosystem. Do not silently
exclude UI plugins, npm packages, custom providers, session navigation or inconvenient
undocumented uses already present in real plugins. Investigate them and record
incompatibilities. Do not translate19read fixtures/7write sequences/2example plugins
into an all-plugins guarantee. Future upstream-version tracking is a separate
maintenance obligation; passing the pinned version does not imply future parity.

## UI evidence added in this decision cycle

`experiments/ui-lifecycle.mjs` invokes the original InteractiveMode methods through
actual extension runner UI context. Real Text/Container/Theme instances are mounted,
replaced/disposed and restored to built-ins; callbacks read a native Rust session.
Disposed widget replacement ordering and disposal-failure behavior are asserted.
Stale extension context rejects access after runner invalidation.

The InteractiveMode constructor was not run: fields and requestRender are fixture
inputs. There is no terminal startup, keyboard/focus, custom overlay or full runtime
shutdown validation. The initial test wrongly expected an unpadded width40 Text
render; actual upstream returned40columns, so expected value was corrected to
padEnd(40). This was a harness error, not a runtime defect or relaxed assertion.
The JSON-component negative exits1 at factory-instance identity, preserving evidence
that naive serialization is insufficient for these values.

## Next milestone, frozen acceptance

Build one **Rust-owned native model/tool/session execution path**, reusing these
modules. Stop adding unrelated isolated interface probes as a substitute.

1. Rust state machine emits model/tool actions and decides continuation. JS dispatch
   code executes those actions without deciding the next turn or maintaining a
   competing authoritative session. Trace that ownership explicitly.
2. Deterministic model responses select tools through actual upstream loader/runner
   and wrappers. Persist tool results/details through Rust PiSessionStore. Compare
   fixed observable event/message behavior with original upstream where applicable.
3. A fresh process restores that native session and completes a follow-up; completed
   tools are not silently replayed. Include an error/cancellation path rather than
   testing only successful completion.
4. Run context editing through the same path: current hook view is projected,
   canonical results retained, prior plugin modifications respected, policy/reset
   branch-local and preserved after reopening. No quality/performance claim.
5. Independent reviewer derives counterexamples from upstream/user goals and runs
   the integrated path. Keep failed runs and stable acceptance; fixtures establish
   deterministic architecture behavior only, not independent live-model coding.

Complete the architecture goal only after auditing its actual requirements against
this integrated evidence. The decision direction is now clear; the missing Rust
scheduler integration remains substantive work, not a reason to repeat this decision.

## Reproduce UI evidence

```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/ui-lifecycle.mjs
```
Append `--json-component-counterexample` for expected exit1. Result/source hash:
experiments/ui-lifecycle-results.json. Setup/runtime caveats in real-plugin-host.md.

## Integrated evidence after the decision

The frozen sequential milestone now runs through native PiRuntime+PiSessionStore,
actual JS extension tooling/context hooks and four-process restore/reset/fork.
Five source-derived upstream/native canonical-message and provider-view comparisons
pass. A real pending-action branch-write bug was independently found and fixed;
regressions and unimplemented steering semantics are explicit. See
`docs/integrated-runtime-evaluation.md` and `docs/integrated-runtime-review.md`.

The state-machine integration is no longer a missing proof of concept. Product gaps
(stream/cancellation/parallel/steering, full APIs/migrations/aliases, live providers,
packaging/recovery) remain. Keep architecture confidence separate from an all-plugin
release guarantee. No unmeasured benefit is inferred from passing these experiments.

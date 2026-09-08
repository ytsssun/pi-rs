# Independent architecture decision review

Reviewed baseline: pi-rs `0788e3bc96ff439a0dd757b6f3f949b54e6217b3`;
Pi `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.
Reviewer owns this document only. Status: source/evidence audit; new UI execution
review is recorded separately below when performed. No credentials or model calls.

## Judgment

Proceed with **the upstream JS ecosystem host plus a Rust core exposed through
Node-API** as the primary integration architecture. This is a reasonable reversible
engineering decision now; it is not evidence that the current product has replaced
the Pi core, or that all plugins work. Requiring the entire replacement to be built
before selecting a direction would confuse architectural evaluation with delivery.
Conversely, passing interface probes cannot satisfy the full compatibility promise.

TS is natural for loading and executing TS plugins and their live objects. The
stronger claim that these plugins require all authoritative runtime state and
scheduling to remain TS is contradicted by native synchronous reentry and the
unchanged Todo plugin using Rust-owned persisted sessions. Rust scheduling of an
integrated model/tool/session run has not yet been established by those cases.

Context editing does **not** require Rust: the TS control uses an existing upstream
transform boundary and supports the tested policy/resume/reset behavior. Rust's
justification is the user's explicit core ownership/evolution objective. These
experiments establish neither faster development nor a latency, startup, memory,
concurrency, model-quality or end-to-end performance benefit.

## Why this choice is supported, and where evidence stops

| Question | Evidence used | Conclusion and limit |
| --- | --- | --- |
| Can unchanged JS code synchronously access Rust authority? | `native-seam.mjs`, unchanged Kimi loader/runner/wrapper, nested callbacks | Yes for exercised tool-state operations; not every runtime action or concurrent scheduler. |
| Must UI/functions/errors cross as JSON? | Native identity and EventBus counterexamples; live Text/Theme values | No: leave these values in JS. Naive copying fails; this does not disprove an IPC host with local object handles. |
| Can Rust own meaningful persisted state? | `native-store-backend.mjs` calls actual `PiSessionStore`; unchanged Todo persists and resumes in fresh processes | Yes for the tested Pi v3 subset. Clock/IDs remain fixture-injected; session data uses fresh JSON objects. |
| Are async contracts solved? | `async-tool-parity.mjs` and independent rejection counterexamples | Selected success/failure/update/cooperative abort order tested, partly through IPC. They are not an integrated native scheduler proof. |
| Is TS a credible control? | Existing transformContext seam; real runner chain and Pi session context experiments | Yes for demonstrated projection semantics. Not a maintained full TS fork with measured maintenance cost. |
| Is native distribution ready? | Local raw FFI addon, environment lifecycle probes | No. Darwin arm64/Node22.18 only executed, below upstream's declared minimum; no production packaging/safety conclusion. |

IPC remains a viable alternative if process isolation becomes decisive. Its current
helper transport has extra correlation/ack/recovery machinery; no measured overhead
comparison exists. Native avoids serializing same-process values but shares crash
fate with Node. No new licensing choice is needed for the existing dependency-free
prototype; production binding and packaging dependencies require their own review.

## Required ownership boundary

Rust should own canonical session/context state and the agent state machine's
scheduling, tool-selection/continuation and recovery decisions. JS should own module
loading, extension closures, upstream event dispatch mechanics, UI objects, provider
transport implementations and native event-loop execution. A callback executing in
JS does not make scheduling JS-owned; a JS loop deciding the next model/tool/turn
while Rust only stores state does.

The current artifacts remain several prototypes. `original-loop.mjs` explicitly
executes the TS loop; `native-store-backend.mjs` is a session subset, not a complete
SessionManager; the scalar native seam does not integrate async policy or sessions.
Do not advertise that collection as the final core replacement. Preserve a single
authority for each state item when integrating; mirrors need specified visibility
rules and cannot become a second undeclared TS runtime.

## Remaining full-compatibility requirements

The inventory in `plugin-seams.md` is a category map, not an exhaustive exported-
member contract or a completed coverage matrix. All categories remain obligations.

1. **Integrated Rust state machine:** one Rust-controlled request → unchanged JS
   provider stream → unchanged plugin tool → continuation → Pi session persistence
   → fresh-process continuation; compare upstream event order, context policy,
   failure and cancellation. Use scripted streams first for exact observations;
   live inference later proves operational usability, not exact text compatibility.
2. **Session surface:** migrations, all entry/header/labels and replacement APIs,
   setup/withSession callbacks, live getters, compaction/tree hooks, corrupt files,
   interrupted writes and locking behavior. Test observable object aliases and
   opaque custom values before assuming JSON snapshots preserve their contract.
3. **Plugin and ecosystem surface:** inventory every public registration/action/
   event; dynamic reload/disposal, module resolution including legacy aliases,
   package discovery/install, skills/prompts/themes/configuration, commands,
   shortcuts, flags, override collisions and cross-plugin event behavior.
4. **Providers and asynchronous behavior:** executable custom provider streams,
   payload/header/response hooks, OAuth/auth callbacks and refresh semantics,
   queued steering/followups, multiple rejections, Rust-originated cancellation and
   shutdown races with actual Node event-loop execution.
5. **UI compatibility:** real unchanged host mounting/disposal plus focus, overlays,
   editor factories, dialogs, keybindings, async factories, exceptions and shutdown.
   A terminal-free host-method test can cover mounting logic without proving a
   real interactive terminal lifecycle or all UI modes.
6. **Native/distribution contract:** supported Node/platform matrix, safe long-lived
   handles and GC/reference ownership, worker/thread dispatch, panic/error behavior,
   addon loading/versioning and packaging. Measure performance only if a benefit
   claim or a concrete operational constraint requires it.

These are remaining implementation/verification obligations, not reasons to keep
repeating equivalent isolated seam proofs. The next highest-value integration after
current UI review is the Rust-owned state machine using the existing native session
module and real JS callbacks. It directly tests whether the proposed ownership
boundary survives composition. No lowering of the full ecosystem target is implied.

## Independent audit method and reproducibility

Read architecture-evaluation.md, plugin-seams.md, native-seam-evaluation.md,
native-store-evaluation.md, checkpoint.md and append-only board history. Inspected
actual native-store-backend.mjs and src/pi_session_store.rs to confirm the stated
Rust ownership and JSON/fixture boundaries; checked InteractiveMode source method
locations for upcoming UI review. Existing test claims above are attributed to their
recorded independent reviews; this audit did not rerun unchanged historical suites.

## Current UI experiment independent execution

First execution of the in-progress `experiments/ui-lifecycle.mjs`:

```
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/ui-lifecycle.mjs
```

Exited 1 at the header render assertion: upstream Text returned `changed` followed
by 33 spaces for width 40, while the probe expected unpadded `changed`. Reported to
coordinator. This is an oracle expectation error in the new harness, not evidence
of a Rust/UI incompatibility; preserve it instead of counting the first run green.
Inspected original InteractiveMode methods at lines 2188–2375: factory values are
stored directly, old widget disposal precedes replacement, repeated clear empties
maps, and a throwing dispose interrupts replacement before map deletion. These
are actual upstream methods in the experiment, with constructor state manually
initialized and requestRender replaced by an identity sentinel.

After coordinator changed the expected rendering to exact `'changed'.padEnd(40)`,
independent rerun exited 0. This retains a strict width/content assertion rather
than suppressing the discrepancy. Trace was factory widget-old/footer/header,
dispose widget-old, factory widget-new, dispose widget-new/footer/header. All nine
reported checks correspond to explicit assertions in the script, including native
session reads from both factory and dispose callbacks and stale runner context.

Independent negative command (same command plus
`--json-component-counterexample`) exited 1 with `mounted widget must retain
factory instance`. It demonstrates why copying a component into JSON breaks this
specific host contract; it is not a comparison against a designed IPC object-handle
host and does not rule one out. Upstream source hash observed:
`80c0fc6d193daf08648dac3d68075bdfd6285bf095b8f380f32da9cbe9e7aa40`.

UI result strengthens keeping actual UI machinery and values in JS alongside Rust
session authority. It does not establish Rust-owned scheduling, terminal startup,
input/focus, overlay or async-factory lifecycle, actual shutdown disposal, or all
unchanged third-party UI plugins. The synthetic extension is explicitly synthetic;
no full-app mounting claim should be made from Object.create host initialization.

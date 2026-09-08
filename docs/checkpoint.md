# Current checkpoint — core-only Rust architecture evaluation

## Active goal and preserved constraints

User requests a Rust rewrite of only Pi core runtime with unchanged ecosystem
plugins and full compatibility. Assess whether TS host + Rust core can preserve
all semantics; compare TS fork control and Rust context-editing implementations.
Do not reduce compatibility scope, silently abandon Rust, or pursue the deferred
completion-check feature. User decision required only for core-goal/compatibility
changes, major licensing/distribution tradeoffs or real access blocks.

Starting commit0a934a0c792f47337a37a41abc45be608cc4935d; main authorized for pushes.
Pinned upstream9767ba275f3e9a5ee0f5c5342249b629ab1b2282, MIT. No credential access
needed this turn. Read docs/architecture-evaluation.md and docs/plugin-seams.md.

## Tested evidence, not full compatibility

- Actual upstream request-transform function with appended export and scripted
  stream compared to existing Rust Session.context:4 projection cases match,
  canonical prefix preserved. TS supports this context editing without rewriting
  the core. No persistence, full plugin loading, real provider or performance
  comparison is implied.
- Actual upstream EventBus vs naive JSON copying: identity/caller-visible mutation
  lost by copying. JS-local host retains this example. Does not disprove every
  IPC/native approach; synchronous dispatch itself remains equal in this probe.
- Independent reviewer reran both and confirmed scope. Source audit identifies
  synchronous state getters, lifecycle/stale getters, callbacks, TUI objects and
  provider streams as unresolved full-compatibility obligations.

## Precise next work

1. Read upstream unchanged examples/extensions/kimi-deferred-tools.ts and load it
   through actual loader/runner. Compare synchronous getActiveTools and activation
   during tool execution against a Rust-owned tool registry; next request must see
   identical state without replacing synchronous methods by Promises.
2. Execute actual ExtensionRunner context handler chain; compare TS control and
   Rust-backed policy across save/resume, including mutation isolation and errors.
   Existing direct-function probe is not sufficient for this requirement.
3. Exercise cancellation/reentrant core calls and UI handles. Keep all compatibility
   categories in inventory; local host objects are acceptable, retained TS core
   responsibilities must be explicit. Choose IPC vs native only after evidence.
4. Finish architecture recommendation and complete requirement-by-requirement
   audit before marking goal complete. No final architecture selected yet.

Reproduce current probes:
`export PATH="$HOME/.cargo/bin:$PATH"`
`cargo build --locked --example context_projection`
`node --experimental-vm-modules experiments/context-seam.mjs`
`node --experimental-strip-types experiments/plugin-reference-seam.mjs`
Results are tracked in experiments/*-seam-results.json. Bare cargo may be absent
from PATH; use exported path or ~/.cargo/bin/cargo. Do not treat that as runtime failure.

## Continuation and previous evidence

Board T022 active architecture assessment; T021 superseded/deferred. Coordinator
owns experiments/integration; one worker owned plugin-seams.md and independently
verified probes, now done.2 concurrent agents used, cap4. Native usage unavailable;
zero project live model calls this turn. No background-uptime promise.

Previous live experiments remain valid: Luna matrices8/9 then7/9, with correct
code but omitted tests; all resume transport/history checks passed. Raw .runs and
.env remain ignored/private. Previous9/9 gate applies to that specific live
reliability trial, not architecture source/projection experiments. Full Pi
compatibility, performance advantage and final Rust/JS design are unproven.
History is retained in docs/checkpoint-history.md.

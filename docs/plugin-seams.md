# Pi plugin boundary evidence

Reference: upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, verified with `git -C vendor/pi-mono rev-parse HEAD`. Status: **source-verified findings; architecture recommendations and experiments below are proposed, not execution-verified**. No model request, credential access, or plugin execution was needed for this audit.

Independent probe review performed after the source audit: the execution results at the end of this document supersede “proposed” only for those exact probes, not the broader plugin examples.

The objective remains replacing only the core runtime while preserving unchanged ecosystem behavior. A JSON tool-call bridge is not the full Pi extension contract. This finding does not prove Rust impossible: it identifies semantics that must remain in a JS host or receive explicit, tested bridging. None are silently excluded from compatibility.

All source references below are relative to `vendor/pi-mono/packages/coding-agent/` at that fixed commit. They can be inspected with `nl -ba <path>` or the corresponding fixed-commit GitHub URL.

## Decisive seams

| Source evidence | Actual consequence for a bridge | Unchanged upstream example |
| --- | --- | --- |
| `src/core/extensions/types.ts:1397`–`1428`: synchronous tool getters/setters and thinking-level access; `src/core/extensions/loader.ts:394`–`427` directly delegate to the shared runtime | Replacing a synchronous return with a Promise breaks ordinary extension code. A JS mirror requires defined read-after-write and refresh ordering; blocking IPC needs reentrancy analysis. | `examples/extensions/kimi-deferred-tools.ts:47`–`59` reads active tools, enables Calculator inside tool execution, and returns; the next request must see that activation. |
| `src/core/extensions/runner.ts:723`–`810`: context properties are guarded lazy getters. Command context preserves property descriptors explicitly rather than spreading a snapshot. | Serializing context once loses live model/UI/session access and stale-context rejection. The getter behavior is intentional, not incidental convenience. | `examples/extensions/custom-footer.ts:25`–`52` captures context and reads its branch and model later during rendering. `examples/extensions/handoff.ts:173`–`184` explicitly uses a replacement context after switching sessions. |
| `src/core/event-bus.ts:12`–`29`: Node EventEmitter invokes a wrapper that calls the handler before its first await. `src/core/extensions/loader.ts:445`–`454` exposes this shared bus. | Handler synchronous prefixes run during emit; argument object identity is preserved; errors are caught and logged. Fire-and-forget JSON messages change immediate mutation and nested emit ordering. This is not a claim that emit awaits asynchronous listeners. | `examples/extensions/event-bus.ts:13`–`41` stores context, registers a listener, and emits from commands/session callbacks. |
| `src/core/extensions/runner.ts:1100`–`1128`: provider header handlers mutate the same object in place and returned values are ignored. `runner.ts:1034`–`1063`: context messages are structured-cloned once, then handlers run sequentially over the evolving value. | Pure returned-result JSON adapters lose in-place changes unless explicitly captured; cloning independently for each listener also breaks chaining. Context canonical-history isolation is already an upstream semantic. | No unchanged example for header mutation was located in this bounded example search; use a minimal conformance extension and label it synthetic. |
| `src/core/extensions/types.ts:174`–`280`: factories, renderers, Theme/TUI methods, overlay handles, unsubscribe/dispose functions, and an editor factory getter are public API. | Functions and live Component objects cannot be represented as plain JSON values. Keeping original UI and factories in JS is plausible; rewriting UI or crossing every render callback greatly enlarges the bridge. “No new TUI work” cannot mean dropping existing UI plugins. | `examples/extensions/custom-footer.ts:25`–`57` returns a live component, subscribes to branch updates, calls requestRender, and disposes by function. |
| `src/core/extensions/types.ts:363`–`386`: session operations accept setup/withSession callbacks; `types.ts:485` and `:603`/`:659` expose AbortSignal to tools and compaction/tree hooks. | Nested callbacks need an operational protocol, not JSON serialization alone. Cancellation must wake an executing callback/tool with ordering and listener cleanup preserved; a field `aborted: true` is insufficient. | `examples/extensions/handoff.ts:177`–`184` uses withSession. `examples/extensions/sandbox/index.ts:182`–`188` subscribes/unsubscribes abort listeners and checks already-aborted state. |
| `src/core/extensions/types.ts:1523`–`1555`: custom streamSimple returns AssistantMessageEventStream; custom auth has login/refresh callbacks and a synchronous getApiKey. | Provider plugins contain executable JS transport and streaming logic. A Rust provider registry must dispatch into them and preserve callbacks, stream events, abort, and errors, rather than assume only built-in Rust providers exist. | `examples/extensions/custom-provider-anthropic/index.ts:609` registers its custom stream function; GitLab Duo does so at `examples/extensions/custom-provider-gitlab-duo/index.ts:403`. These were inspected, not invoked. |

Object identity nuance: `src/core/session-manager.ts:1274`–`1283` returns branch entries by reference; `:1310`–`1316` documents append-only usage but returns only a shallow array copy. Mutation of those entries is not a sanctioned update API. A clone may still change observable identity, but this audit does **not** promote accidental mutation into a newly invented public guarantee. Record such dependencies separately and test real ecosystem use before deciding whether preserving implementation quirks is required.

## Loader and lifecycle compatibility

`src/core/extensions/loader.ts:84`–`144` aliases current `@earendil-works/*` and legacy `@mariozechner/*` names, redirects pi-ai root imports to its compatibility entrypoint, and resolves TypeBox aliases. `:496`–`516` uses jiti and a factory cache; `:544`–`554` awaits extension factories. Merely accepting a JSON schema will not load unchanged modules or their dependencies.

`loader.ts:174`–`244` initializes action stubs that throw before runtime initialization, while accumulating provider registrations. `:266` guards use of the active instance. This means loader-time behavior, runtime-time registration, reload invalidation, and disposal are distinct contracts. They must not be collapsed into an always-available RPC API.

## Complete compatibility inventory to build

These categories are obligations for the full goal, not a whitelist that excludes unlisted behavior. The next inventory should enumerate every exported member and corresponding first-party test, rather than treating this table as completed coverage.

| Category | Required coverage | Current evidence here |
| --- | --- | --- |
| Discovery/install/load | packages, paths, aliases, dependencies, async initialization, flags, errors, reload/cache | Loader source only |
| Registration and invocation | tools/overrides, schema validation, commands, shortcuts, flags, renderers, dynamic registration | Types and examples only |
| Agent lifecycle | every event in types.ts:1257–1300, ordering, cancellation, chaining, thrown errors, queued input/steering | Selected runner source only |
| Runtime actions | synchronous reads/writes, nested calls, model changes, active tool changes, exec | Selected source only |
| Session contract | entry types and format, branch/compaction, replacement callbacks, persistence, live reads, stale handles | Selected source only |
| Context/model request | canonical versus transformed view, hook mutation/replacement order, headers/payload/response | Source only; coordinator owns executable experiment |
| UI and modes | original TUI components, factories/handles, keybindings/editor/theme, dialogs, mode-specific support and fallback | API and footer example only |
| Providers/auth | built-ins and plugin custom streams, credentials kept out of model context, refresh, cancellation, errors | API and registration examples only |
| Inter-plugin behavior | shared event bus, order, identity, shared imported modules, collisions and cleanup | EventBus source only |
| JS environment/export surface | Node APIs, package exports, executable tool factory imports, process/module assumptions | Alias and built-in-tool wrapper examples only |
| Failures/performance | observable error semantics, abnormal exit, cancellation races, latency/memory measurement | Not measured |

## Three counterexamples to execute next

1. **Synchronous bus mutation and nested dispatch:** load the original event bus, register a listener that mutates a passed object and emits a nested event, then inspect the object and trace immediately after emit. Compare original with naive JSON request/reply. Include an async listener to prove only its prefix is synchronous. Expected source-derived result: in-place mutation and nested synchronous prefix are visible before emit returns. This synthetic conformance probe supplements, not replaces, unchanged event-bus.ts.
2. **Deferred tool activation during execution:** load unchanged kimi-deferred-tools.ts, invoke tool_search for calculator, inspect next request's active tool set, and compare original. Also assert getter returns an Array immediately. This tests a genuine plugin, synchronous actions, and core/host request ordering without a live model.
3. **Captured context liveness and invalidation:** execute original runner context against mutable backing model/session getters, change them, and read through the captured context. Invalidate the runner and assert stale accesses fail. Follow with unchanged custom-footer.ts using a JS TUI adapter, verifying later render observes the changed model and disposal removes its listener. A snapshot shim should fail the first part; retaining the original JS host may pass. Do not claim full terminal integration from an adapter test.

## Provisional architecture implication

Preserve the JS loader, extension runner, TUI objects and provider plugin execution as the compatibility shell while experimentally moving a narrow data-oriented operation into Rust. This is a **proposed intermediate architecture**, not proof of core-runtime replacement. Inventory authoritative ownership explicitly: if Node still owns scheduling, sessions, and context semantics, report the result as a Rust helper rather than a Rust core. Native bindings preserve synchronous call signatures more naturally than asynchronous IPC, but alone do not solve state ownership, reentrancy, shared object semantics, or compatibility. No performance or full-compatibility conclusion follows from this source audit.

## Independent execution review

The plugin-seam worker read coordinator-authored `experiments/context-seam.mjs`, `experiments/plugin-reference-seam.mjs`, and `examples/context_projection.rs`, then reran them. Initial `cargo build --locked --example context_projection` exited 127 because cargo is not on this shell's PATH; the absolute executable succeeded. Commands:

```sh
/Users/stevensun/.cargo/bin/cargo build --locked --example context_projection
node --experimental-vm-modules experiments/context-seam.mjs
node --experimental-strip-types experiments/plugin-reference-seam.mjs
```

All three exited 0. Context limits null, 0, 2, and 100 produced equal TS/Rust projections and preserved original messages. The probe exercises the unchanged upstream private request-function body with an appended export; it supplies an identity message conversion and scripted stream. Its OpenAI-style tool messages are deliberately not Pi toolResult wire messages. Thus it proves this projection can be placed before conversion in the request seam, not a schema-compatible Pi extension or complete fork. The Rust side calls the existing `Session.context`, not a duplicate comparator implementation. Current cases do not validate persistence, multiple chained extension transformations, abort, or errors.

The real upstream EventBus preserved immediate handler execution and shared object mutation; a deliberately JSON-copying adapter preserved order but lost identity and mutation. Host-local original EventBus preserved the observation. This is a genuine counterexample to **naive value copying**, not proof that IPC necessarily breaks event bus semantics: keeping the bus inside the JS process is enough for this case. Nested dispatch and async prefixes from proposed experiment 1 remain untested.

Minimum next useful experiment: execute unchanged `kimi-deferred-tools.ts` through the actual extension loader/runner with a scripted model request boundary and Rust-backed active-tool state. Assert tool_search activation is visible in the next request without changing its source or replacing synchronous getters with promises. This moves beyond pure projection and demonstrates whether a real plugin can affect authoritative Rust scheduling state. Retain the original-runner version as oracle. Do not infer full compatibility from it.

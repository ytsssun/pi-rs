# Actual Pi plugin host boundary experiment

Status: tested local TS control; coordinator owns Rust comparison. This is not
full plugin compatibility or a replacement runtime.

Reference: Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, MIT,
`packages/coding-agent/src/core/extensions/{loader,runner}.ts` and unchanged
`packages/coding-agent/examples/extensions/kimi-deferred-tools.ts`.
Plugin SHA256: `3ed3203385bcd621b4e3071ce815cf6a841aa5857bd7a5c83f7aff16be9ea7cf`.

## Reproduction and environment

From pi-rs root (no credentials needed):

```sh
npm --prefix vendor/pi-mono ci --ignore-scripts --no-audit --no-fund
npm --prefix vendor/pi-mono run hydrate:model-data
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs prototype/real-plugin-host.mjs
git -C vendor/pi-mono status --short
```

Executed successfully on Node22.18.0/npm10.9.3. Upstream requires Node>=22.19,
and an unrelated gondolin workspace requires>=23.6: npm reported engine warnings.
Observed probe success is not evidence of support for the older Node across Pi.
`npm ci --ignore-scripts` installed320 packages; no lifecycle scripts executed.
No tracked upstream changes after setup or execution. Lock SHA256:
`f7e0d7faf7293581715d53ddf3f76bbb7dc14d79ded9c2ac1303756c21e9fed1`.

Initial import failed because generated `providers/data/.manifest.json` was
absent. Upstream hydration fetched public model catalogs and wrote ignored JSON,
with no source edits. These data are not pinned by the reference git commit;
their values are not exercised by these tool/context probes. Manifest SHA256 in
this run: `3fbe62be22d3a6562cc2b3f410872e0ac2702e082ee7adbd009ee7fea5f81c2a`.
For reproducibility of model catalog behavior, a separate pinned data artifact
would be required. This experiment makes no such claim.

## Supplied core interface and retained responsibilities

`prototype/real-plugin-host.mjs` exports:

- `exercise(backend)`: deferred-tools scenario plus stale API assertions.
- `createHost(backend, {factories, cwd})`: actual loader and ExtensionRunner;
  returns runner, eventBus, errors, execute, requestTools and runtime.
- `exerciseContext(project)`: actual context handler chaining with mutation,
  optional synchronous projection, error capture and continuation.
- `tsBackend(initial)`: TS active-name array control.

Backend requires synchronous `getActiveTools(): string[]` and
`setActiveTools(names): void`; returning Promises is rejected. This deliberately
lets the coordinator supply a Rust-owned registry without adapting the plugin.
Tool definitions, callback closures, event bus, loader, runner, invalidation and
context chaining remain actual upstream JavaScript/TypeScript responsibilities.
Core's sessionManager/modelRegistry and unexercised actions are explicit throwing
bindings, not implementations. Minimal idle/trust/model context values are test
bindings. No loader/runner method or plugin source is patched or stubbed.

`requestTools()` is a next-boundary tool-schema snapshot. It does not run the
Pi agent loop or transmit a model request. The test invokes registered execute
callbacks directly after checking activation; tool-wrapper hooks and validation
are outside this evidence. Active registry copies use value semantics selected
for this probe; general object-identity compatibility is not established.

## Observed assertions

1. Actual loader loads the unmodified extension and its real typebox dependency.
2. Actual runner's session_start invokes setActiveTools(['tool_search']).
3. Weather search leaves active tools unchanged.
4. CALC search synchronously adds Calculator; next snapshot includes both names.
5. Repeated search adds nothing; Calculator returns42, exactly as this upstream
   demonstration intentionally implements (not an arithmetic correctness test).
6. Runner invalidation rejects an old context getter and tool_search's captured
   pi.getActiveTools call.
7. Actual emitContext structured-clones canonical messages before handlers,
   preserves handler order, accepts returned replacement arrays, catches errors,
   and continues subsequent handlers. A mutation before a throw remains in the
   projected messages; canonical input stays unchanged.

The four context factories are explicit synthetic counterexample probes loaded
through actual `loadExtensionFromFactory`, not claimed to be real ecosystem
plugins. The deferred-tools plugin is the unchanged real upstream example.
These results narrow a boundary question, not certify all plugins or performance.

## Independent integration recheck

The coordinator's `experiments/real-plugin-architecture.mjs` additionally invokes
the original `runAgentLoop` through `prototype/architecture/original-loop.mjs`.
Independent rerun exited0: both backends produced actual scripted-stream request
tool lists `[tool_search]`, `[tool_search, Calculator]`, then the same two tools.
The original loop executed both tool calls and emitted matching event sequences.
This closes the earlier snapshot-only limitation for this combined experiment;
the standalone host `requestTools()` remains only a snapshot. The loop is still
the original TS loop, the model stream is scripted, and callback wrappers do not
test forwarding of cancellation signals or update callbacks.

Review identified that reading canonical backend text inside a later context
handler overwrote edits made by an earlier plugin. The revised projection takes
the current event messages, preserving that edit with policy disabled and
truncating the edited text when enabled. Separate child processes retain the
policy, reset it, and preserve canonical history; TS/Rust reports match.

Independent commands (same TSX environment as above):

```sh
node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/real-plugin-architecture.mjs
node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/real-plugin-architecture.mjs --canonical-counterexample
```

The first exits0. The negative mode exits1 at `disabled policy must not overwrite
preceding plugin edits`, receiving original text instead of
`extension-adjusted-result`. It exits on the TS control before reaching Rust;
this is a counterexample to the old projection approach, not two separately
executed negative backend tests. Original-loop scheduling, full Pi session
formats, malformed persisted-state equivalence, UI, and general multi-block
message translation remain outside the tested Rust boundary.

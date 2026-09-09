# Pinned Pi ModelRegistry audit

Reference upstream: commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282` (Pi mono).

## Observed API surface

`ModelRegistry` is created with `ModelRegistry.create(authStorage)` and is passed into `AgentSession`/`createAgentSession`. The SDK documentation demonstrates:

- `find(provider, modelId)`: returns a built-in or `models.json` custom model without requiring credentials.
- `getAvailable()`: asynchronously enumerates models whose providers have usable API keys.
- `getApiKey(model)`: resolves credentials at request time (including refresh-capable auth storage).

CLI model selection uses `modelRegistry.find` for saved defaults and `resolveModelScope` for `--models`; absence of an explicit model falls back to the first available model. Extension registration (`pi.registerProvider(name, config)`) adds provider configuration to the host registry; `unregisterProvider(name)` removes it. Registration config can supply `baseUrl`, API kind, model definitions and stream/request implementation, but the exact validation and merge rules are provider-specific.

Upstream SDK examples and type references: [coding-agent SDK model section](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/docs/sdk.md), [AgentSession ModelRegistry binding](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/agent-session.ts), and [model-registry implementation](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/model-registry.ts).

## Minimal compatible slice for pi-rs

1. Retain provider registrations by name with deterministic replacement and unregister semantics (already exercised by `experiments/provider-registration.mjs`, board E245).
2. Implement pure `find(provider, id)` over built-in fixture models plus registered custom models; no credential lookup.
3. Add deterministic `getAvailable` using an injected credential map (never process-global secrets), and `getApiKey` returning fixture values or a typed missing-credential error.
4. Keep provider/model identity (`provider`, `id`, API kind, base URL) attached to resolved model so session persistence and resume can validate identity.

OAuth refresh, settings/models.json parsing, provider aliases, and network execution should remain explicitly out of this slice until independently evidenced.

## Deterministic fixture proposal

Create a fixture registry with providers `fixture-a` and `fixture-b`, models `alpha` and `beta`, and credential map containing only `fixture-a`. Assert: `find` resolves both registered models without credentials; `getAvailable` returns only `fixture-a/alpha`; missing `getApiKey` yields stable error code; unregister removes model; replacing `fixture-a` changes resolution deterministically. Run in a fresh process and record command/result in `docs/board.jsonl` as tested (not parity).

## Deterministic pinned ModelRuntime probe (2026-09-08)

`experiments/model-runtime-probe.mjs` constructs the vendored `ModelRuntime` with `modelsPath: null`, `refreshOnCreate: false`, and `allowModelNetwork: false`. Running `node --experimental-strip-types experiments/model-runtime-probe.mjs` produced `{"available":0,"methods":[["getAvailable","function"],["refresh","function"],["registerProvider","function"]]}`. This proves construction and the public availability/refresh/registration methods without network or credentials. The runtime's model catalog is private (no public `all`/`find` methods); resolution is exposed through the underlying `Models` contract used internally. Rust cannot claim equivalent construction until it supplies credential storage, model config/store, builtin provider catalog, and provider composition/auth adapters. No network or live provider verification was attempted.

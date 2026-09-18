# Rust core migration roadmap

This roadmap turns the Pi fork strategy into mergeable slices. The project is your own `ytsssun/pi-rs` product repository. It may copy and adapt upstream Pi code, but it does not need to submit pull requests to `earendil-works/pi`. The fork keeps the useful Pi package contracts while replacing `packages/agent` behind those contracts. Every stage must pass the prior stage's tests; no stage changes the acceptance bar silently.

## Stage 0 — Fork baseline and oracle

**Starting shape:** `ytsssun/pi-rs` follows upstream Pi; Rust work is in `codex/pi-rs-migration` and the archived standalone repository.

- Pin the upstream base commit in `docs/upstream.md`.
- Keep a clean upstream CLI/provider/extension fixture suite as the oracle.
- Add a fork CI job that builds the Rust addon and runs the unchanged coding-agent tests plus pi-rs compatibility probes.
- Define package ownership in `docs/upstream-package-boundaries.md`.

**Exit:** clean fork checkout builds; upstream coding-agent deterministic model/tool/session fixtures pass; Rust tests are additive and no fork main files are overwritten.

## Stage 1 — Package-compatible Agent facade

Move the current experimental adapter into the fork's `packages/agent` implementation boundary. Keep the upstream package exports and TypeScript types, but make `Agent` delegate to a Rust Node-API handle.

- Preserve constructor/state shape, `prompt`, `continue`, `steer`, `followUp`, queue clearing, `abort`, subscriptions and stream events.
- Keep provider and tool effects in the host; Rust decides actions and state transitions.
- Remove loader substitution from the normal fork path; retain it only as a migration oracle.
- Add upstream Agent conformance cases for text, mixed image content, custom messages, tool calls, provider failure, retry and cancellation.

**Exit:** unchanged `coding-agent` imports the fork's Agent package without a loader; all Stage 0 and Agent conformance fixtures pass in new and resumed processes.

## Stage 2 — Session and context ownership

Replace the upstream AgentSession policy that duplicates runtime decisions while preserving its public events and extension hooks.

- Rust owns canonical entries, branches, compaction records, context projection and process locks.
- Node forwards extension `session_*` hooks and returns their decisions to Rust.
- Implement context adoption as a request-scoped Rust operation; never rewrite canonical history when a hook or compaction changes the model view.
- Cover compaction, branch selection, resume, interrupted effects and failed provider retries with independent assertions.

**Exit:** unchanged coding-agent session commands and extensions pass compact/branch/resume fixtures; canonical history byte prefix and hook event order are preserved.

## Stage 3 — Provider boundary

Keep `pi-ai` model/provider types and registration API while moving transport policy behind a compatible Rust implementation.

- Rust owns HTTP/SSE framing, bounded queues, retries, cancellation, usage and wire audit.
- Node compatibility host converts provider registration and credentials into Rust requests.
- Preserve custom provider extensions through an explicit adapter; do not require every provider to be rewritten at once.
- Run provider contract fixtures for OpenAI-compatible, Anthropic-compatible and one extension-registered provider before removing the old transport.

**Exit:** provider request/response fixtures and live smoke pass through the same fork Agent path; failure, retry, usage and cancellation semantics are equivalent for the tested profiles.

## Stage 4 — Built-in tools and normal command

Move built-in coding tools and the default command onto the Rust implementation while retaining extension-visible schemas and results.

- Implement read, write, edit and bash in Rust with Pi-compatible arguments, limits, permissions and error results.
- Keep extension tools in Node and use the same Rust action boundary.
- Make the normal `pi` command select the Rust core; keep an explicit upstream-core fallback during one release cycle.
- Retire the custom headless CLI after equivalent interactive and print-mode workflows pass.

**Exit:** a user can install the fork, run a normal coding task, resume in a new process, use an unchanged extension, and observe equivalent session/tool events.

## Stage 5 — Remove migration scaffolding

Only after the previous exits pass:

- remove loader substitution and duplicate adapter paths;
- archive or delete the standalone implementation that is no longer on the product path;
- keep upstream source as a versioned reference/oracle, not a runtime dependency where Rust has replaced it;
- publish a compatibility matrix with tested versions and explicit unsupported behavior.

## Operating rules

Each pi-rs pull request owns one stage slice. These are internal PRs in `ytsssun/pi-rs`; do not open PRs against the upstream Pi repository. A PR is not complete when local tests pass: exact-head CI must pass, an independent fixture must exercise the real fork entry point, and the checkpoint must record limits and the next dependency. If a stage exposes a contract conflict, stop that slice and record the conflict rather than changing the contract or calling it compatible.

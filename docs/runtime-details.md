# Runtime details and compatibility limits

## Default CLI

The default `pi-rs` launches the Node host with the Rust Node-API runtime and original Pi tools. Requires the source checkout, built addon, and upstream dependencies. Both new and resumed turns require explicit workspace and input. Extensions must be supplied on each invocation. Non-sensitive model identifiers are persisted as `pi-rs.model.v1` and can be reused on resume; API keys and OAuth tokens are never persisted. The OpenAI-compatible streaming transport is live-verified and its SSE decoder preserves UTF-8/CRLF chunk boundaries for tool continuation, but incremental event exposure to the JS/UI boundary is not yet provided. Full Pi lifecycle, cancellation, discovery and migration remain incomplete.

## Provider registration

Extensions can register named provider configurations through the unchanged `pi.registerProvider(name, config)` API; the host now retains registrations and supports unregister. Model resolution, OAuth/API credential wiring, provider request execution, and scoped model enumeration remain unverified.

## Extension message delivery

Custom messages sent during execution with explicit `triggerTurn: false` or deferred delivery options are appended as upstream-compatible `custom_message` entries after the current execution completes. They enter subsequent model context and survive process restart. Delivery options are retained. Headless `steer`, `followUp`, and `nextTurn` are currently persisted at turn end as deferred fallbacks; they do not interrupt an in-flight provider request or start a nested turn. Message lifecycle events and pending-queue crash recovery remain open. Deterministic reproduction: `node --experimental-strip-types experiments/extension-message-recovery.mjs`.

## Legacy CLI behavior and recovery

The following limits apply to `pi-rs-legacy`, not the original tools used by the default CLI.

- `read`: UTF-8 regular file up to 8 MiB; positive integer `offset` (1-based) and `limit`, with Pi-style 2000-line/50 KiB output truncation and continuation notices. No images. Raw edit input remains capped at 64 KiB and never uses a rendered read page.
- `write`: `{path,content}`, creates parents and atomically replaces files, maximum 1 MiB. Workspace traversal/symlink restrictions assume no hostile concurrent filesystem mutation.
- `edit`: `{path,edits:[{oldText,newText}]}` targets original file ranges without cascading; BOM/newline handling and ambiguity rules are compared against pinned Pi. Source maximum 64 KiB. Fuzzy-only replacements, legacy argument coercion and rendered diff metadata are not supported; see [exact-profile evidence](experiments/edit-differential.md).
- `bash`: `{command,timeout?}`, integer seconds, default 30/max 300; retains at most 32 KiB per stdout/stderr stream. Nonzero exit/timeout becomes an error tool result. Normal shell exit/timeout kills ordinary background descendants in its process group. Detached processes or abrupt runtime death are not contained.
- `--resume` continues unfinished work or returns the saved final result. `--resume --input TEXT` appends only after the prior turn completed. A mismatched explicit workspace is rejected.
- `--context-tool-chars N` persists a model-view truncation policy across resumes. Use `--context-tool-chars none` to clear it and restore full canonical tool results to the model view. Canonical tool results remain intact. Each real policy change appends a native `context_policy_changes` entry with previous/new limits and canonical message count. Reapplying the same limit adds no entry. This is a logical audit inside atomic snapshots, not a tamper-proof external log or branch system.
- Native v1 JSON snapshots use fsync/rename and an appended `.lock` file with Unix flock. Old v1 sessions load with default new fields. Leave the permanent lock file in place; ownership releases on process death. A leftover `.tmp` from interrupted save requires inspection before removal; no automatic promotion of incomplete snapshots.
- Before a write/edit/bash effect, an `in_flight` marker is saved. If the process dies before the result is saved, resume refuses automatic replay. Inspect files and surviving processes, then use `--resume --resolve-in-flight 'observed outcome'` with the normal model/fixture arguments. This records an operator-supplied result and continues; it does not re-run that call or prove exactly-once effects. Do not resolve while the original process is still changing files.


## Headless extension commands

`--input '/name raw arguments'` dispatches a registered extension command before a model request. Parsing uses upstream's first literal space and preserves the remainder unchanged; unknown names (including case differences and tab-separated names) fall through to model input. Handler failures are reported in `extensionErrors` and do not turn into model requests. Explicit `--command` retains its existing interface. Verify with `node --experimental-strip-types experiments/command-invocation.mjs`. Interactive active-turn queue/steer semantics and command session-control methods are not established by this headless fixture.

## Command context during native drive

The host binds the six command actions from pinned upstream `ExtensionRunner.bindCommandContext` (`runner.ts`, Pi `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`): `waitForIdle`, `newSession`, `fork`, `navigateTree`, `switchSession`, and `reload`. The five session-control methods explicitly throw unsupported-binding errors; upstream's default success-shaped no-ops are not used. `isIdle` tracks the complete native drive, including provider/tool work and message delivery cleanup, independently of the pending-message queue. `waitForIdle` resolves after drive cleanup on success or failure. A second drive on the same host is rejected before it can append input.

Deterministic reproduction: `node --experimental-strip-types experiments/command-idle.mjs`. This uses the actual Rust Node-API driver and blocked provider fixture, dispatches a registered slash command in flight, checks cleanup on success/provider failure/delivery failure, and verifies no command-created model request or user entry and unchanged history for unsupported controls. This establishes host drive lifecycle only: upstream `isIdle` also includes compaction state; compaction, interactive input scheduling, cancellation, and session-control parity remain open. Separate hosts sharing one manager are not a supported concurrency mechanism.

## Native session identity and clocks

New native sessions generate UUID v4 IDs accepted by pinned Pi's session ID validator (upstream itself generates UUID v7). Rust snapshots retain the parsed header so getSessionId works before persistence and after reopen. Existing headers and canonical entries are preserved on resume. The Node driver supplies wall-clock ISO entry timestamps and millisecond user/tool message timestamps to Rust actions; explicit request timestamps remain possible for deterministic runtime tests. Model-provided assistant timestamps remain provider-owned. No UUID-generation-version or performance parity is claimed.

## Formal CLI session replacement

The CLI owner binds idle-only `newSession({setup})` using the real native store. The bare test host still rejects unbound session controls. Veto precedes allocation; old context invalidation precedes the new startup event; setup runs afterward. New files retain lazy persistence. `parentSession` and `withSession` reject explicitly. Unlike pinned upstream, active turns are rejected rather than aborted. Deterministic fixtures: `experiments/cli-new-session.mjs`, `experiments/session-owner-failures.mjs`. Live replacement and full session-control compatibility remain unverified.

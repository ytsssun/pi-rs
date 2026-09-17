# Core replacement review — 2026-09-17

## Conclusion

Current pi-rs is a separate headless CLI using selected unchanged Pi components and a Rust runtime. It is **not** an unchanged upstream Pi CLI with its core swapped out. The experimental AgentSession seam below now passes a deterministic slice; the original CLI is still not integrated. The desired product remains a Rust core under the Pi ecosystem; a second complete CLI implementation is not necessary to that goal.

Current path:

```text
pi-rs Rust launcher -> our bin/pi-native.mjs -> our host/driver
                                             -> Rust PiRuntime + session store
                                             -> original Pi tools/loader/callbacks
                                             -> partly original, partly custom providers
```

Target integration experiment:

```text
upstream Pi UI/CLI -> upstream AgentSession -> Agent-compatible adapter
                                           -> Rust execution policy
                                           -> original Node tools/providers
```

The custom provider request conversion and CLI/session owner have duplicated upstream responsibilities. Recent missing tool guidance, missing model binding and dropped assistant text are concrete costs of this approach. Rust runtime work is reusable, but those adapters are not proof of ecosystem compatibility.

## Executed check and source evidence

Pinned Pi: 9767ba275f3e9a5ee0f5c5342249b629ab1b2282.

Run `node --experimental-strip-types experiments/core-injection-probe.mjs`.

The current native module exports only `drive`. Direct injection into the real upstream AgentSession constructor fails at `this.agent.subscribe is not a function`. This deliberately minimal negative test proves the existing module does not satisfy that interface; it does not prove an adapter is impossible or enumerate every missing method. No live model or TUI is exercised.

- `packages/coding-agent/src/core/sdk.ts` constructs `new Agent(...)` and later `new AgentSession(...)`. CreateAgentSessionOptions has no agent-factory option.
- `packages/coding-agent/src/main.ts` MainOptions exposes extension factories, not an agent factory. The CLI creates its own session runtime factory internally.
- `packages/coding-agent/src/core/agent-session.ts` accepts an Agent via its constructor and immediately subscribes. This is the narrower SDK seam to test first.
- `agent-session-runtime.ts` has a whole-session runtime factory. Replacing a whole Session requires a larger surface than replacing Agent beneath it.

## Setup review

CI and deterministic comparisons catch real regressions, but many tests exercise our custom path rather than the intended replacement seam. Helper tests previously overstated formal integration. Repeated direct-main evidence commits also created integration conflicts; one behavioral change bypassed the PR gate and had to be corrected. Architecture documentation retained contradictory historical claims. These are coordination failures, not user decisions or capacity blockers.

## Next frozen milestone

Build an experimental Agent-shaped adapter beneath unchanged upstream AgentSession in an isolated worktree. Retain upstream provider/tool implementations and upstream session ownership for this experiment; avoid double persistence. Rust must demonstrably choose model/tool/continuation actions, not delegate its loop back to upstream Agent.

Acceptance: real upstream AgentSession executes one deterministic tool-edit turn, delivers normal message/tool/lifecycle events, queues one follow-up, settles, and can reopen its session in a new process. External assertions protect the edited result. Instrument the Rust boundary so a hidden upstream Agent loop cannot pass. First inventory required Agent methods/state/setters/hooks, then implement only this vertical slice. Report streaming, cancellation and unsupported methods explicitly. No TUI or unchanged CLI success claim until the original entry point actually runs with the adapter.

After this SDK seam succeeds, choose a minimal, explicit CLI integration hook or package adapter. Do not patch vendored source silently, claim all plugins work, or replace more of AgentSession before evidence requires it.

## AgentSession interface audit

Direct `this.agent` member references in pinned agent-session.ts include state, subscribe, prompt, continue, abort, signal, steer, followUp, clearAllQueues, hasQueuedMessages, steeringMode, followUpMode, streamFunction, beforeToolCall, afterToolCall, prepareNextTurn and prepareNextTurnWithContext. This is a direct-access inventory, not complete interface coverage: aliases and CLI/UI consumers need separate inspection.

Two integration constraints are now source-confirmed:

- AgentSession persists every normal message_end after extension/subscriber dispatch (around lines 670–699). Keep upstream session manager canonical in the experiment; a Rust scratch state must not also append to that file.
- AgentSession installs prepareNextTurnWithContext (around lines 561–583) to refresh compaction context, prompt, tools, model and thinking level. Call it at each model boundary; copying initial state only cannot preserve this behavior.

Worker prototype must instrument native actions, exercise real Session listeners, and surface unsupported APIs. Its output is not accepted until independently executed.

## Executed adapter slice

`experiments/agent-shaped-adapter.mjs` now supplies an experimental Agent interface to unchanged upstream AgentSession. Run:

```sh
python3 scripts/build-native-session.py
node --experimental-strip-types experiments/agent-session-rust-probe.mjs --upstream
node --experimental-strip-types experiments/agent-session-rust-probe.mjs
```

Both paths pass the same file-content, event-order, follow-up, idle/settlement and six-message canonical-history assertions. A child process opens the actual upstream session file and checks its messages. The native path additionally asserts Rust model/tool actions (three model requests and one original edit tool). The fixture provider chooses fixed calls; this is not live-model evidence.

Worker artifacts were recovered after a capacity interruption. Independent execution initially failed: its queue lacked the `message` field; after fixing that, legacy edit arguments failed because the adapter skipped the original tool's `prepareArguments`. Calling that upstream normalizer and validator fixed the tool result. String user content was changed to preserve upstream content arrays. These failures are retained on the board.

Limits: this is an experiment, not a supported CLI mode. Native history is a separate scratch journal; only upstream SessionManager owns the canonical file. New-process *reading* passes; reopening an adapter and continuing work does not yet. Streaming updates are consumed without forwarding; cancellation, failure recovery, hook context, queue clearing, non-text prompts, compaction/history replacement and the full Agent API remain incomplete. Follow-up runs within the same invocation, not through `continue()`. Identical events here do not establish general lifecycle compatibility.

Next critical path: import canonical upstream history into fresh Rust state and continue through a new AgentSession/adapter process, then wire the actual CLI construction seam with an explicit package adapter. Keep this separate from replacing upstream Session policy in Rust; that larger ownership goal remains open.

### Continuation follow-up

The same probe now starts a fresh child process, opens the upstream session, seeds a new native scratch journal from canonical context, and executes another edit. Both upstream and native paths pass; the canonical log has exactly ten messages and preserves the first six. Optional `undefined` fields in upstream in-memory tool messages are normalized through JSON for the persisted-history comparison; the first assertion failed on `usage: undefined`, not lost persisted data. No other history fields are excluded. This supersedes the read-only limitation above for this fixture only. Branching, compaction, interrupted calls and arbitrary session migration remain unverified.

### Original CLI entry-point experiment

Run `node --experimental-strip-types experiments/upstream-cli-rust-probe.mjs`. A Node ESM loader substitutes only the root `@earendil-works/pi-agent-core` import with a facade exporting the original package plus an experimental Rust-backed Agent. The unchanged built upstream CLI performs a file edit, exits, reopens the same canonical session and performs another edit. External assertions check file contents, four/eight persisted messages, preserved prefix, and two Rust model actions plus a tool action in each process. Child environment contains only temporary HOME, PATH, fixture identifiers and a dummy API key.

This is a test seam, not a distribution design: the facade preallocates one Agent, overrides the model stream with fixed responses and does not forward the complete SDK option contract. Streaming/provider integration and arbitrary session replacement remain open. No upstream source files are changed; the package still reexports upstream helpers. Next remove the singleton/stream bypass while keeping the original CLI acceptance.

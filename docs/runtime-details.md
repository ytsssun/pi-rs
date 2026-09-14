# Runtime details and compatibility limits

## Default CLI

The default `pi-rs` launches the Node host with the Rust Node-API runtime and original Pi tools. Requires the source checkout, built addon, and upstream dependencies. Both new and resumed turns require explicit workspace and input. Extensions must be supplied on each invocation. Non-sensitive model identifiers are persisted as `pi-rs.model.v1` and can be reused on resume; API keys and OAuth tokens are never persisted. The OpenAI-compatible streaming transport is live-verified and its SSE decoder preserves UTF-8/CRLF chunk boundaries for tool continuation, but incremental event exposure to the JS/UI boundary is not yet provided. Full Pi lifecycle, cancellation, discovery and migration remain incomplete.

## Provider registration

Extensions can register named provider configurations through the unchanged `pi.registerProvider(name, config)` API; the host now retains registrations and supports unregister. Model resolution, OAuth/API credential wiring, provider request execution, and scoped model enumeration remain unverified.

## Extension message delivery

Custom messages with `triggerTurn:false` and no `deliverAs` are appended after execution and survive restart. `deliverAs:nextTurn` instead stays in the host's in-memory queue until the next drive: Rust validates all custom inputs before appending the user followed by queued messages in FIFO order, and the host removes them only after successful begin. Unconsumed pending messages are lost on process exit, matching pinned upstream; consumed messages persist once. Deterministic reproduction: `node --experimental-strip-types experiments/next-turn-queue.mjs`. This proves native ordering and real subprocess recovery with fixture responses, not live-model scheduling, steering, cancellation, or lifecycle-event parity.

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

The CLI owner binds idle-only `newSession({setup})` using the real native store. The bare test host still rejects unbound session controls. Veto precedes allocation; old context invalidation precedes the new startup event; setup runs afterward. New files retain lazy persistence. `parentSession` persists as a header reference. Idle `withSession` receives a fresh guarded command context after startup and setup; see the scoped callback contract below. Unlike pinned upstream, active turns are rejected rather than aborted. Deterministic fixtures: `experiments/cli-new-session.mjs`, `experiments/session-owner-failures.mjs`. Live replacement and full session-control compatibility remain unverified.

## Formal CLI command then input

The native CLI supports `--command NAME --input TEXT` as a pi-rs extension: it dispatches the registered command, then drives the input on the command's current session owner. Explicit `--model` or `--fixture` is required for the input; command-only invocations reject transport options. This ordering is pi-rs-specific and is covered by the command-input fixture when enabled in CI.

## Deferred message verification scope

`experiments/deferred-custom-message.mjs` independently tests `triggerTurn:false` without `deliverAs`: append after the current assistant and include in fresh-process context. The older `extension-message-recovery.mjs` turn-end nextTurn expectation is superseded and now aliases the corrected gate. Pinned `agent-session.ts:1258-1275` appends the user before pending custom messages; the nextTurn queue is in-memory. Class-priority sorting at turn end does not prove steering/follow-up semantics. Message start/end event ordering and tool-pair interleaving still require dedicated tests.

### Scoped custom-message observation

`drive({onSessionEvent})` accepts a synchronous observer for non-`deliverAs`, explicit `triggerTurn:false` custom messages only. The host captures the custom message timestamp at admission; after canonical append the driver calls `message_start` then `message_end` with the same message object. These are direct session subscriber observations, not generic event-bus messages or ExtensionRunner dispatch. This follows pinned `agent-session.ts:590` and `1516-1525`; ordinary agent message forwarding to extensions at `791` is a separate path.

Synchronous observer exceptions propagate: history remains committed, `message_end` is not called if `message_start` throws, consumed messages are not retried, and drive still becomes idle. This small seam does not await observer promises (use synchronous callbacks), does not implement `AgentSession.subscribe`, and makes no normal-message, nextTurn-event, steer/followUp or cancellation claim. Run `node --experimental-strip-types experiments/deferred-message-events.mjs`: actual native tool execution verifies persistence before callbacks, no split toolCall/toolResult, one event pair, timestamp/object identity, and both observer-failure points.

## Cooperative sequential tool cancellation

`drive({signal})` combines its caller signal with the host lifecycle signal and passes it to registered single-tool executions. Cancellation does not race away from an unfinished tool: idle waiters remain blocked until execution and update delivery settle. The settled tool result is persisted before Rust receives an aborted assistant outcome at the next model boundary; no further provider request is made there. Remaining sequential calls are rejected before execution and retain their tool-result pairing. An explicit signal with parallel drive is rejected before input admission.

This is cooperative cancellation, not rollback or guaranteed termination. A tool ignoring its signal can keep the drive busy indefinitely. The pinned upstream bash tool listens for abort and kills its process tree (`tools/bash.ts`); read listens for abort, while write/edit check abort around awaits and may already have applied effects. This fixture tests an actual registered controlled tool, not OS process containment or live provider interruption. Host abort also invalidates extension contexts; this change does not redefine that lifetime. Reproduce with `node --experimental-strip-types experiments/cooperative-tool-cancel.mjs`; it proves caller/extension abort notification, delayed cleanup, exactly one settled result, canonical pairing, and child-process reopen without tool replay. Parallel cancellation, provider cancellation during streaming, CLI signal wiring, and complete upstream abort parity remain unverified.

## Idle replacement callbacks

`newSession({withSession})` invokes the callback once after session_start and setup, using the replacement native manager and unchanged runner command-context getters. Veto invokes neither setup nor callback. Callback exceptions propagate while the replacement remains usable; old contexts remain stale. This matches pinned Pi `agent-session-runtime.ts` newSession/finishSessionReplacement ordering and `agent-session.ts` createReplacedSessionContext descriptor preservation.

The callback supports immediate idle non-trigger custom `sendMessage` persistence and `deliverAs:nextTurn` admission. As upstream, nextTurn takes precedence over triggerTurn and queues without starting a provider. Other explicit deliverAs values reject before mutation in this bounded seam. `sendUserMessage` and triggerTurn without nextTurn reject because owner-level prompt scheduling is not configured. Full ReplacedSessionContext messaging/event compatibility is not claimed. Run `node --experimental-strip-types experiments/with-session-contract.mjs` for native-owner lifetime/order/failure assertions and a separate process that opens the native backend and checks persisted callback history. No live model is involved.

### User steer after normal final response

`experiments/user-steer-execution.mjs` exercises a blocked fixture stream through the real host and native store. User `deliverAs:steer` does not abort the stream or persist early. At a normal final-response boundary the driver admits one message via Rust `begin`, acknowledges after acceptance, and completes its model response before the next queued steer; steer precedes followUp. Error/aborted results retain the queue for later same-host execution. Consumed messages survive native subprocess reopen once. This is a bounded final-response implementation: tool-turn boundaries, custom steer, live model behavior, and pending-queue restart retention are not claimed.

## Prompt lifecycle (bounded native path)

Each public native drive builds the pinned upstream default system prompt with cwd and active tool names, then calls the original ExtensionRunner.emitBeforeAgentStart before Rust input admission. Chained systemPrompt overrides reach every model request in that drive; returned custom messages are normalized and admitted by Rust after the user and pending nextTurn messages. Tool continuations and queued steer/followUp within that drive retain the prompt without repeating the hook. The next public drive builds the base again. Host getSystemPrompt/getSystemPromptOptions reflect the prepared prompt.

Reproduce: `node --experimental-strip-types experiments/cli-before-agent-start.mjs`. It loads unchanged pinned pirate.ts through the formal CLI, checks a second handler's chained prompt/getter, custom message FIFO including null content normalization, performs an actual write/tool-result roundtrip, and resumes in a fresh process with a reset base. Provider output is deterministic, not a live model or proof of response quality. Resource discovery (AGENTS files, skills, SYSTEM.md), custom tool prompt snippets/guidelines, prompt-template/skill expansion, UI parity and full event ordering are not established by this change.

## Project instructions in formal CLI

The CLI loads project context with pinned upstream `loadProjectContextFiles` and `getAgentDir`: global instructions use `PI_CODING_AGENT_DIR` when set, otherwise `~/.pi/agent`; ancestor instructions precede workspace instructions. Upstream filename precedence, including `AGENTS.override.md`, and path deduplication are retained by reuse. Context is captured when a session host is created and supplied to the prompt builder before `before_agent_start`, including later model/tool rounds. A new process re-reads the files instead of persisting a stale system prompt. Standalone test hosts default to no context files.

Run `node --experimental-strip-types experiments/cli-project-instructions.mjs` for deterministic formal CLI verification of precedence, order, ancestor/global dedup, hook visibility, actual tool effect, and resume after instruction edits. The fixture uses disposable HOME/config directories and no credentials. This does not establish live-model instruction compliance, skills loading, SYSTEM.md/APPEND_SYSTEM.md support, reload, or complete resource discovery parity.

# Integrated native Rust runtime — startinge1e6ab9

Status: frozen sequential fixture milestone passed; full product compatibility is
unproven. Reference Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.

## What now owns execution

`PiRuntime` in Rust holds the awaiting-action state, correlation identifier and
ordered tool queue. begin emits a model action; model_result persists the assistant
and chooses tool actions or completion; tool_result persists content/details/error
then chooses the next tool or model. No JS loop decides whether tools remain or
whether a model needs another turn. NativeSession contains both this runtime and
the existing Rust PiSessionStore, under the per-environment registry.

`native-runtime-driver.mjs` dispatches emitted actions. It loads actual upstream
extensions/runner/wrappers, validates tool arguments with upstream code and consumes
a StreamFn-shaped fixture. It applies original context hooks and original session
entry-to-message conversion, then sends completions back to Rust. This is a real
integrated state machine/session/plugin path but a deterministic provider fixture,
not a live provider transport or independently completed coding task.

## Fixed acceptance executed

Four fresh child processes share the Rust-written Pi session:

1. Seed: Rust requests model, executes unchanged Todo add(alpha), synthetic long
   output and throwing tool, records all results, requests model again, completes.
2. Continue: restores native history/Todo state, lists and adds gamma, without
   rerunning long output or failing tool; persists a context-policy reset.
3. Reset: fresh process sees full tool text in model view; canonical history retains
   the original long text throughout. Prior context hook's `plugin:` edit survives.
4. Fork: select the earlier completed seed branch, append durable branch marker,
   reopen plugin lifecycle, list/add delta with ID2. Selected branch still has limit8
   despite the abandoned branch's later reset. Model views are truncated from the
   current hook view. File bytes remain an append-only prefix across all processes.

Original upstream and native driver additionally compare full normalized canonical
messages and every model request view in five independent cases: tool rejection,
missing tool content, aborted response, error response and token-length truncation.
Aborted/error responses do not execute their embedded calls. Truncated calls produce
error results without execution and continue; missing content becomes an empty array.
These are source-derived cases, not implementation-shaped assertions.

The independent reviewer found a real stale-action branch bug: while model pending,
resetLeaf changed the branch and correct old completion was accepted into a new root.
Fixed by rejecting branch/reset and external raw message mutation while pending.
Custom entries remain allowed for plugin state. Regression asserts rejection leaves
state unchanged and the valid completion still works. Rich steering/branch transitions
are still a future compatibility obligation, not silently redefined as unsupported.

## Scope and limitations

The experiment deliberately runs sequentially and does not establish upstream's
default parallel scheduler. Full provider streams/events, updates, active cancellation,
steering, batch terminate semantics and complete tool hooks are not implemented here.
Known pending persisted tool calls reject on begin rather than replay automatically;
this is not a complete crash-resolution workflow. Correlation tests cover stale IDs
and branch mutations in the shown flow, not every partial-write or duplicate-call-ID
case. Disk write errors can change memory according to upstream semantics, but
runtime recovery from those errors is unverified.

Projection currently accepts one text block per tool when enabled. Canonical session
metadata IDs are now allocated by the Rust runtime but use an experimental scheme;
clock/header inputs remain fixtures. Session migrations/full APIs/JSON alias and
scalar edges remain from the session work. Public CLI still has its earlier native
format path; this addon driver is not yet its production entry point. No full Pi
compatibility, quality, speed or model-cost claim.

## Reproduce

```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-runtime.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/integrated-control.mjs
```

Results: experiments/native-runtime-results.json, integrated-control-results.json.
Independent evidence and frozen requirement audit: docs/integrated-runtime-review.md.
Regression writer7, native lifecycle and cargo test --locked all passed. No new
dependencies or credentials/live model calls. Source/version caveats unchanged.

This closes the earlier objection that only TS orchestrates useful work while Rust
merely stores scalars. It does not close the product's full compatibility backlog.
Architecture assessment and product implementation must remain separate claims.

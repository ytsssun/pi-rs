# Pi reference and compatibility investigation

Owner: upstream worker. Investigation date: 2026-09-06. Status: **verified by source inspection**, not runtime conformance. Proposed tests below are not passing claims.

## Reference and license

Identified public repository `https://github.com/badlogic/pi-mono.git` was cloned to `vendor/pi-mono`. Fixed reference: **9767ba275f3e9a5ee0f5c5342249b629ab1b2282**, coding-agent package **0.85.1**, currently named `@earendil-works/pi-coding-agent`. The scope and repository organization have evolved; do not assume an older installed Pi has this API.

Reproduce: `git -C vendor/pi-mono rev-parse HEAD` and inspect `packages/coding-agent/package.json`. Reference sources: [package](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/package.json), [license](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/LICENSE).

License is MIT, copyright 2025 Mario Zechner. Copying substantial upstream code requires retaining copyright and permission notice. This does not audit every transitive dependency or permit assuming all ecosystem packages share MIT.

## Behaviors that constrain the first runtime

[Agent loop source](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/src/agent-loop.ts) and [upstream loop tests](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/agent/test/agent-loop.test.ts):

- Each request applies `transformContext`, then `convertToLlm`. The canonical agent messages and provider request projection are separate concerns. Context editing is already supported at this boundary; the Rust opportunity is independently controlled semantics, durable editing/audit and recovery, not inventing the existence of context hooks.
- Assistant tool calls are paired with `toolResult` messages containing call ID, name, content, error flag and timestamp. Unknown tools and validation failures become tool errors, enabling a later model turn.
- A `length` stop fails **all** calls in that assistant message without executing them. Apparently parseable arguments are insufficient because streaming salvage can hide truncation.
- `error` and `aborted` stop reasons end the run without executing tools. A tool batch only terminates through tool-result `terminate` when every result requests it.
- Default loop path permits parallel calls; one sequential tool forces the whole batch sequential. Parallel completion events may be out of order, but persisted results follow source call order. Rust sequential execution can be an explicitly narrower first profile.
- Steering is checked at turn boundaries, after the whole tool batch; follow-up is checked when the agent would stop. Neither is arbitrary mutation of in-flight model requests.

[SDK](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/sdk.ts) still defaults to `SessionManager.create`. [Session manager](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/session-manager.ts) uses version 3 append-only JSONL entries, with `id`/`parentId` ancestry. Selected leaf determines context; plain `custom` entries are omitted; latest compaction introduces summary plus kept entries and subsequent messages. A separate new harness/session repository exists; it is not evidence that the normal coding-agent SDK has abandoned v3. Full session compatibility includes branches, compaction, model/thinking changes, custom messages and old-format migration, not simply parsing JSONL.

## Compatibility matrix and fixed-input tests

Every row is **proposed** until an original-Pi execution and Rust execution are compared. Normalize only nondeterministic IDs/timestamps; compare provider outputs by structure and completed task, never text equality.

| Profile | Original contract / test | First-cycle scope |
|---|---|---|
| Agent message loop | Fixture assistant tool call → result → final text; preserve IDs and roles | Required |
| Tool failure | Unknown tool, invalid arguments, thrown tool error; next request sees `isError` | Required |
| Truncation safety | `length` assistant with valid-looking destructive tool arguments must cause zero effects | Required |
| Basic text read | Relative path; 1-indexed `offset`; `limit`; nonexistent path | Small representative subset |
| Output truncation | 2000 lines / 50 × 1024 UTF-8 bytes, first limit wins; boundary and multibyte input | Small pure-function comparison |
| Edit | Current `{path, edits:[{oldText,newText}]}`; disjoint replacements match original text; overlap/duplicate failures | Follow-on, do not claim old single-edit schema is current API |
| Session context | Root→leaf projection excludes siblings; custom entries omitted; latest compaction retains correct tail | Prototype importer/exporter after native durable session |
| Extension headless subset | Load unchanged TS extension registering tool and context hook; call tool and observe transformed request | Architecture spike |
| Packaging/skills/prompts | Discovery, frontmatter, precedence, resources | Inventory and samples only |
| Provider compatibility | Request/response/tool translation, errors, usage, cancellation for selected provider | One provider first; live run separately reported |
| TUI / RPC / all extensions | UI component identity, interactive callbacks, full event order and commands | Deferred; no compatibility claim |

Tool sources: [read](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/tools/read.ts), [truncate](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/tools/truncate.ts), [edit](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/tools/edit.ts). Head truncation never returns partial lines; a first line exceeding bytes produces empty content and a flag. Empty input and trailing newline counting are useful counterexamples.

## Extension risk and smallest useful experiment

[Loader](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/extensions/loader.ts) uses `jiti/static` to import a factory, with aliases/virtual modules for Pi packages. [Types](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/extensions/types.ts) expose TypeBox schemas, async callbacks, AbortSignal, partial result callbacks, mutable hook arguments, provider streams, and TUI Components. An extension is executable JS with Node and npm capabilities, not a portable JSON plugin manifest.

**Proposed reversible route:** retain a Node sidecar for the headless extension subset, own the agent loop/session projection in Rust, and bridge structured registrations, hook requests and results over framed JSON. Run one unchanged local TS extension with `registerTool` and `context`; assert Rust sees its schema, invokes tool, receives result and uses transformed messages. Include timeout and sidecar death as failures. This is a compatibility prototype, not a sandbox or complete Pi API emulation.

Important unknowns to falsify before broad implementation: package alias identity; serializing callback lifetime/cancellation; chained mutation order (upstream allows tool-call argument mutation after validation without revalidation); extension reentrancy into session APIs; non-JSON provider/UI values. A plain JSON bridge cannot promise transparent Components or arbitrary object identity. Full Node ecosystem support costs runtime distribution, startup and memory; measure it separately from Rust-only mode. Wasm-only extensions would change ecosystem scope and require user decision rather than quietly becoming the plan.

## Immediate handoff

Coordinator received source findings: fixed commit/license; current edit schema; existing context transform; truncated tool-call safety; legacy session and new harness coexistence. No upstream tests were executed by this worker and no live model calls were made. Next owner should run narrow upstream deterministic functions/tests against fixtures and store normalized artifacts. First deliver a native resumable vertical slice, then run this extension spike before committing to an extension ABI. Multiplayer does not depend on finishing every row.

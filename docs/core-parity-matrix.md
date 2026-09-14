# Pi core capability parity matrix

Reference: `Pi coding-agent 0.85.1 @ 9767ba275f3e9a5ee0f5c5342249b629ab1b2282`

Auditable capability requirements from Agent, AgentSession, ModelRegistry and extension host surfaces. Status is evidence-based; unknown remains unknown. Counts are unweighted and must not be presented as a compatibility percentage.

Status counts: **verified** 9, **partial** 20, **missing** 8, **unknown** 0 (unweighted; not a parity percentage).

| Capability | Upstream contract | pi-rs evidence | Status |
|---|---|---|---|
| agent.prompt loop | `Agent.prompt/continue` | prototype/architecture/native-runtime-driver.mjs; live acceptance | **verified** |
| agent.state | `state/isStreaming/isIdle/signal` | runtime fixtures | **partial** |
| agent.subscribe | `Agent.subscribe event listener` | no full native equivalent | **missing** |
| agent.abort | `abort/waitForIdle/settlement` | cancel-settlement-probe; cooperative-tool-cancel | **partial** |
| steering | `steer FIFO at boundary` | user-steer-execution | **partial** |
| follow-up | `followUp executes model/tool turn` | user-followup-execution | **verified** |
| tool read | `read contract/limits` | native fixtures | **verified** |
| tool write | `write contract/errors` | native fixtures | **verified** |
| tool edit | `multi-edit/overlap semantics` | edit differential fixtures | **partial** |
| tool bash | `executeBash/result/abort` | native batch fixtures | **partial** |
| tool parallel | `parallel batch ordering` | upstream-parallel-contract only | **missing** |
| tool updates | `partial tool updates` | native update barrier | **partial** |
| tool truncation | `length prevents tool effects` | upstream oracle; native batch | **verified** |
| session JSONL | `v3 append-only entries` | native store | **partial** |
| session context | `leaf projection/custom omission` | pi-session-context | **verified** |
| session recovery | `fresh-process reopen` | live/native recovery | **verified** |
| session fork | `navigate/fork/tree` | branch-cli only; no full API | **missing** |
| session switch/reload | `switchSession/reload` | unsupported host bindings | **missing** |
| session compaction | `compact/abortCompaction` | bounded compact only | **partial** |
| newSession | `owner and replacement` | with-session-contract | **partial** |
| withSession | `replacement callback context` | with-session-contract | **verified** |
| model selection | `set/cycle model and thinking` | host actions | **partial** |
| model registry | `providers/models/availability` | provider-composer | **partial** |
| provider stream | `OpenAI SSE translation` | live OpenAI/native stream | **partial** |
| provider auth | `OAuth/checkAuth/refresh` | no native OAuth | **missing** |
| provider breadth | `provider-specific APIs` | OpenAI only evidence | **missing** |
| context transform | `transformContext/convertToLlm` | context seam fixtures | **partial** |
| context editing | `canonical/projected history` | context seam | **partial** |
| extension loader | `unchanged TS loading` | extension recovery | **verified** |
| extension tools | `registerTool/activation` | parity inventory | **partial** |
| extension hooks | `beforeAgent/context/provider hooks` | context-audit | **partial** |
| extension events | `15-event ordering/identity` | deferred events only | **partial** |
| extension commands | `command context/dispatch` | command fixtures | **partial** |
| extension UI | `components/prompts/shortcuts/renderers` | unsupported bindings | **missing** |
| extension lifecycle | `dispose/reload/shutdown` | partial host | **partial** |
| resources | `discover/package resources` | inventory only | **missing** |
| crash safety | `producer/tool crash recovery` | native crash fixtures | **partial** |

## Reading the counts

These 36 rows are auditable requirements, not a claim that each requirement has equal product weight. Verified means the named fixture or live run passed; partial means a bounded subset is evidenced; missing means no compatible implementation or evidence. The highest leverage gaps are unchanged extension host semantics, session tree operations, provider/auth breadth, and full Agent event lifecycle.

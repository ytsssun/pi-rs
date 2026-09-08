# Independent integrated runtime review

Status: independently tested integrated fixture and five upstream differential cases;
four-process branch-local projection also independently passed. Full compatibility unproven.
Starting checkout: e1e6ab934f56481464c9e2cacb90e3ad159c7e4a.
Reference: vendor/pi-mono at 9767ba275f3e9a5ee0f5c5342249b629ab1b2282.
Reviewer owns this document only, independently of implementation. No credentials
or live model calls are needed for this deterministic architecture review.

## Acceptance derived before implementation

The architecture-decision.md frozen milestone requires a single Rust-owned
model/tool/session path, unchanged extension loading, persistent results, a new
process follow-up without completed tool replay, failure or cancellation, and
context projection respecting current hook view and branch-local policy. Separate
previous probes do not establish this integration.

The original packages/agent/src/agent-loop.ts establishes:

- Lines 215–241: model error/aborted stops before tools; ordinary tool calls lead
  to results then another model request. Length-truncated calls must not execute.
- Lines 409–422: fixture must request sequential execution explicitly; upstream
  defaults to parallel unless a selected tool requires sequential execution.
- Lines 431–483: sequential tool start precedes execution, end precedes result
  message start/end; results retain call order. Tool rejection becomes an error
  result and ordinarily permits the next model request.
- Lines 589–590: batch termination requires every result to terminate, not any.
- Lines 677–716: updates finish before successful tool completion; rejection
  conversion preserves Error.message or String(non-Error). These details are not
  established by merely asserting final result text.
- Lines 783–798: result content defaults to []; details/usage and nonempty
  addedToolNames survive into toolResult messages.
- Lines 294–310: context transform precedes provider conversion. The integrated
  adapter must not replace preceding plugin edits from a canonical snapshot.

## Counterexample checklist

1. Wrong or stale completion ID must reject without changing canonical session,
   pending action, or continuation. Retry correct completion after rejection.
2. After completed tool and final assistant persist, a fresh process starts from
   new user input rather than replaying historical tool calls. Observe executions
   as well as restored message presence.
3. Error result must be persisted with matching call ID and isError and supplied
   to next model request; successful second response must complete.
4. Context limit must alter provider view, never canonical tool results. Insert a
   prior plugin edit to distinguish current-view projection from reprojection.
5. Branch from a point before policy change, reopen, and reset: policy selection
   must follow active ancestry, not latest record anywhere in file.

## Limits

This is preparation, not a passing result. No live independent coding, full Pi
compatibility, arbitrary provider streaming, parallel scheduling, crash recovery,
full UI, session migration or performance claim follows from these fixtures.
Execution evidence and failures will be appended after the integrated artifact is
available; absence of evidence cannot be converted into a pass.

## Independently executed upstream reference

Executed actual imported runAgentLoop with sequential fixture stream, one `test`
tool call then a final text response. Four modes were asserted in one Node process
on this checkout; exit0. No native implementation was used for these observations:

| Input | Executed tools | Model requests | Canonical tool result |
| --- | ---: | ---: | --- |
| tool execute throws Error('fixture failure') | 1 | 2 | isError true, content text fixture failure, details {} |
| tool returns only details {ok:true} | 1 | 2 | isError false, content [], details preserved |
| assistant stopReason aborted includes tool call | 0 | 1 | none |
| assistant stopReason length includes tool call | 0 | 2 | isError true, token-limit rejection |

The normal/rejection/length event names were exactly:
agent_start, turn_start, message_start, message_end, message_start, message_end,
tool_execution_start, tool_execution_end, message_start, message_end, turn_end,
turn_start, message_start, message_end, turn_end, agent_end.
The aborted case omitted tool and second-turn events.

Review of initial uncommitted pi_runtime.rs found model_result ignored stopReason
and tool_result persisted missing content as null. Reported before integrated
execution. These are source findings, not yet reproduced native failures or fixes.
A related regression risk is reopening aborted history: unresolved-call detection
must not mistake calls intentionally unexecuted on aborted/error responses for an
incomplete side effect requiring replay.

Additional source counterexample: native Registry exposes branch while runtime
awaits completion. A correct requestId alone does not identify the active branch;
completing a model/tool after branch changes risks writing to unrelated ancestry.
Require branch rejection while pending or explicit invalidation/cancellation before
branch selection, and test the canonical file remains unchanged on rejected action.
Reported before native execution.

## Integrated execution and discovered failure

Reviewer independently ran `experiments/native-runtime.mjs` through the documented
TSX loader: exit0, three distinct child processes, canonical prefix retained,
unchanged Todo add/list/add state restored, long-output and throwing tools executed
only in seed. Context requests retained prior plugin prefix and projected text;
reset restored full tool text in later process. This verifies the fixture's actual
assertions, not arbitrary replay/crash handling. Its initial version did not test
branch selection; reported this missing frozen requirement to coordinator.

Before the pending-branch guard was implemented, the reviewer executed the native
API sequence below and observed the old model completion accepted on a new root:

```
createBackend -> runtime(begin, prompt='original branch') -> resetLeaf()
-> runtime(model_result, original requestId, assistant text='belongs to original')
```

Exit0 observation: completion.type was done, beforeBranch was [], afterBranch was
one assistant entry id rt-1 with parentId null. The original user was rt-0. This
was an actual cross-branch write defect, not a hypothetical concern or upstream
behavior. Coordinator fixed it by rejecting branch/reset and external message
append while an action is pending. Custom entry appends remain permitted for
plugin state. Rich branch steering during work is therefore still unsupported;
this rejection is a safety invariant, not Pi behavior parity.

Post-fix reviewer executed `experiments/integrated-control.mjs` with exit0. This
independently authored reusable script compares original runAgentLoop and native
Rust driver using actual upstream-loaded/wrapped tool definitions. Five cases
(rejection, absent content, aborted, error, length) have identical normalized
canonical messages and every provider request's message view. Only message
`timestamp` is removed; JSON serialization omits JS undefined fields as persisted
JSON would. No content, error, details, IDs or stop reasons are discarded.

Additional assertions: wrong completion ID leaves snapshot unchanged and correct
completion remains accepted; pending branch switch and raw message append reject
without snapshot changes; reopening aborted/error history allows a new model
request without executing abandoned tool calls. Results:
`experiments/integrated-control-results.json`.

Reproduce after `python3 scripts/build-native-session.py`:

```
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/integrated-control.mjs
```

The native driver emits actions rather than complete Pi agent event streams. The
five-case parity evidence covers canonical messages/provider views/tool execution
counts, not streaming events or cancellation ordering. Original fixture providers
never contact a model. Full compatibility and live-model coding remain unverified.

## Branch-local integrated follow-up

After coordinator added a fourth child `fork`, reviewer reran native-runtime.mjs:
exit0, stages seed/continue/reset/fork, four distinct processes, entire canonical
file prefix retained. Fork branches to seed-complete (all tool calls resolved),
then appends a durable branch marker before loading unchanged Todo. Restored Todo
contains alpha, and adding delta receives ID2 rather than inheriting gamma from
abandoned continuation. The abandoned branch's reset remains globally later in the
file, while fork provider views still use ancestry's limit8 and prior plugin
prefix. These assertions distinguish branch selection from a global-latest policy.
This closes the initial missing integrated branch-policy check.

## Frozen milestone audit and architecture judgment

1. Rust chooses next model/tool/done and persists canonical messages in PiSessionStore;
   JS driver dispatches action kinds and executes actual loaded/wrapped tools.
   Source and four-process trace prove the demonstrated sequential subset.
2. Original loader/runner/wrapper, unchanged Todo, and persisted details are exercised
   together. Independent five-case upstream comparison proves normalized canonical
   message/provider-view parity. Full Pi event stream parity is absent.
3. New process follows up without replaying completed tools; error tool persists and
   next model sees it. Tool-error criterion is met; no cancellation claim.
4. Actual runner context chain calls Rust projection, preserves current-view plugin
   prefix, retains canonical output, reopens/reset/forks with ancestry policy.
   TS control for context editing remains prior recorded evidence, not a TS fork
   product. Native integrated schema projection still only handles one text block.
5. Independent counterexample produced a real cross-branch write, fixed and retested;
   results and reproducible script versioned. No model credentials used.

The frozen integrated architecture experiment is met at its explicitly stated
sequential fixture scope. This strengthens the reversible Rust Node-API core plus
upstream JS host decision and addresses the prior hidden-TS-loop concern. It does
not establish that complete compatibility has been implemented. Decisive remaining
product gaps: full event/stream/cancellation and parallel/steering semantics,
complete plugin/session API including aliases/migration, provider integration and
real coding via this path, deployment/FFI safety/platform/lifecycle validation.
Do not infer compatibility from a five-case comparison or call this a daily-use
replacement. Final architecture objective completion remains coordinator's full
requirement audit, not the reviewer's limited passing fixture verdict.

## Overall architecture-objective audit (independent, before commit/push)

Audited the exact user objective, not merely task T029. It asks to **judge the
correct architecture**, with core-only Rust and unchanged/full ecosystem
compatibility as design objectives, verify the boundary against pinned upstream,
compare minimal context editing in TS and Rust, and version/push evidence. It does
not ask this architecture investigation to finish and release the entire rewrite.
Conversely, this distinction cannot excuse a design that intentionally drops plugin
categories or keeps a TS core while calling it Rust.

| Exact objective clause | Current evidence | Verdict |
| --- | --- | --- |
| 判断 pi-rs 的正确架构 | architecture-decision.md plus native-seam-evaluation.md compare TS control, helper IPC and Node-API; synchronous reentry/identity and integrated Rust continuation substantiate the ownership decision | Enough evidence for a reversible engineering architecture judgment, not proof of a unique optimal design |
| 仅重写核心 runtime | Rust PiRuntime emits next model/tool/done, PiSessionStore owns persistence; actual upstream JS loader/runner/wrapper/UI machinery retained | Demonstrated architecture direction satisfies core-only separation for tested operations; existing product is still a subset |
| 现有 Pi 插件零修改且完整兼容为目标 | Unchanged Kimi/Todo source and real UI objects run; plugin-seams.md retains all ecosystem categories, architecture-decision.md explicitly forbids silently excluding unsupported ones | Compatibility remains an undiminished requirement; no complete compatibility claim is justified |
| 对照固定上游，验证 TS 插件宿主与 Rust 核心的边界 | Fixed commit 9767ba2; independent native reentry/identity, async tool review, session/store/UI evidence and this integrated five-case original-loop comparison | Critical proposed boundary mechanisms have executable positive and negative evidence; remaining breadth is explicitly untested |
| 最小 context-editing 实验比较 TS fork 与 Rust 内核方案 | context-seam plus actual-runner TS/Rust control in real-plugin-architecture; Pi session context review; integrated current-view/persistence/reset/fork experiment | Minimal TS fork/control route and Rust route compared for projection semantics; not a maintained complete TS fork or measured maintenance/performance comparison |
| 自主调查、实施和独立验证 | This review independently derived cases, ran original upstream, found native cross-branch write and retested fix; preceding independent reviews record other failures | Satisfied for architecture evidence, with exact scope limits |
| 将证据、失败、取舍与恢复步骤版本化并提交推送 | Existing historical evidence committed; new integrated files currently untracked/modified on main at e1e6ab9 | Not yet satisfied for this final cycle. Commit, push, remote verification and checkpoint update remain required before goal completion |
| 不重复无进展实验或未经测量宣称收益 | New composition/persistence and counterexample evidence changes what is known; reports make no speed/quality/resource improvement claim | Satisfied by reviewed cycle |
| 只有改变 Rust/兼容目标或真实访问阻塞才找用户 | No target change, compatibility waiver or credential request needed; local reversible integration proceeded | No user decision required |

Conclusion: there is enough evidence to finish the **architecture assessment**
after the remaining documentation/version/push work. No currently demonstrated
fact forces a different architecture, abandoning Rust, or lowering full ecosystem
compatibility. More interface probes would improve implementation coverage but are
not necessary to decide whether TS plugins inherently force TS core ownership:
the integrated Rust scheduler and unchanged plugin/session path now directly
contradict that premise. This is stronger than merely failing to find a blocker.

Important residual risks are real, not declared solved: object aliases returned by
session getters, native asynchronous cancellation/steering, custom-provider streams,
full event semantics, migration, UI lifecycle and safe distribution. They require
future implementation/conformance work and can trigger revisiting the reversible
decision. This assessment does not promise every risk has a proven implementation
or that all plugins work today. There is no decisive *currently evidenced*
architecture contradiction requiring another research cycle before choosing the
primary path; proving every product contract would be the full rewrite itself.

Before marking the assessment complete, coordinator must update current checkpoint
and architecture-decision ownership rows that still say integrated scheduling is
missing, mark initial in-progress evaluation sections as historical/superseded,
retain compatibility obligations, and verify the final commit is on the authorized
remote. This reviewer has not observed those operations yet and does not certify
an already completed/pushed overall goal.

### Coordinator closeout evidence after independent review

The preceding reviewer statements about untracked files/missing checkpoint were
accurate at review time and are historical. Coordinator committed integrated work
as b83e9a4353c15d4ccee24b526161be5f012327d8, pushed main and verified the identical
remote refs/heads/main hash with a clean worktree. Checkpoint now separates completed
architecture assessment from incomplete product conformance. Architecture-decision
ownership rows and frozen milestone heading were updated to reflect actual integrated
evidence; original acceptance remains unchanged. This paragraph records coordinator
operations, not an additional claim that the independent reviewer observed them.

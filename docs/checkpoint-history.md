# Historical checkpoints through ef2b8e6

Historical statements below describe their respective stages; the current checkpoint supersedes their next-step lists and intermediate test counts.

# Checkpoint M3 — targeted edit integration

Current work branch: `main`. User explicitly authorized merging the single work thread to main on 2026-09-07; main was fast-forwarded from `00766dc` to `d0407ee` and pushed to origin. This supersedes the earlier no-main-merge instruction. Continue suitable verified project commits/pushes on main while this single-thread arrangement applies. Never force-push. See git log for implementation and verification commits. M1 checkpoint retained in checkpoint-m1.md as historical evidence; its read-only limitations and priority order are superseded here.

## Start here

```sh
cd /Users/stevensun/repos/pi-rs
export PATH="$HOME/.cargo/bin:$PATH"
git status --short
python3 scripts/board.py list
cargo build --locked
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
python3 scripts/demo-coding.py
python3 experiments/round2-coding.py
```

Full verification including previous profiles is in README.md. Clean M1 reproduction and counterexamples are in experiments/round2-baseline.md. Independent clean-checkout M2 execution at implementation commit `89b4796537f159abd76758535d8678d3d888cd17` passed build, all 17 Rust tests, strict clippy, demo and both HTTP suites. Exact compatibility rerun results and commands are recorded in experiments/round2-verification.md. Subsequent handoff commits only change records, not executable source. Frozen acceptance is docs/milestone2.md; **real model criterion is still unverified**, not waived.

## What works in local tests

Actual write/bash plus existing read; small repository's test fails, source changes, test passes; separate process appends another user turn using `--resume --input`. Canonical history and context projection survive resume. Mutation opt-in applies per invocation. In-flight intent saves before effect; uncertain result refuses replay and requires inspected outcome via `--resolve-in-flight`. Unix flock releases on process death, lock file stays. Do not remove active/permanent lock inodes. `.tmp` may require manual crash inspection. Keep runtime state outside the repository being modified.

17 Rust tests; 28 M2 independent local HTTP/fixture checks, 13 M1 HTTP regression checks, 36 original truncation comparisons, 7 Node extension cases and 4 original write execution comparisons. Counts express narrow test scopes, not complete Pi compatibility. The new write comparison runs actual original filesystem code with documented schema/rendering/import shims. Bash result/timeout behavior is intentionally narrower than Pi. No live inference or speed claim.

## Next valuable tasks

1. Real-model validation T008: no common API credentials found in current environment. User asked which provider/config location to use (never ask for secrets in chat); answer pending. Use a disposable repo and exact M2 scenario, inspect files/tests, record provider/model/version/usage, not exact answer text. Preserve honest live-unverified state until execution succeeds.
2. Bounded Pi `edit` current `edits[]` profile is now implemented; see M3 notes below. Next improve read offset/limit and integrate already verified truncation implementation, or extend fuzzy edit compatibility against frozen originals.
3. T007 exact agent-loop semantics: length refusal is safe but differs from Pi correlated tool-error continuation; native error text is not Pi `isError` structure; sequential tools only.
4. T005 extension integration remains pending, tested Node sidecar is not wired to Rust. Preserve ecosystem ambition; no claim of extension compatibility from one prototype. T006 Pi session import/branch/compaction still pending despite native followup now working.
5. Runtime robustness: provider/fixture identity binding; explicit context-policy reset and audit log; broader crash injection around fsync/rename; tests for malicious filesystem races only if deciding to promise a sandbox. Bash can leave descendants after abrupt runtime death and cannot contain escaped process groups; inspect before resolving uncertain effects.

## Coordination and continuation

Max four simultaneous agents total. Evidence-based retrospective: docs/retrospective-m2.md. M2 files had disjoint ownership; coordinator integrates. Worker quota outage interrupted initial M2 turns; the tools partial files were preserved and existing workers resumed after external-state change. Heartbeat messages on 2026-09-07 confirm scheduler dispatch, not autonomous progress during outage. No usage reset consumed and no model tokens/cost invented; counters unavailable.

Heartbeat `pi-rs-first-48-hour-cycle` remains bounded to 2026-09-08 22:53 UTC; max two routine milestone reports per local day. Continue current work branch. Local machine/app must run. At final scheduled run before cutoff, leave final handoff/pause rather than extending automatically. No public visibility changes/releases/internal access or unrelated external messages. User authorization permits pushes to this repository; review tracked changes for secrets and unrelated material before pushing.

## M3 targeted edit (2026-09-07)

Added `edit` with current edits-array schema; all replacements locate original content. Runtime gates edit with --allow-mutations and the existing in-flight journal. BOM/newlines retained per compared profile; fuzzy ambiguity count follows Pi but fuzzy-only replacement/coercion/rendered diff remains excluded. Source is limited to 64 KiB; atomic write result to 1 MiB. Dependency unicode-normalization 0.1.25 metadata verified MIT OR Apache-2.0; existing dependency versions preserved. Adapted upstream license retained in root NOTICE.

Reproduce: `cargo build --locked`, `python3 scripts/demo-coding.py --edit`, and `node --experimental-vm-modules experiments/edit-differential.mjs`. The differential's optional adversarial command and frozen cases are in experiments/edit-differential.md. Do not infer complete Pi tool compatibility from this exact replacement subset.

Independent verifier found whitespace-only ambiguity mismatch after the first 16 cases passed: Pi uses fuzzy count even when it erases oldText, whereas initial Rust also checked raw count. Fixed by removing that extra check, retaining first exact match; preserved original expectations and failure evidence. Independent clean checkout `29727771e457e6cbbb8cebef18c02907ac9255b5` passed 25 tests, strict clippy, targeted-edit demo, 28 M2 checks, 16+4 edit differentials and three explicitly excluded behavior checks; generated reports match tracked bytes and checkout is clean. Exact commands in experiments/edit-differential.md. Current total is 25 Rust tests including 6 edit and 2 runtime integration tests; real model criterion still unverified.

M3 evidence-only followup commit contains final board/report updates. Next independent task is read offset/limit/truncation integration; preserve real-model unverified state pending provider access. Two routine milestones reported on local 2026-09-07 (M2, M3); further same-day scheduled runs should save progress without another routine report unless failure or user decision requires it.

## M4 read pagination

Model-facing read now supports positive offset/limit, source cap 8 MiB and shared Pi truncation library. Raw edit loader unchanged. Coordinator resumed partial worker artifacts after quota errors, fixed JS-vs-Rust tie rounding for first-line size notices and verified 19 original text-read cases, 9 separate-process read-resume checks, 28 M2 checks, and shared truncation parity. See experiments/read-verification.md for scope and latest clean-checkout evidence. Next: actual provider remains blocked on access; improve supported Pi profile rather than assume full compatibility.

M4 candidate bf37af7 fresh checkout passed all32 Rust tests/clippy/9 read-resume/28 M2 checks. Original Node read harness crashed exit139 in clean checkout despite prior working-checkout19-case success; unresolved T014, see read-verification.md. Do not claim clean read parity. Next bounded task isolate VM/TS harness crash.

T014 followup: preload builtin namespaces before recursive Node VM linking. Previously failing checkout now runs full19-case original comparison plus3 exclusions. Original loader later also passed, so root cause remains uncertain/intermittent; mitigation tested, not claimed permanent fix. Fresh-path smoke script experiments/read-loader-regression.py uses local shared upstream clone and verifies exact results; not deterministic red coverage. See read-verification.md.

Context policy reset: --context-tool-chars none clears persisted numeric truncation without modifying canonical history; omitted option preserves state. Separate-process HTTP assertions in experiments/context-reset.py cover before/after views, persistence, bad input and uncertain-effect refusal. No audit log yet.

Fixture preflight fix: malformed/missing fixture now fails before creating/appending/resolving session state; experiments/fixture-preflight.py demonstrates old failure and new byte-preserving behavior. Valid fixture exhaustion still checkpoints runtime state. Next substantive gap remains provider identity/fixture binding or live access; do not confuse this local fix with provider verification.

Context audit: native context_policy_changes records previous/new limit at canonical message count. Legacy missing field loads empty (no invented past), idempotent policy update adds no entry, audit chain checked on load. Current 34 Rust tests; experiments/context-audit.md includes HTTP verification and limitations. Audit stays out of model messages; matching current runtime required to read new snapshot fields.


## Superseded checkpoint from db29a58

The following retained text included stale no-live/no-usage statements, incorrect pilot path and a pending reviewer mistaken for progress. Current checkpoint corrects those claims.

# Current checkpoint — M5 live reliability validation in progress

## Current verified state

M5 milestone: repeatable real-model modify/test/resume reliability, with no TUI, multiplayer, provider expansion or extension work. Acceptance is frozen at 9/9 independent Luna baseline runs before any context trial.

Work on `main`, authorized for suitable verified commits/pushes; never force-push.
Live cycle starting commit: `ef2b8e6a11bb54f5600e30880f19c05d5ce229ad`.
The Rust CLI supports read/write/edit/bash, native session resume, context-view
truncation/reset and policy audit. Prior recorded suites include 34 Rust tests
and bounded pinned-Pi comparisons. These are fixture/local-HTTP or deterministic
comparisons, not proof of live model coding. This cycle rebuilt successfully;
new independent acceptance self-check passed, with no live requests.

## Limits and current blocker

Live historical attempts remain recorded in `experiments/live-openai-results.json`; current M5 retry is separate. Human-steered attempts remain **0**.
OpenAI API key is available only through ignored `.env`; it is never committed or printed. Codex desktop login is separate and unchanged. Luna provider configuration requires `--reasoning-effort none` for Chat Completions tools.
Daily-use readiness remains unverified. Bash has host authority, not a sandbox.
No full Pi compatibility, integrated extensions, Pi session format, TUI,
multiplayer or performance advantage is claimed. Prior Node oracle crash has a
tested mitigation, not a proven root-cause fix.

## Next steps and exact recovery

1. M5 retry uses `experiments/live-luna-none-pilot-02` then a new baseline output; old 8/9 and all failures remain immutable. Read `experiments/live-model.md` and `experiments/live-acceptance.md` for frozen
   acceptance and commands. Do not replace live criteria with fixtures.
2. Obtain the requested access configuration without printing secrets. Build with
   `export PATH="$HOME/.cargo/bin:$PATH"; cargo build --locked`.
3. Run a live pilot; independent agent verifies external results AND actual test
   execution from tool traces before marking the gate reviewed.
4. Run all three scenarios from clean inputs three times with identical model,
   endpoint and binary, context off. Preserve each failed run, classify evidence,
   and re-pilot changed binaries. Only after baseline passes run long-output
   context/resume trial. No TUI/provider expansion/multiplayer/extensions this cycle.
5. Keep raw artifacts in ignored `.runs`; commit only reviewed sanitized results.
   Commit/push current main under existing authorization after verification.

Board: `python3 scripts/board.py list --id T018` (live blocked), `--id T019`
(independent acceptance). Current cycle uses coordinator plus one verifier; cap4.
Token/cost counters for native agents are unavailable. No live provider usage yet.
No promise of background continuity: resume from these files when app is running.
Prior 48-hour scheduler deadline is 2026-09-08 22:53 UTC; do not extend it implicitly.

## Historical evidence

[Historical checkpoints](checkpoint-history.md) preserve prior milestones,
failures and superseded next steps. [Live-cycle record](../experiments/live-model.md)
is authoritative for this cycle; append-only `board.jsonl` retains task history.


## Superseded live-reliability checkpoint at0a934a0

The new user goal is architecture evaluation for core-only Rust replacement/full ecosystem compatibility. Completion verification is deferred.

# Current checkpoint — live retry completed; reliability gate failed

## Verified state

Main branch; this milestone started at db29a58f956447ce34e87ef05e3b3438237f27d4.
Luna reasoning none is usable for bounded real coding. Pilot02 independently
passed. Baseline02 executed all9: **7 independent successes / 2 failures**. Final independent review is in
experiments/live-retry-review.md and live-retry-verdicts.json. Original baseline01
was8/9, not overwritten. Retry outcomes are kept separate, never best-of-selected.
All model requests used existing ignored .env access; no candidate was steered.

## Current decision and next milestone

M5 closes the bounded experiment; the9/9 reliability criterion is NOT achieved.
Context live trial stays unrun. Do not run baseline03 merely to seek green results.
Follow docs/milestone6-proposed.md: opt-in user-specified completion verification,
durable outcome through resume, bounded repair on failed checks. This is a new
runtime intervention, not proof that the model independently chose meaningful
tests. Keep the frozen M5 criteria and its failures intact.

First next action: read src/lib.rs session/effect journal and capture a failing
completion-check counterexample, then freeze the opt-in state transition design.
No TUI, provider expansion, multiplayer or extension integration in this work.
Claude API-key route is authorized but no Claude credential/provider established.

## Reproduction and evidence

- `python3 experiments/live_acceptance.py self-check` checks the external verifier,
  not live inference. Rust34tests and strict clippy previously passed on current
  executable source; no runtime source changed during this closeout.
- `python3 experiments/summarize_live.py .runs/live-luna-none-pilot-02 .runs/live-luna-none-baseline-02 --output .runs/retry-accounting.json`
  reproduces accounting from retained actual response records. Tracked sanitized
  export: experiments/live-retry-results.json. Missing usage remains unknown.
- Actual fixed live command used:
  `python3 experiments/run_live.py --phase baseline --output .runs/live-luna-none-baseline-02 --gate .runs/live-luna-none-pilot-02/summary.json --env-file .env --model gpt-5.6-luna --reasoning-effort none`
  Output exists and is deliberately non-overwritable; do not run it again unchanged.
- Current task T020 and handoff records are in docs/board.jsonl; scope and stop
  rules in docs/milestone5.md. Prior outcomes in live-luna/nano review/verdict files.

## Limits, continuation and collaboration

Supervised disposable-repository trials are possible; unattended daily replacement
is not established. Model/provider/effort are not bound into native sessions;
repeat options on resume. Bash has host authority, not sandbox protection. No full
Pi compatibility, live context quality benefit or speed advantage claimed.

Earlier coordinator repeatedly messaged a pending_init worker and ended turns;
review never happened. This turn replaced it with one running independent verifier
who completed pilot and matrix review. Coordinator ran/integrated and maintained
records. Two active roles, cap4. No new orchestration platform. User had to resume
work because coordination stalled; this is a process failure, not an API blocker.
Native agent cost counters unavailable; actual provider usage retained separately.

History with stale no-live claims is preserved explicitly in checkpoint-history.md.
Prior automation deadline remains2026-09-08 22:53 UTC; no implicit extension or
uninterrupted uptime promise. New sessions can resume from this checkpoint.

## Before callback reentry experiment (f4bcc19)

# Current checkpoint — core-only Rust architecture evaluation

## Active goal and preserved constraints

User requests a Rust rewrite of only Pi core runtime with unchanged ecosystem
plugins and full compatibility. Assess whether TS host + Rust core can preserve
all semantics; compare TS fork control and Rust context-editing implementations.
Do not reduce compatibility scope, silently abandon Rust, or pursue the deferred
completion-check feature. User decision required only for core-goal/compatibility
changes, major licensing/distribution tradeoffs or real access blocks.

Starting commit0a934a0c792f47337a37a41abc45be608cc4935d; main authorized for pushes.
Pinned upstream9767ba275f3e9a5ee0f5c5342249b629ab1b2282, MIT. No credential access
needed this turn. Read docs/architecture-evaluation.md and docs/plugin-seams.md.

## Tested evidence, not full compatibility

Original probes still valid: TS transform/Rust projection4cases and JSON-copy
EventBus identity counterexample. New combined probe now loads unchanged Kimi
plugin through actual upstream loader/runner with real TypeBox. Both TS state and
Rust synchronous state pass activation, repeated/no-match search, tool execution
and stale API rejection. Actual upstream TS runAgentLoop confirms next3request
snapshots reflect activated tools. This is NOT a Rust-owned loop yet.

Actual context hooks compare TS control/Rust Session projection with valid
experiment state, preceding plugin edits, canonical isolation, audit, separate
Node process restore and reset. No Pi SessionManager, malformed-state parity,
multi-block message compatibility or live model quality claim.

Independent reviewer found/reproduced initial canonical-reprojection overwriting
preceding plugin edits. Corrected interface accepts current event view rather than
re-reading canonical messages. Negative option reproduces old failure (first TS
case); positive probes TS and Rust. See context-chain-counterexample.json.

## Precise next work

1. Prototype a LIVE Rust-owned loop/state operation calling JS and receiving a
   synchronous nested core read/write. Current spawnSync one-process-per-operation
   probe blocks Node and never invokes JS callbacks from Rust, so it cannot choose
   production transport. Compare callback RPC handling with in-process native
   binding; preserve sync return types and avoid two competing authoritative states.
2. Exercise AbortSignal/update callback propagation and failure/death cleanup with
   actual upstream tool wrappers. The present execute wrapper drops these arguments
   and makes no cancellation/partial-update claims.
3. Test UI live Component/Theme factory identity and lifetimes staying in JS;
   identify the minimal core notifications needed. Continue full inventory rather
   than assuming unused host bindings are implemented.
4. Extend context persistence comparison to real Pi SessionManager and plugin
   session restore before final architecture judgment. Current valid private
   experiment schema is explicitly not Pi session-format compatibility.
5. Independently audit evidence and alternatives, recommend IPC/native only when
   demonstrated; request decision if Rust/full-compatibility goals must change.

Reproduce combined result (no credentials):
`export PATH="$HOME/.cargo/bin:$PATH"`
`cargo build --locked --example compat_kernel`
`TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/real-plugin-architecture.mjs`
Append `--canonical-counterexample` for expected exit1 from disproven adapter.
Setup if dependencies absent: docs/real-plugin-host.md. npm ci --ignore-scripts
plus upstream hydrate:model-data were needed; no tracked upstream changes. Runtime
Node22.18 is below upstream22.19 requirement; no general support claim. Hydrated
public catalogs are not git-pinned but not exercised by these probes.

Results: experiments/real-plugin-architecture-results.json; source hashes included.
Actual loop remains original TS; registry/policy/projection can be Rust-owned.
Unexercised session/UI/model actions throw. Reproduce earlier probes per
architecture-evaluation.md. Do not claim full core rewrite or all-plugin parity.

## Continuation and previous evidence

Board T022 active architecture assessment; T021 superseded/deferred. Coordinator
owns experiments/integration; one worker owned real-plugin-host.mjs and its documentation, then independently
verified coordinator Rust/backend/combined probes, now done.2 concurrent agents used, cap4. Native usage unavailable;
zero project live model calls this turn. No background-uptime promise.

Previous live experiments remain valid: Luna matrices8/9 then7/9, with correct
code but omitted tests; all resume transport/history checks passed. Raw .runs and
.env remain ignored/private. Previous9/9 gate applies to that specific live
reliability trial, not architecture source/projection experiments. Full Pi
compatibility, performance advantage and final Rust/JS design are unproven.
History is retained in docs/checkpoint-history.md.

## Before async callback boundary cycle (dc3393c)

# Current checkpoint — core-only Rust architecture evaluation

## Latest verified state and immediate next step

At f4bcc19 plus this cycle, live persistent Rust dispatch/state successfully calls
unchanged Pi Kimi tools through actual loader/runner/wrapRegisteredTool; nested
synchronous get/set reenters the same process and activation is visible to Rust.
Unknown and previous-invocation completion rejection, injected failure cleanup
and post-death RPC error pass. Reviewer caught reused callback IDs accepting old
results; per-process generation IDs now fix the reproduced case. Cross-process
identity/recovery remains untested.
Reproduce: `cargo build --locked --example callback_kernel`, then
`TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/callback-reentry.mjs`.
Evidence: experiments/callback-reentry-results.json and docs/callback-contract-review.md.
This is scripted dispatch with a helper per sync RPC, not the model-driven Rust
loop or selected production transport. No cancellation/update/native/UI/Pi-session
proof yet. Next test async update/cancel ordering, then native-binding comparison.
Older direct execution probes missed upstream addedToolNames wrapper metadata;
new probe asserts it. Historical observations below retain their original scope.

## Active goal and preserved constraints

User requests a Rust rewrite of only Pi core runtime with unchanged ecosystem
plugins and full compatibility. Assess whether TS host + Rust core can preserve
all semantics; compare TS fork control and Rust context-editing implementations.
Do not reduce compatibility scope, silently abandon Rust, or pursue the deferred
completion-check feature. User decision required only for core-goal/compatibility
changes, major licensing/distribution tradeoffs or real access blocks.

Starting commit0a934a0c792f47337a37a41abc45be608cc4935d; main authorized for pushes.
Pinned upstream9767ba275f3e9a5ee0f5c5342249b629ab1b2282, MIT. No credential access
needed this turn. Read docs/architecture-evaluation.md and docs/plugin-seams.md.

## Tested evidence, not full compatibility

Original probes still valid: TS transform/Rust projection4cases and JSON-copy
EventBus identity counterexample. New combined probe now loads unchanged Kimi
plugin through actual upstream loader/runner with real TypeBox. Both TS state and
Rust synchronous state pass activation, repeated/no-match search, tool execution
and stale API rejection. Actual upstream TS runAgentLoop confirms next3request
snapshots reflect activated tools. This is NOT a Rust-owned loop yet.

Actual context hooks compare TS control/Rust Session projection with valid
experiment state, preceding plugin edits, canonical isolation, audit, separate
Node process restore and reset. No Pi SessionManager, malformed-state parity,
multi-block message compatibility or live model quality claim.

Independent reviewer found/reproduced initial canonical-reprojection overwriting
preceding plugin edits. Corrected interface accepts current event view rather than
re-reading canonical messages. Negative option reproduces old failure (first TS
case); positive probes TS and Rust. See context-chain-counterexample.json.

## Precise next work

1. Live scripted Rust dispatcher reentry now passes; extend to model-driven
   ownership and compare native binding. The older state-only spawnSync probe did not invoke callbacks. The new
   persistent dispatcher does, but its helper-based transport is still experimental. Compare callback RPC handling with in-process native
   binding; preserve sync return types and avoid two competing authoritative states.
2. Exercise AbortSignal/update callback propagation and failure/death cleanup with
   actual upstream tool wrappers. The present execute wrapper drops these arguments
   and makes no cancellation/partial-update claims.
3. Test UI live Component/Theme factory identity and lifetimes staying in JS;
   identify the minimal core notifications needed. Continue full inventory rather
   than assuming unused host bindings are implemented.
4. Extend context persistence comparison to real Pi SessionManager and plugin
   session restore before final architecture judgment. Current valid private
   experiment schema is explicitly not Pi session-format compatibility.
5. Independently audit evidence and alternatives, recommend IPC/native only when
   demonstrated; request decision if Rust/full-compatibility goals must change.

Reproduce combined result (no credentials):
`export PATH="$HOME/.cargo/bin:$PATH"`
`cargo build --locked --example compat_kernel`
`TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/real-plugin-architecture.mjs`
Append `--canonical-counterexample` for expected exit1 from disproven adapter.
Setup if dependencies absent: docs/real-plugin-host.md. npm ci --ignore-scripts
plus upstream hydrate:model-data were needed; no tracked upstream changes. Runtime
Node22.18 is below upstream22.19 requirement; no general support claim. Hydrated
public catalogs are not git-pinned but not exercised by these probes.

Results: experiments/real-plugin-architecture-results.json; source hashes included.
Actual loop remains original TS; registry/policy/projection can be Rust-owned.
Unexercised session/UI/model actions throw. Reproduce earlier probes per
architecture-evaluation.md. Do not claim full core rewrite or all-plugin parity.

## Continuation and previous evidence

Board T022 active architecture assessment; T021 superseded/deferred. Coordinator
owns experiments/integration; one worker owned real-plugin-host.mjs and its documentation, then independently
verified coordinator Rust/backend/combined probes, now done.2 concurrent agents used, cap4. Native usage unavailable;
zero project live model calls this turn. No background-uptime promise.

Previous live experiments remain valid: Luna matrices8/9 then7/9, with correct
code but omitted tests; all resume transport/history checks passed. Raw .runs and
.env remain ignored/private. Previous9/9 gate applies to that specific live
reliability trial, not architecture source/projection experiments. Full Pi
compatibility, performance advantage and final Rust/JS design are unproven.
History is retained in docs/checkpoint-history.md.

## Before native seam comparison (68f5369)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit dc3393cad72e1dbfed4fce65bfa2594978a695a2, main authorized.
Pinned upstream 9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT).
Five deterministic prepared-tool cases compare equal between original upstream
execution and Rust-owned update acceptance/completion ledger: success, thrown
string, cooperative JS abort, undefined sink rejection, rejection with pending
peer. Actual loader/runner/registered-tool wrapper exercised. Independent reviewer
found two initial sink-error failures; fixes and pre-fix evidence retained.
Earlier live Rust dispatcher synchronous plugin reentry and context projection
comparisons remain valid within their recorded scopes.

Reproduce (no credentials):
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example async_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/async-tool-parity.mjs
```
Append `--fire-and-forget-counterexample` for expected exit1. Dependency setup and
Node version caveat: docs/real-plugin-host.md. Source hashes/cases/protocol trace:
experiments/async-tool-parity-results.json. Independent evidence:
docs/async-tool-contract-review.md. Design: docs/async-boundary-evaluation.md.

## Limits and next work

These are isolated architecture probes, not an integrated Rust model-driven loop.
JS retains original AbortSignal; Rust-originated cancellation, arbitrary reason
and result identity, multiple-sink rejection selection order, cancellation during
blocking RPC, synchronous sink throw,
process death during drain and reconnect/recovery are unverified. No transport
performance measurement, native binding comparison, live UI factory proof or real
Pi SessionManager/context-policy persistence yet. Full compatibility unproven.

Next decisive work: compare native binding against helper-based IPC for synchronous
callbacks and opaque JS values; test Rust-originated cancellation and live UI
objects staying in JS. Carry these requirements into a concrete ownership decision,
then verify real Pi session persistence with context editing before final judgment.
Do not spend another cycle repeating already-passing registry/projection cases.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 ongoing overall architecture assessment; T024 tested async boundary subset.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
scenario fixture was consumed by coordinator unchanged. Both discovered failures
were fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

## Before actual Pi session experiment (c90c0e4)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit68f5369705a03cf5cea31e3906a15331c52d36df, main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT) unchanged.
Native Rust Node-API probe runs unchanged Kimi plugin with actual loader/runner/tool
wrapper and matches TS control. Nested callbacks reenter Rust state; same-object,
Promise, exception and real Text/Theme identity pass. Native method invokes JS
AbortController preserving reason identity and listener reentry. UTF16 scalar
state fixes independently found lone-surrogate loss. No new dependencies.
Earlier IPC reentry, five async cases and TS/Rust context comparisons remain valid
within their scopes; full compatibility and final architecture are not proven.

Reproduce:
```
scripts/build-native-seam.sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-seam.mjs
```
Evidence: experiments/native-seam-results.json, docs/native-seam-review.md.
Setup/caveats: docs/real-plugin-host.md. Executed platform Darwin arm64 Node22.18.0;
upstream requires22.19+, Linux build option untested. No credential/model use.

## Decision candidate, limits and next work

Proposed primary integration candidate: Node-API plus unchanged upstream JS host.
Comparison and rationale: docs/native-seam-evaluation.md. TS is natural for plugins;
current evidence does not require whole runtime in TS. TS fork already demonstrates
context editing, so that capability alone does not establish a need or speed gain
for Rust. Rust runtime ownership remains the user's explicit goal.

Next: test real Pi SessionManager context policy persistence/reload and plugin
restore lifecycle, plus actual UI factory host invocation. Use those results and
full interface inventory to refine the architecture decision. Do not repeat passed
scalar reentry tests. Native prototype has callback-local handles only, no retained
references/background thread; its abort is test-triggered, not autonomous scheduler.
No UI mounting/disposal, full agent loop, session ownership or distribution proof.
Raw unsafe FFI is not production bindings; multi-rejection IPC ordering still open.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 ongoing architecture assessment; T025 tested native seam subset, D008 proposed
Node-API primary candidate. Full compatibility goal unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
review findings corrected UTF16 state and FFI declaration before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

## Before Rust Pi index (63c7e79)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commitc90c0e4d5c38839ce5d8dcf34330861e308d14a9, main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 (MIT) unchanged.
Real Pi SessionManager + unchanged Todo plugin now passes current-branch restore
in a separate process, continuation with correct IDs, policy projection/reset and
canonical file prefix retention. TS and Rust projections compare equal. Reading
policy from whole history fails the explicit negative case. Existing host default
regression byte-compares equal after optional manager/plugin-path injection.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example context_projection
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-session-context.mjs
```
Append `--all-entries-counterexample` for expected exit1. Results:
experiments/pi-session-context-results.json. Review: docs/pi-session-review.md.
Details: docs/pi-session-context-evaluation.md. Dependency/version caveats remain
in docs/real-plugin-host.md. No model calls or credential use.

## Limits and immediate next milestone

TS SessionManager still owns canonical state in this experiment; pi-rs CLI native
sessions are not Pi session compatibility. Manual fixture tool/lifecycle driving,
one-text-block projection only. No compaction/corruption/concurrency/crash/UI/full
AgentSession proof. Previous native/IPC tests retain their narrow recorded scopes.

Implement Rust read-only Pi session index and differential branch/context fixtures
against original SessionManager; connect unchanged Todo restoration to Rust-owned
state, then add append/branch/reopen before claiming session replacement. Preserve
unknown records; inventory missing-parent/version/compaction behavior explicitly.
This moves beyond passing experiments with TS still owning the core. Do not repeat
current projection cases without new evidence. Node-API remains primary integration
candidate; actual UI host/lifetime and async ownership are still required.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T026 real Pi session seam tested; T027 Rust
session authority proposed next. D008 Node-API primary candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
review findings established branch durability/custom-policy obligations without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

## Before Rust Pi writer (6e6a674)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit63c7e7950ba15d80c5c15573670609cae4fd2d1b; main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Rust Pi v3 index now selects branches, compaction-aware context entries and model/
thinking settings. Independent full-snapshot fixture comparison against upstream
passes; empty-ID mismatch found after initial green cases was fixed and retained.
Rejection cases are separate from parity counts in experiments/pi-index-results.json.
Unchanged Todo reads Rust-selected branch in two fresh processes (no TS manager),
restores alpha and adds gamma with correct ID. Continuation is in memory only.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_index
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-cases.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-index-todo.mjs
cargo test --locked
```
Evidence: experiments/pi-index-results.json, experiments/pi-index-todo-results.json,
docs/pi-index-review.md. Implementation: src/pi_session_index.rs; design and scope:
docs/pi-index-evaluation.md. No credentials/model calls; upstream setup caveats in
real-plugin-host.md still apply.

## Limits and immediate next milestone

Index is read-only, not CLI-integrated; original JS converts selected context
entries to messages. Legacy migration, label/header/tree interface, arbitrary JSON
edge semantics, append/branch/reopen, recovery and identity not complete. Missing
IDs/cycles rejected explicitly; no parity claim for those rejections or file repair.

Next implement Rust Pi append/branch/reopen with unknown records/canonical history
preserved, differential to actual SessionManager. Drive unchanged Todo through
persisted cross-process continuation and branch-local context policy. Include
upstream delayed initial flush and durable branch selection. Then integrate native
binding session authority; do not repeat fixed reads as a substitute. UI lifetime,
async sink rejection ordering and cancellation remain architecture obligations.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T027 Rust session index tested subset,
write/restore next. D008 Node-API primary integration candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent fixtures exposed empty-ID selection semantics, fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

## Before native session integration (123dc3f)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit6e6a674af1c16749f6f8981e16e02614f37dd9e2; main authorized.
Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains fixed.
Rust PiSessionStore now owns v3 append, selected branch and reopen. Seven independent
upstream differential scenarios pass, including first-flush collision memory state
(original Rust mismatch fixed). Unchanged Todo persists gamma across three fresh
Node processes backed by Rust stores, restores correct IDs and branch-local policy.
No TS SessionManager in that Todo flow. Existing Cargo tests pass.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example pi_session_store
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/pi-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs
cargo test --locked
```
Evidence: experiments/pi-write-results.json, experiments/pi-store-todo-results.json,
docs/pi-write-review.md. Design: docs/pi-store-evaluation.md. Dependency/version
caveats still in real-plugin-host.md. No credentials/live model calls.

## Limits and next integration milestone

Fixture adapter drives lifecycle and supplies IDs/clock; not a model-driven loop or
CLI integration. v3 only; no complete migration/header/labels, concurrent writers,
crash/partial-write recovery, missing-file create-on-open or full JSON edge parity.
Append failure may change in-memory state before disk succeeds, matching upstream.
No transactional rollback/safety claim. Policy persistence tested here; projection
and native object identity were previously tested separately.

Next integrate this Rust session module into the Node-API host with per-instance
ownership and cleanup, no borrow across JS callbacks. Reuse frozen writer/Todo
acceptance against native adapter; helper transport remains comparison only. Then
actual UI factory lifecycle and final architecture/inventory audit. D008 native
candidate remains provisional until integrated evidence, full compatibility target
unchanged. Do not repeat helper-only cases instead of integrating.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T027 read/write session subset tested;
T028 native session integration proposed next. D008 candidate unchanged.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent writer fixture exposed failure-path memory ordering, fixed before integration without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

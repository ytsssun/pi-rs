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

## Before architecture decision/UI methods (0788e3b)

# Current checkpoint — core-only Rust architecture evaluation

## Verified state

Starting commit123dc3fc126be6abbd733fb2d4f5aebda7737719; main authorized.
Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Node-API addon links actual Rust PiSessionStore/Index; native path passes frozen7
writer oracle cases and unchanged Todo three-process persisted continuation.
Native/helper Todo results match. Lifecycle tests verify isolated/stale/cross-env
handles, failed-open no allocation,64create/close cycles and Rust Drop on natural
Worker exit/termination. Registration rejects prior instance data instead of leak-
prone overwrite. Explicit close/env exit tested, not arbitrary GC/leak freedom.

Reproduce:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs prototype/architecture/native-store-backend.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs --native
node experiments/native-store-lifecycle.mjs
```
Evidence: experiments/native-write-results.json, native-store-todo-results.json,
native-store-lifecycle-results.json and docs/native-store-review.md.
Design: docs/native-store-evaluation.md. No new dependencies/model calls/credentials.
Node/platform caveat unchanged; original Rust core Cargo suite passed123dc3f,
this cycle builds/links that unchanged core and tests native integration.

## Limits and next milestone

v3 subset, fixture clock/IDs/lifecycle, no CLI/model-driven loop integration or
complete session migration/header/labels/recovery. Native JSON DTOs are fresh
objects, no alias parity. Store lifetime explicit close/env exit only, raw FFI
not production-hardened. Native abort has only prior bounded probe coverage;
multiple sink rejection ordering and actual UI lifecycle remain unverified.

Next run actual upstream UI factory mounting/disposal with objects in JS, then
consolidate ownership decision and compatibility obligations against the inventory.
Node-API candidate now has integrated Rust session evidence. Context editing TS
control works already; Rust justified by requested ownership, not unmeasured speed.
Do not repeat native writer cases absent new changes. Integrate remaining seams
rather than accumulate isolated proofs. Full ecosystem compatibility target stands.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; T028 native session integration subset tested;
D008 native primary candidate strengthened, full compatibility still unproven.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent native lifecycle/source review verified per-env cleanup and registration guard without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.

## Before integrated runtime / architecture closeout (e1e6ab9)

# Current checkpoint — core-only Rust architecture evaluation

## Decision and verified state

Starting commit0788e3bc96ff439a0dd757b6f3f949b54e6217b3; main authorized.
Pinned Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 unchanged.
Architecture direction accepted: upstream JS ecosystem host + Rust runtime exposed
through Node-API. Full compatibility not established. Reason/ownership/alternative
comparison and frozen next acceptance: docs/architecture-decision.md, independently
reviewed in docs/architecture-decision-review.md.

Original UI widget/header/footer lifecycle methods now tested with actual extension
runner, Text/Container/Theme and native session callbacks. Identity, replacement
ordering, disposal, built-in restoration and stale context assertions pass. Naive
JSON component negative fails expected identity check. Initial padding expectation
error preserved; exact upstream40column output now asserted.

Reproduce:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/ui-lifecycle.mjs
```
Negative: append `--json-component-counterexample`. Evidence:
experiments/ui-lifecycle-results.json; independent review above. This invokes
original methods on fixture-initialized fields, not full InteractiveMode constructor,
terminal startup, custom overlay/focus or shutdown lifecycle. No provider calls.

## Next milestone — integrated Rust state machine

Implement one Rust-owned native model/tool/session flow. Rust decides actions and
continuation; JS loads/executes original tools/providers and UI. Reuse native session
module and context policy, persist results, restore/follow up in fresh process,
include failure/cancel, assert canonical history and current-view projection. Frozen
criteria in architecture-decision.md. Independent audit requires integrated evidence;
UI alone cannot complete architecture goal. Do not repeat isolated green probes.

Existing evidence: native7writer cases/Todo3process persistence,19read cases,
callback identity/reentry and5async cases. Remaining: integrated scheduler, complete
session interface/migrations, alias contracts, async rejection order, provider
integration, full UI and distribution/recovery. TS context control works, so Rust
is an ownership choice, not a proven speed gain or unique context-editing necessity.

## Goal and coordination

Rewrite only Pi core runtime in Rust, existing ecosystem plugins unchanged and
fully compatible; do not lower this objective or pursue deferred completion gates.
TS fork remains the control for context editing. Only core/compatibility changes,
major licensing/distribution decisions or actual access blockers need user input.
No global memory edits. Repository checkpoint/append-only board are authoritative.

T022 architecture assessment ongoing; D009 direction accepted for implementation;
T029 integrated Rust state machine proposed with frozen acceptance.
This cycle used coordinator plus one independent reviewer (cap4); reviewer-owned
independent architecture review focused next work on integrated Rust state machine without user intervention. No live model calls or
credentials; agent token counts unavailable. No background uptime promise.

## Historical evidence

See docs/checkpoint-history.md for prior checkpoints, docs/architecture-evaluation.md
for chronological architecture findings, docs/plugin-seams.md for full inventory,
and docs/board.jsonl for append-only tasks/findings. Historical live matrices8/9
then7/9 do not establish Pi compatibility; no new model calls in this cycle.


## Additional archived snapshots

# Historical checkpoints

Archived snapshots; claims may be superseded. Use [current checkpoint](checkpoint.md) and append-only board corrections for current status.

## Historical checkpoint

# Current checkpoint

Active milestone: idle newSession withSession support. Native owner currently rejects the option; pinned upstream defines a fresh command-capable ReplacedSessionContext with message methods. Worker with_session_contract owns isolated implementation, acceptance in board with-session-idle-milestone. Coordinator independently checks upstream ordering/error semantics and actual owner fixture before integration. Provider transport cancellation remains open; no additional audit loop is needed to rediscover blocking reads.

Main fb482b9 CI passed. PR16 correction merged as a17a528. Latest tested transport evidence is bounded local HTTP only, not live cancellation. No new parity claim.

## Historical checkpoint

# Current checkpoint

Independent HTTP cancellation recheck: corrected fixture waits for actual request arrival, observes unfinished producer 100ms after queue_close, then disconnects the server and verifies producer completion within 2s. Reproduction: node --experimental-strip-types experiments/provider-http-cancel-blocker.mjs. Local fixture only, no live model. Previous process-hang interpretation was confounded by the test server leaving sockets open; superseded below. Branch codex/http-cancel-evidence adds bounded cleanup; CI pending.

Source audit confirms current `reqwest::blocking` response read cannot be interrupted by queue close; only 120s client timeout bounds it. Transport cancellation is therefore a separate deliberate migration milestone (async reqwest or bounded isolated lifecycle), not a small queue fix. with yielding JS queue consumption. Keep the existing non-streaming provider behavior unchanged. Require stalled-header and stalled-body cancellation, producer completion before idle, persisted aborted result once, and continuation/reopen. Existing synchronous HTTP read cannot observe queue closure while waiting for bytes.

## Historical checkpoint

# Current checkpoint

Main 14d3bcf includes PR15; implementation head 5ac6b74 passed CI 34771190001 and 34771185716, and main CI succeeded. Same-host continuation after extension abort is fixed; deterministic scope only.

Provider cancellation audit corrected the worker claim: Rust already starts provider work on a thread and exposes stream handles, nonblocking queue_poll and queue_close. JS assembleNativeQueue chooses blocking wait:true. Existing primitives permit cooperative polling without a new request protocol, demonstrated by experiments/provider-queue-cancel-probe.mjs. Closing a queue does NOT prove interruption of a blocked HTTP read or producer cleanup. Provider cancellation remains unimplemented.

New blocker evidence (main 4aa77e5): `provider-http-cancel-blocker.mjs` against a local stalled HTTP endpoint shows `queue_close` returns while `stream_status` remains unfinished and the process hangs in the producer read. This proves transport cleanup is missing.

Next bounded milestone: replace blocking queue consumption with yielding consumption for streaming mode, retaining existing assembly behavior and propagating AbortSignal. Acceptance: local HTTP fixture with controlled stalled response, event-loop responsiveness, transport cleanup before idle, once-only persisted abort, same-host continuation, fresh-process recovery. Investigate blocking HTTP read cancellation before promising cleanup; non-streaming mode remains separately unsupported. No live cancellation or performance claim.

## Historical checkpoint (superseded status preserved)

# Current checkpoint

PR #14 merged as 9545e68 after exact-head CI 34753745675 / 34753743902 passed. Coordinator reran cooperative-tool-cancel, deferred-message-events, next-turn-queue and cancel-settlement-probe: all passed. Scope is deterministic sequential cooperative tools and persisted settlement, not in-flight provider interruption or full cancellation parity.

A new independent continuation counterexample found extension abort permanently poisoned the host signal: next drive made zero provider calls. Branch codex/cancel-next-turn refreshes the signal only at idle-to-active admission and adds same-host continuation checks for caller and extension cancellation. Local cooperative-tool-cancel and command-idle pass; CI pending.

Next: independently review and integrate continuation fix after exact CI. Then wire and verify in-flight provider cancellation: controlled blocked provider, real signal propagation, cleanup before idle, one persisted terminal outcome, no subsequent tools/provider calls, same-host continuation and fresh-process recovery. Freeze these criteria before implementation; live-model cancellation remains unverified.

Coordinator execution incident: heartbeat wakeups from 11:40 through 16:46 returned assurances without tool-backed progress. Those assurances are unsupported; scheduling worked but execution did not. Each actionable wake must inspect state and produce evidence or an explicit blocker; acknowledgements are not progress.

## Historical checkpoint (superseded status preserved for traceability)

# Current checkpoint

Cancellation implementation is blocked by a real protocol gap, not credentials: audit `docs/cancellation-seam-audit.md` (main `2128777`) shows synchronous Rust `step` with private waiting and no cancel handle/token or settlement event. No unsafe cancel stub was added. Active next task is API/state-machine design in `/tmp/pi-rs-cancel-api`; implementation follows only after a bounded design and deterministic blocking fixture plan.

Active next milestone: one Rust-owned cancellation seam. Worker `cancellation_seam` is assigned `/tmp/pi-rs-cancellation`, branch `codex/cancellation`, acceptance in board `cancellation-seam-task`. Current Rust runtime has no cancel op; only JS-side AbortController exists. Implementation must prove exactly-once settle and persisted aborted recovery or return a concrete blocker.

Deferred event observation is CI-verified at 86f0e4b. New source audit confirms steer/followUp/cancellation remain a structural gap: pinned AgentSession requires explicit streamingBehavior, queue admission and abort/dispose ordering; native Rust currently has none and abort is JS-triggered. Do not add success-shaped stubs. Next task is a single cancellation admission seam with a real provider/tool fixture and explicit failure behavior.

Deferred custom event observation is integrated at `ad1738d` after fresh native rebuild. `deferred-message-events.mjs`, `deferred-custom-message.mjs` and `next-turn-queue.mjs` pass. Admission snapshot now drives both canonical persistence and message_start/end observer payload; mutation and observer-failure paths are covered. Scope is triggerTurn:false/no deliverAs only; full AgentSession.subscribe, normal messages, steer/followUp and cancellation remain open. Exact main CI is pending.

Main `23f03ed` passed exact CI 34741172995. nextTurn now enters native begin after the user message in FIFO order; deterministic true-subprocess fixture distinguishes lost unconsumed in-memory queues from retained consumed entries. Rejected admission preserves queue/history. Deferred triggerTurn:false gate remains passing. No live scheduling, steer/followUp, cancellation or crash-atomic multiappend claim.

Correction: the previous fixture failure came from stale native addon. The original second-item invalid-admission test was valid; changing index was not a necessary bug fix. Rebuild with `python3 scripts/build-native-session.py` before evaluating Rust changes.

Active work: `/tmp/pi-rs-deferred-events`, worker deferred_event_contract. Implement minimal deferred-custom onSessionEvent observer after persisted append, with tool-result ordering and explicit observer-exception tests. AgentSession subscriber events differ from generic extension eventBus; ordinary message forwarding also differs from deferred custom path. Source evidence is board `deferred-event-boundary-audit`. This scope does not promise full AgentSession.subscribe compatibility.

Established live baseline: formal command-triggered replacement, coding and fresh-process resume passed once; source/artifact evidence remains in history. Next critical path after deferred events is safe message/cancellation control needed by self-hosted harnesses; no provider/TUI expansion.

## Historical checkpoint (later corrections take precedence)

# Previous checkpoint

Main c6f871c CI and rerun of 72677e3 both succeeded. nextTurn implementation remains reverted; main retains known early-persistence mismatch. Previous rejection misread consumed-versus-pending restart behavior; board `next-turn-rejection-audit-correction` is authoritative.

Active worktree `/tmp/pi-rs-next-order` (worker next_turn_order): draft 15f7284 moves injection to Rust begin after user append. Coordinator ran fixture and found invalid payload (missing display); fixture also lacks FIFO, relative order and genuine subprocess assertions. Worker is repairing those exact gaps. No integration or nextTurn compatibility claim yet. Preserve non-trigger custom-message gate independently.

Verified product baseline: formal CLI command-triggered replacement, real model coding, fresh-process continuation; parentSession header-only metadata; deterministic deferred triggerTurn:false gate. Bounded live evidence remains below. NextTurn acceptance: user then two custom messages in FIFO, no current-turn persistence or duplicates; pending queue lost on process exit, consumed entries survive real subprocess reopen; rejected begin leaves queue intact. After this slice: message event ordering and steer/followUp/cancellation, not provider/TUI expansion.


# Previous checkpoint

Next task: upstream-accurate `nextTurn` queue semantics. Worker `next_turn_semantics` is active in `/tmp/pi-rs-next-turn`, branch `codex/next-turn-semantics`; current driver drains and persists all queued classes at turn end, which differs from pinned upstream. Acceptance is board record `next-turn-semantics`; no steer/followUp claim until separately evidenced.

PR #13 merged as `856becd` after exact CI runs 34730735438 and 34730733447. The new deterministic gate verifies triggerTurn:false custom messages persist at safe turn end and enter fresh-process context. Upstream nextTurn remains a known semantic mismatch: it queues until the next user prompt; steer/followUp and event ordering are unverified.

Next milestone: Rust-owned extension message scheduling seam. Worker `message_scheduler_seam` is active in `/tmp/pi-rs-message-scheduler`, branch `codex/message-scheduler`; acceptance is board record `message-scheduler-milestone`. It must either implement one upstream-backed deferred ordering behavior with real host/native persistence and CI, or provide a reproduced blocker. Steer/followUp/in-flight cancellation remain unclaimed until evidence exists.

Formal CLI live command replacement is now verified once: gpt-5.4-mini completed old-session bug fix, `--resume --command fresh --input` replacement coding, then fresh-process continuation. All 3 stages and external checks passed, tests unchanged, steering 0; tools read/edit/write/bash were observed and old/new session isolation held. Artifact `/tmp/pi-live-command-37a8b4f`; relay usage was unavailable, not counted as zero. One run only; active-turn abort, withSession, cancellation and reliability across repetitions remain open.

Active live formal command validation: worker `live_cli_command` resumed after resolving PATH-only Cargo failure. `/Users/stevensun/.cargo/bin/cargo build --locked --bin pi-rs` succeeds on main 37a8b4f. If `cargo` is absent from PATH, check `$HOME/.cargo/bin/cargo` before reporting an installation/access blocker. Live combined-command outcome still pending; prior deterministic gates remain valid.

PR #12 merged as `c9b9129` after exact-head CI runs 34723992787 and 34723991380 plus independent review. Formal CLI now accepts `--command NAME --input TEXT --fixture FILE|--model ID`; the verified fixture performs command-triggered newSession, real write/bash on the new owner, fresh-process edit, parent header/history isolation, invalid command/model failure and veto. Deterministic only; live combined command path remains next.

Main `fd583d4` records parentSession acceptance: exact behavioral head `267f581` passed CI 34718169806, including header-only metadata, no history copying, veto/invalid options and fresh-process roundtrip. withSession and active-turn abort-and-switch remain unsupported.

Clean-source live replacement workflow at a633523 passed three coding stages with gpt-5.4-mini, 0 steering, 13443 canonical tokens. Independently checked artifact hashes and per-stage external assertions; evidence in `docs/live-replacement-clean-summary.json`. Switch is harness-driven, not model-selected or a complete formal CLI replacement flow.

Current critical path: formal CLI `--command fresh --input ... --model ID|--fixture FILE`, allowing a registered command to replace the session and run the coding request on the new owner without synthetic setup messages. Active isolated worktree `/tmp/pi-rs-command-input`, branch `codex/command-input`. Frozen acceptance is board record `formal-command-input-cycle`. Check this worktree before duplicating work. Existing CLI has inconsistent command+input validation; implementation must eliminate implicit model fallback and retain side-effect-free invalid-model/command rejection.

Reproduce established gates: `node --experimental-strip-types experiments/session-parent-option.mjs`, `node --experimental-strip-types experiments/cli-new-session.mjs`, `node --experimental-strip-types experiments/session-owner-failures.mjs`. After command/input usability, prioritize withSession and cancellation/message scheduling. No provider/TUI expansion is on this critical path.


# Previous checkpoint

Latest verified bounded result: clean main a633523 completed all three live replacement/continuation stages with gpt-5.4-mini and no steering; sourceDirty=false and all artifact hashes independently checked. See `docs/live-replacement-clean-summary.json`. Run3 remains successful but was dirty, correcting the prior clean-run claim. Current implementation: `parentSession` header-only compatibility is integrated on main (`267f581`) and its fixture passes locally and exact main CI 34718169806 succeeded. Formal CLI empty replacement usability and withSession/cancellation remain open.

Strengthened live replacement harness is integrated at `9247b7a` (worker 7c63acc), with syntax/compile checks passing. Run3 passed in `/tmp/pi-rs-live-replacement-run3`: native owner coding, extension-command replacement, new-owner coding, and formal fresh-process resume; 3 stages, owner 13.34s, resume 11.62s, 0 steering. Per-stage external checks, active tool assertions, frozen old bytes, isolated IDs/history, unchanged tests, usage and provenance are recorded. This is one harness-driven live run, not full upstream session-control parity.

Latest bounded result: repaired live replacement harness passed a three-stage workflow (old coding → harness-command replacement → new coding → formal fresh-process resume), 15 model calls and 14530 canonical tokens. Prior live attempt failed from accidentally loaded demo extension. See `docs/live-replacement-run2-summary.json` for dirty-code/binary provenance and missing isolated first-stage assertion. Harness is not integrated; worker is repairing those evidence gaps before a clean rerun.

Main `ee668e9` CI passed. PR #11 merged as `63de743` after exact-head CI runs 34703881056 and 34703879455 and independent review. Native owner replacement and terminal-failure fixtures are now CI gates. Compaction report snapshot-after-close regression is fixed and externally tested.

Local real gpt-5.4-mini coding regression: 2/2 turns passed (bug fix then separate-process continuation), 0 failures/steering, protected tests unchanged. Summary: `docs/owner-live-resume-summary.json`; full local evidence: `/tmp/pi-rs-owner-live-63de743`. This is live resume evidence, not live newSession replacement.

Reproduce owner acceptance after the documented build: `node --experimental-strip-types experiments/cli-new-session.mjs` and `node --experimental-strip-types experiments/session-owner-failures.mjs`. Idle-only replacement is a deliberate limitation relative to upstream abort-and-switch. parentSession/withSession remain unsupported; no full parity claim.

Current critical path: repair the owner harness tool registration, then rerun real-model coding after extension-command replacement followed by fresh-process CLI resume with external filesystem and history assertions. The first attempt (9a553f9) reached the model but exposed a tool-contract failure: only tool_search was visible, so the model made no file changes and external assertions failed; this is recorded as failed live evidence, not a model-quality verdict. Active implementation: `/tmp/pi-rs-live-replacement`, branch `codex/live-replacement`, worker `live_replacement_harness`. Check that worktree before duplicating it. The switch is harness-driven; model independently chooses coding tools. Native owner harness evidence must be distinguished from formal CLI evidence.

Roadmap order: finish this replacement evidence; make unseeded replacement usable through the formal CLI while preserving lazy persistence; implement missing session command options; then tackle cancellation/message scheduling needed for self-hosted harness work. Do not broaden provider/TUI scope to avoid these gaps. Reassess order on concrete failures. Source inventory currently counts 43 method candidates/15 emitter names, not verified public API parity.


# Previous checkpoint

PR #11 merged as `63de743` after exact-head f645aa1 CI runs 34703881056 and 34703879455 succeeded and independent review passed. Compaction reporting now reads its snapshot before owner close; all owner fixtures are CI gates. Fresh live gpt-5.4-mini regression completed 2/2 turns: bug fix then fresh-process continuation, external assertions passed, tests unchanged, no manual steering. Artifacts: `/tmp/pi-rs-owner-live-63de743`; this validates the existing resume path after owner integration, NOT live newSession replacement. Next: make a live replacement harness that distinguishes extension-driven switching from model-driven coding; preserve current idle-only and unsupported-option limits.

Main `543f577` contains idle-only native session replacement wired into the formal CLI. CI run 34699278838 completed successfully for that exact SHA, but did not run the two new owner fixtures. Those fixtures passed locally; this branch adds them to CI. Do not conflate existing CI success with new owner coverage.

Reproduce after the documented native build: `node --experimental-strip-types experiments/cli-new-session.mjs` and `node --experimental-strip-types experiments/session-owner-failures.mjs`. Coverage: veto, distinct persisted identity/history, fresh-process continuation, stale contexts, idle waiter, busy rejection and terminal setup/host-creation failures. This is deterministic fixture evidence, not live-model validation. `parentSession`/`withSession` remain unsupported; busy rejection differs from upstream abort-and-switch.

Next: complete exact-SHA CI for the added gates, then validate live coding after session replacement. Review snapshot access after owner close in compaction reporting before expanding scope. Historical live coding evidence below does not validate this replacement implementation.

Coordination correction: worker commit e8f0685 depended on 6a687fb; the worker did not omit CLI files. Coordinator cherry-picked only the dependent fix, causing missing files/wiring, then repaired integration. Previous chat attribution to worker omission was incorrect. Coordinator also pushed main before exact-SHA CI, contrary to the agreed gate; subsequent runtime changes must use a reviewed branch with completed CI before integration.


# Previous checkpoint

Main `9094e77` integrates PR #10: actual prebuilt CLI `--help` process measurement. Exact PR head `29fbf3b6246a863cf0846ed45291cff617aef6bb` passed CI runs 34687711563 and 34687702949; merge CI also completed successfully. Independent review exercised both the real binary and an exit-zero non-CLI rejection. Local debug warm-filesystem median was 89.63 ms (10 samples, 2 warmups); this is not full runtime startup, a release benchmark, or an upstream speed comparison.

Reproduce: `python3 scripts/measure-startup.py --binary "$HOME/.cargo/bin/pi-rs" --samples 10 --json-out /tmp/pi-startup.json`. Results identify the supplied binary by SHA256; the committed historical baseline describes its own debug binary, not this installed executable.

Existing formal CLI coding/recovery evidence remains historical below. In-process `newSession` is still explicitly unsupported. Current work: source-audit the proposed owner contract against pinned upstream and implement a real native-store owner through the formal CLI in isolated branch `codex/owner-next`. Acceptance remains veto before allocation, idle/busy guard, shutdown/startup ordering, distinct persisted histories/IDs, stale-context rejection, setup isolation and fresh continuation. Fixture results must not be labelled live-model validation.

Recovery: inspect git status, open PRs/exact CI and worker state; inspect `/tmp/pi-rs-owner-next` before duplicating work. Prior prototypes remain quarantined. Coordinator owns integration; do not merge worker claims without reproducing the external fixture. Two earlier wakeups repeated summaries instead of executing: this was an execution failure, not a credential or product-decision blocker.

## Historical checkpoint (later corrections take precedence)

# Previous checkpoint

Main `0ef20e4` includes PR #9 formal CLI lifecycle events and quarantine records for two rejected newSession worker attempts. Exact SHA `03d5557` CI `34657605731` passed all Rust, native session, command, idle, blocked-tool, and lifecycle checks; independent review and local fixture also passed. CLI now emits one `session_start(reason: startup)` after validation and one `session_shutdown(reason: quit)` with cleanup. Unknown explicit commands are rejected before session creation; invalid model/arguments remain side-effect free. No live-model validation in this slice.

Reproduce: `node --experimental-strip-types experiments/cli-lifecycle.mjs`. Coverage limits: signal-driven shutdown, valid explicit `--command` lifecycle, active-provider abort ordering, runtime rebind and newSession remain unverified. Issue #3 remains open. Next critical path is a mutable runtime owner for idle-only same-workspace newSession. Source-backed design is verified in board record `new-session-design-verified`; three implementation attempts were rejected for fake/incomplete acceptance or shared-tree edits. Do not implement resetLeaf as a substitute.

Recovery: inspect current main CI/PRs, read coordinator and newest board records, then inspect active workers before starting work. Worker lifecycle handoff failed to push initially; coordinator took ownership, caught duplicate host loading and missing CI invocation, corrected both, and only then merged after exact SHA CI. Session identity remains UUIDv4 versus upstream UUIDv7; timestamps are current on native driver actions.




# Current checkpoint

2026-09-09 correction: installer completed successfully at `~/.cargo/bin/pi-rs` (previous chat report of interruption was incorrect). Installed executable passed external write/resume/extension rejection acceptance with `python3 experiments/formal-cli.py --binary "$HOME/.cargo/bin/pi-rs"`. Source assets remain required; remote curl bootstrap is not yet independently validated. Streaming already uses `nativeProviderStream → assembleNativeQueue → StreamAssembler`; previous claims that this bridge was missing were incorrect. Removed the unused ID-keyed ChatDeltaAccumulator rather than wiring an incompatible duplicate into the runtime. Next: independently validate remote installation and registered-provider selection through the formal CLI.

Formal Cargo `pi-rs` now launches the existing Node host with Rust Node-API runtime and original Pi tools/extensions. Build: `python3 scripts/build-native-session.py` then `cargo build --locked --bin pi-rs`. Source checkout and Node dependencies remain required; this is not a standalone package.

Deterministic external acceptance: `python3 experiments/formal-cli.py` passes original write → new-process resume/edit, exact filesystem assertions, canonical prefix retention, and unchanged protected-path extension rejection. No live call was performed for this launcher migration. Legacy Rust snapshot CLI is preserved as `pi-rs-legacy`; historical harnesses explicitly target it.

ModelRuntime provider resolution is now verified for built-in OpenAI models: local `.env` catalog/auth resolves models and the formal CLI routes the resolved ID into Rust transport (E269). Provider registration lookup is deterministic only; custom provider request composition and OAuth remain open.

Live baseline now verified: gpt-5.4-mini completed bug, behavior, and fresh-process resume scenarios 9/9 with no steering (E223). Context-editing long-task validation has three preserved model-behavior failures: the model omitted a requirement read from diagnostics; runtime/provider/tool paths remained healthy (E224/E225). E263 verifies live model metadata lets a fresh `--resume` omit `--model`; E264 preserves fixture resume compatibility after correcting an invalid restriction. E243 verifies explicit non-trigger custom messages persist after execution and enter fresh-process model context. Other message scheduling modes fail explicitly without a consumer; full message delivery remains incomplete. E255 adds a broader pinned Runner method/event inventory; the earlier 14/14 action count is only one surface and is not a parity percentage.

Next critical path: implement Rust-owned extension message scheduling and verify upstream ordering at tool boundaries; define the parity inventory alongside this work. E226 already inspected context projection bytes. Do not add a second sidecar runtime. Full parity remains unmeasured; define an explicit upstream capability denominator before reporting a percentage.

E252: live long-read context projection passed with `--context-tool-chars 1200`: model selected read/bash/write/bash and wrote exact LONG_OK; canonical history retained.

E251: three independent live formal CLI coding/recovery runs passed 3/3 with gpt-5.6-luna, no steering; each fresh process read, edited, and bash-verified exact content.

E250: live formal CLI now verified real tool execution and fresh-process continuation: gpt-5.6-luna independently selected write/bash, then read/write/bash after --resume; exact external assertions passed (E249/E250).

E248: formal `pi-rs` CLI completed a real OpenAI `gpt-5.6-luna` request (exit 0, exact OK, usage recorded, 3.02s wall) using project `.env`; no-tool single-turn only.

E242: extension `pi.appendEntry(customType, data)` now preserves both arguments through the original loader and native store; separate-process recovery passes after the first assistant message flush. Reproduce: `node --experimental-strip-types experiments/extension-entry-recovery.mjs`. Custom-only sessions retain upstream deferred persistence. Remaining priority: actual consumer semantics for queued extension messages and an evidence-backed parity denominator.

## Historical checkpoint (later corrections take precedence)

# Current checkpoint

E194: registered extension commands are now returned by pi.getCommands; regression reproduced before the fix and passes afterward. Prompt/skill command sources remain open. Next: validate command collision/namespacing against pinned upstream, then connect command execution to the unified entry. H031 rollback blocker is withdrawn: 6cbd0ed is an ancestor of d46844f; unchanged branch pointers were misinterpreted.

E193 revalidates live actual-CLI provider continuation from the authoritative baseline: write in one process, edit after fresh --resume, exact external assertion passes.

E192 verifies host action thinking-level roundtrip (off → high) through the bound extension runtime; this is in-process state only.

E191 verifies empty fixture input is rejected before session creation, with a clear error and no side effects.

E190 revalidates live actual-CLI write → bash after implementing getThinkingLevel: both tools succeed and an external exact file assertion passes.

E189 verifies live actual-CLI edit → bash continuation: exact external edit and successful bash result, with gpt-5.4-mini and no steering.

E185 records three independent live actual-CLI write → fresh-process resume → edit successes with exact external assertions and no steering.

E182 verifies exact projected toolResult truncation at a fixed limit, including the canonical-retained marker, while the persisted canonical result remains complete.

E180 verifies a live long-read run with context-tool-chars=20 completes and persists a session. It does not yet expose an independent assertion of the exact model-view bytes; context editing correctness remains partially verified.

E179 verifies three fresh live CLI write → independent-process resume → edit runs with exact external assertions and no steering. This strengthens the core coding loop; provider breadth, crash-during-call recovery, and full Pi ecosystem compatibility remain open.

Current correction (E174): protected live acceptance now requires a correlated attempted write and extension rejection; file absence alone cannot pass. Deterministic counterexamples pass; live rerun of this gate is pending. E168/E169/E172 used the custom-tool native harness, not the original-tool CLI. E169 resumed reads were sequential. Next: validate this gate against persisted live sessions, then move these acceptance cases onto the actual CLI. E177 additionally verifies the same unchanged extension allows a safe live write with exact external content.

The Rust/Node-API runtime now has a live unified entry with original Pi tools: E145/E146/E147/E149/E150/E153 passed under independent external checks. It remains an integration prototype; the shipped Rust CLI
still uses the legacy execution path. Running CLI help does not prove extension
integration or a clean build (E128 overstated both).

Current work: unified execution path remains the priority.

Latest verified unified-entry results: E145 live original read, E146 live original write, E147 fresh-process write/read resume, E148 unchanged protected extension load, E149 fresh-process write/edit resume, and E168/E169 live parallel write/read plus fresh-process parallel recovery. E144 remains the pre-fix failure that exposed incorrect tool registration. The new entry is still experimental and has not replaced the legacy CLI. The latest change fixes E172 live unchanged protected extension interception now passes: an explicit write call is rejected, the model continues, and the external .env absence assertion passes.
E158 confirms the same policy projection/reset behavior through the existing Rust context path; unified-entry policy persistence is E157, while live model-view trimming remains unverified.
E160 adds a live unified-entry long-read run with context-tool-chars=10; completion and canonical session persistence passed. Exact model-view truncation bytes still need a direct external assertion.
live harness acceptance/reporting: per-scenario file checks, byte-exact text (no
trim), and unknown-stage rejection. Reproduce offline counterexamples with
`node --test experiments/native-live-acceptance.test.mjs`.

Evidence limits: E121 compared against a handwritten lifecycle trace, not executed
upstream Pi; upstream lifecycle parity remains unverified. E132/E133 checked trimmed
parallel file content, so exact-byte claims are superseded. No fresh live run has
been performed under the stricter acceptance introduced here. E126 was a tool-loop
smoke, not independent coding-task completion. Existing live/fixture results remain
historical evidence within their stated scope, not full Pi compatibility.

Next executable work: connect a user-facing Node entry to the Rust runtime and
unchanged extension host, retaining Pi tool implementations. Freeze the CLI entry
acceptance before implementation: new request, real tool execution, persisted
session, fresh-process follow-up, unchanged extension hook, and rejection of
invalid CLI inputs before effects. Do not rerun unrelated passing legacy tests as
substitutes for this integration.

## Historical checkpoint (preserved; later corrections take precedence)

# Current correction — batch block semantics

E085 corrects a prior compatibility error: per-tool block does not cancel its peers; blocked immediate outcomes skip tool_result hooks. Both block and input-mutation fixtures pass. Earlier zero-execution block and blocked-result-hook claims are superseded. Actual AbortSignal cancellation remains unimplemented/unverified. Full Pi compatibility is not achieved.

## Historical checkpoint (claims require their later corrections)

# Checkpoint — M7 event/tool parity proposed; implementation remains

## Current verified status

Latest provider check: `python3 scripts/build-native-session.py` then
`python3 experiments/native-provider-http.py` passes four local HTTP cases through
Node-API and the shared Rust transport: success/usage, incomplete response, HTTP
429, and redirect refusal. Native and CLI now share the 120-second/no-redirect
client configuration. This is not live inference. Native requests still block the
Node event loop; message-schema conversion and live coding/resume remain open.

Evidence correction: the current `upstream-event-trace.mjs` constructs a handwritten
trace rather than executing upstream Pi. Its comparison cannot establish upstream
lifecycle parity. Earlier parity claims based on that comparison are superseded;
M7 remains incomplete. Likewise the delayed tool fixture awaits its own updates;
that does not establish a runtime barrier for non-awaiting plugins.


Architecture direction: Rust core through Node-API, pinned upstream JS ecosystem
host unchanged. Architecture assessment now has integrated evidence; this is NOT
complete Rust rewrite, all-plugin compatibility, production readiness or measured
performance improvement. Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains reference.
Starting commit for this closeout: e1e6ab934f56481464c9e2cacb90e3ad159c7e4a.

Native PiRuntime now decides sequential model/tool continuation and writes through
PiSessionStore. Actual JS loader/runner/wrappers and context hooks are used. Four
fresh processes prove persisted followup/reset/fork with branch-local projection,
prior hook edits retained and canonical file prefix untouched. Five independent
upstream/native message and model-view comparisons pass. Pending-branch cross-write
was found and fixed; regressions retain failure evidence. Writer7, native lifecycle
and cargo test --locked also passed.

Reproduce current integrated evidence:
```
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-runtime.mjs
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/integrated-control.mjs
```

Decision: docs/architecture-decision.md. Integrated scope/method/results:
docs/integrated-runtime-evaluation.md; independent frozen and overall goal audit:
docs/integrated-runtime-review.md. Reports in experiments/native-runtime-results.json
and experiments/integrated-control-results.json. No credentials/live model calls.
Node/platform caveats in docs/real-plugin-host.md apply. Core Rust/session code is
real, but model responses and clock are fixtures. No public native-runtime CLI yet.

## Next implementation milestone (no architecture signoff required)

Frozen acceptance: [M7 event and tool-hook parity](event-parity-milestone.md).

Bring native runtime event/tool-hook ordering toward pinned Pi conformance, reusing
original JS extension host. Start with actual before_tool/tool_result and agent/turn/
message/tool lifecycle events, including an async partial-update barrier and tool
failure. Derive external cases from original AgentSession/agent-loop, including
steering/cancel interactions before adding those transitions. Preserve sequential
baseline and current-view context semantics. Keep active operations correlated to
their session; no pending branch cross-write or completed-tool replay.

Acceptance for that milestone must be frozen in a new project record before edits;
it is product conformance work, not a claim more architecture research is required.
Then integrate live provider/public CLI path and expand full plugin/API coverage.
Do not publish/release or claim full compatibility from current fixtures.

## Remaining limits

Full session migrations/header/labels/aliases, arbitrary JSON edges, parallelism,
stream/events/cancel/steering/batch termination, crash/partial-write resolution,
actual provider transport through new native loop and cross-platform production
FFI packaging remain incomplete. Unfinished persisted calls reject explicitly, not
fully recover. Projection supports one text tool block. Pending branch/external
message changes currently reject; rich Pi steering is future work. Existing CLI
still uses its previous native-session path; native addon is an integration prototype.

## Preserved project objective and operations

Only Pi core runtime is rewritten in Rust; entire existing ecosystem must ultimately
work without plugin changes. JS remains necessary for plugins/UI/provider adapters.
TS control already performs tested context editing; Rust serves requested runtime
ownership, not a proven speed advantage. Do not change these goals, narrow full
compatibility, or adopt significant licensing/distribution changes without user.
No global memory edits; project files/append-only board are authoritative.

Main pushes authorized, no force push/release/publication. This cycle coordinator+
independent reviewer used2workers within cap4; findings changed implementation and
coverage without user intervention. No background48hour promise or model spend.

## History

Earlier checkpoints: docs/checkpoint-history.md. Evidence index and alternatives:
docs/architecture-evaluation.md, docs/plugin-seams.md, docs/architecture-decision.md.
Board T029 integrated fixture milestone tested; architecture assessment T022 closed
with explicit full-product limits. Subsequent work follows the project goal, not
an invented claim that the complete coding agent already replaces Pi.

## Execution continuity

The project checkpoint and append-only board are the durable recovery mechanism. The Codex goal is active for this task, but a completed turn does not itself guarantee background execution: the app/user or an explicitly configured heartbeat must start another turn. Worker completion can notify the coordinator while this task is active; it cannot revive an exited process. On abnormal exit, resume from `git status`, the latest checkpoint, and `python3 scripts/board.py list`; never infer work from chat claims. No herdr executable or existing project automation was found in this environment.

Latest evidence: `node experiments/compare-event-trace.mjs` passes lifecycle, tool identity and error semantics for the deterministic sequential case. The async hook probe requires the documented upstream build bootstrap; after `sh scripts/bootstrap-upstream.sh --build` it runs successfully. It remains prepared execution only, not a full native runtime parity pass.

Async hook probe now runs after `sh scripts/bootstrap-upstream.sh --build`; it requires `--experimental-vm-modules` on Node 22.18. Results cover ordered partial updates, awaited sinks, thrown tool errors, cooperative abort, and sink rejection. It remains prepared execution only and is not yet wired into Rust runtime.

Verified E033: lifecycle differential and five-case upstream async contract both pass on current main after bootstrap. This does not prove native sink completion/rejection parity end to end or live provider operation.

Verified live provider smoke: with existing `.env` authorization, `gpt-5.6-luna` and reasoning `none` completed a read-only request, then a separate process resumed the session and completed a follow-up request. This validates legacy CLI provider/session flow only; it does not validate native Node-API provider integration or autonomous coding.

Verified E037: `experiments/native-provider-live.mjs` sends a real gpt-5.6-luna request through Node-API `provider_chat` and receives the expected marker. The model omitted punctuation, so the probe accepts the semantically equivalent marker. This is provider transport only; native Rust model/tool/session continuation and live coding/resume remain unverified.

E038 failed: native live harness reached the real provider but OpenAI returned HTTP 400 before a model response. The native host passes Pi tool definitions directly; Chat Completions requires conversion to `function` tool objects. No live native coding/resume success is claimed.

Verified E039: fresh native Node-API harness with real `gpt-5.6-luna` completed model → unchanged JS `read` tool → model → turn end. This is the first live model execution through the native runtime. It is one read-only scenario in one process; cross-process native resume, mutations, and repeated trials remain unverified.

Verified E040: native live harness now supports `seed`/`resume`. Two independent processes using gpt-5.6-luna completed model → unchanged JS read tool → model; the second opened the first session successfully with no prior tool replay. This remains read-only and one trial; mutation coding and repeated independent runs remain open.

Verified E041: isolated native live mutation/resume passed across two processes with gpt-5.6-luna. Seed autonomously wrote `NATIVE_LIVE_OK` via unchanged JS `write`; resume autonomously read it and completed. External check matched exact file content. This is one scenario; three-run reliability, broader mutation tools, and crash recovery remain open.

Verified E042: three fresh isolated native live seed/resume runs with gpt-5.6-luna passed. Each autonomously wrote `NATIVE_LIVE_OK` through unchanged JS `write`, resumed in a new process, read the file, and passed an external exact-content check without steering. This is a small scenario; edit/bash, crash recovery, streaming and broad plugin compatibility remain open.

Verified E043: native live resume autonomously selected `edit`, replaced NATIVE_LIVE_OK with NATIVE_LIVE_EDITED, then selected `read`; external exact-content check passed. This is a simple exact replacement fixture and not full Pi edit semantics; bash, repeated edit runs, crash recovery and broader compatibility remain open.

Post-system-prompt live check: isolated seed/resume with gpt-5.6-luna still completed write, edit and read through unchanged JS tools; external target content was `NATIVE_LIVE_EDITED`. This is a regression smoke, not a new reliability sample.

Verified E044: native live seed/resume now includes `bash`; gpt-5.6-luna autonomously ran an exact-content shell test in both processes, with `isError: false`. This is one isolated scenario and uses a bounded harness bash wrapper; production command parity and repeated trials remain open.

E045 repetition audit: two clean native live bash seed/resume runs passed; the attempted third run was invalid because the command used an incorrect environment assignment and reused an existing session path. It is excluded from reliability counts; the three-run gate remains open.

Verified E046: corrected third clean native live bash seed/resume run passed. Together with the two valid E045 runs, the three-run reliability gate passes; the prior invalid attempt remains excluded.

Verified E048: native pending marker is flushed even before an assistant entry, allowing reopen recovery. `experiments/native-inflight-recovery.mjs` proves reopen blocks unresolved replay and explicit `resolve_in_flight` succeeds. This is deterministic marker recovery; abrupt process termination during a real provider/tool call remains untested.

Verified E050: native driver now owns the async tool-update barrier. `experiments/native-update-barrier.mjs` covers successful non-awaited update, rejected sink, and undefined rejection; no tool result/model continuation occurs before sink settlement and late updates are ignored. This is deterministic fixture evidence, not live-model parity. Upstream audit found parallel scheduling requires full-batch preflight, source-order persistence, and whole-batch sequential override; `maxConcurrency` would be a deliberate extension, so parallel implementation remains pending.

## Current execution note (2026-09-08)

The next batch implementation is not yet started. Independent clean verification attempted `cargo test --locked` but the current host has no `cargo` executable, so no fresh Rust compile result is claimed. JavaScript fixture verification remains available; restore a Rust toolchain before treating native source changes as build-verified.

Verified E052: the Rust toolchain is installed at `/Users/stevensun/.cargo/bin` but was absent from PATH. Running `/Users/stevensun/.cargo/bin/cargo test --locked` passed all 32 integration/unit tests and doc tests. F051 is superseded as an environment PATH issue; future verification should use the absolute toolchain path or export its bin directory.

Verified E053: `experiments/upstream-parallel-contract.mjs` executable check confirms the pinned upstream source contains whole-batch sequential override, source-order preflight, Promise.all execution barrier, and source-order result persistence. This strengthens the Rust batch acceptance contract; pi-rs batch implementation remains outstanding.

Tested E054: Rust runtime now has an opt-in `parallel:true` batch action with per-call request IDs; `batch_result` validates count/IDs and persists source-order tool results. Default sequential behavior is unchanged. Cargo tests pass. The native JS driver still needs batch execution/preflight semantics, so this is not a live or full upstream compatibility result.

Tested E055: native driver now passes `parallel` to Rust `begin`, executes `tool_batch` calls concurrently, and submits source-correlated `batch_result` outcomes. Existing sequential fixture and `/Users/stevensun/.cargo/bin/cargo test --locked` pass. This is an opt-in prototype; full upstream preflight/abort semantics and live batch verification remain open.

Verified E056: `experiments/native-batch.mjs` sends batch outcomes in reverse completion order; Rust maps by request ID and persists `one,two` source order. The prior positional-matching failure was fixed in `2a747fe`. This remains deterministic native evidence; preflight/abort, sequential override, and live model batch execution remain open.

E056 initial run is superseded: it used a stale native addon. Verified E057 after `python3 scripts/build-native-session.py`: reverse-order batch completion passes and source order is persisted.

Tested E058: native batch driver now completes lookup and argument validation for every call before starting execution. An invalid later call therefore prevents partial batch execution. Existing sequential integration fixture and syntax checks pass; hook-driven preflight abort and executionMode sequential override remain open.

Tested E059: native batch host honors registered `executionMode: "sequential"` by serializing the entire batch; otherwise it executes admitted calls concurrently. Existing integration fixture and syntax checks pass. Hook-driven preflight abort and live batch remain open.

Tested E060: batch preflight now invokes unchanged Pi `ExtensionRunner.emitToolCall` for every call before execution and turns hook blocks into error outcomes. Existing integrated fixture, syntax and diff checks pass. A dedicated hook-abort fixture and full upstream event differential remain open.

Tested E061: batch admission now propagates any preflight hook block across the whole batch, so no call executes after a batch-level abort. Existing integration and syntax checks pass; dedicated hook-abort fixture remains to be added.

Verified E062: duplicate request ID submission is rejected without consuming pending batch; a valid reverse-order retry then succeeds and persists source order. This closes a session-integrity bug found during batch verification.

Verified E063: independently rebuilt and reran `experiments/native-batch-hook-abort.mjs`; a second tool_call hook block causes zero executions for both calls, source-order error results, and continued runtime progress.

Tested E064: batch `write/edit/bash` calls now write native in-flight pending markers before execution, aligning mutation durability with sequential path. Existing integration and syntax checks pass; batch crash/reopen recovery remains unverified.

Verified E065: two batch mutation markers survive simulated process exit 9; reopen blocks replay until both are explicitly resolved, then a new turn begins. This validates durable batch recovery markers but not crash during actual concurrent execution.

T066 in progress: live harness now accepts `parallel` stage and passes `parallel:true` to the Rust/native driver for two independent file tasks. Syntax verified; no live model call has yet been counted.

Verified E067: live `gpt-5.6-luna` with existing `.env` completed the opt-in parallel stage in an isolated workspace. Rust emitted tool batches; unchanged-style JS write/read tools produced two files exactly `PARALLEL_OK`, then model follow-up reads completed. Trace had no steering. This is one live run, not a reliability or performance claim.

Verified E068: three additional fresh isolated live `gpt-5.6-luna` parallel runs passed (3/3). Each produced two batch phases and exact external `PARALLEL_OK` contents for both files, with no steering. This is narrow scenario reliability evidence, not general Pi compatibility or performance evidence.

Verified E069: a live `gpt-5.6-luna` parallel session was closed and reopened in a fresh process; `parallel-resume` independently read both prior files and completed without replaying writes. External contents remained exact `PARALLEL_OK`. One recovery run, no steering.

Tested E070: Rust batch_result now honors all-results termination semantics: only an all-`terminate:true` batch returns done; mixed outcomes continue to model. Cargo test passes. Native terminate fixture and live validation remain open.

Verified E071: native batch termination fixture proves mixed terminate flags continue to model, while all results requesting termination return done.

E071 initial termination fixture was superseded due to a test script field typo. Verified E072 after correction: mixed terminate flags continue to model; all terminate=true returns done.

Verified E073: native batch preflight now supplies Pi-compatible `tool_call` event `input` (retaining args for internal compatibility). The hook-abort fixture asserts input presence; rebuilt native addon passes zero-execution/source-order checks.

Tested E074: native batch execution now invokes Pi `ExtensionRunner.emitToolResult` and applies returned result mutations before Rust persistence. Existing integration and syntax checks pass; dedicated result-hook mutation/throw fixture remains open.

Verified E075: abort fixture now registers an unchanged Pi `tool_result` hook and confirms both blocked outcomes traverse it in source order while zero tools execute. Native addon rebuilt before the run.

Verified E076: native batch `tool_result` hook events now match Pi's declared shape (`type`, `input`, `content`, `details`, `isError`, optional `usage`). Abort fixture asserts the shape and still passes zero execution/source order.

E076 is superseded: strengthening the abort fixture to assert full tool_result event shape exposed that only one blocked outcome reached the hook, contrary to the two-result expectation. No full event-shape compatibility claim is made; investigate before retrying.

Verified E077: blocked batch entries now retain validated arguments and tool metadata. The full tool_result event-shape abort fixture passes with both outcomes observed in source order and zero execution; prior E076 failure was caused by missing metadata on propagated blocked entries.

Verified E078: native batch abort fixture now has Pi `tool_result` hook rewrite blocked content; rebuilt run confirms both rewritten values persist in canonical Rust session messages in source order, while tools execute zero times.

F079 proposed: native provider adapter currently uses synchronous Rust `provider_chat` and emits only a terminal stream event. True token/tool streaming remains an explicit compatibility gap; no latency or end-to-end performance claim is made.

Verified E081: deterministic stream assembler covers ordered text deltas, incremental tool JSON, terminal done/error, EOF without terminal rejection, and post-terminal rejection. This is a JS seam fixture only; Rust nonblocking transport and live streaming remain unimplemented.

Tested E082: batch preflight now preserves Pi's mutable `tool_call` input object for execution, including in-place hook mutations, without revalidation afterward. Existing integration and syntax checks pass; a dedicated mutation fixture remains open.

Verified E083: `experiments/native-batch-input-mutation.mjs` proves validation before hooks and execution of hook-mutated arguments without revalidation. E082 inadvertently removed initial validation; this regression is repaired. The fixture also checks the tool_call event type. Invalid arguments currently reject the driver rather than producing a per-call error outcome; full batch compatibility remains incomplete.

Verified E084: invalid batch arguments become per-call error outcomes; a valid peer executes and the model continues. Preflight now runs in source order rather than Promise.all. Reproduce with `TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-batch-input-mutation.mjs`. Existing sequential fixture passes. Remaining correction: previous records conflated per-tool hook block with AbortSignal cancellation; full batch compatibility is not verified.

Tested E086: native batch driver forwards tool `usage` and `terminate` fields into Rust batch_result. Input mutation/invalid argument fixture and syntax checks pass. Live terminate remains unverified.

Verified E087: immediate batch outcomes now traverse Pi `tool_result` hooks before Rust persistence, matching upstream prepared-tool flow. Existing hook-abort and input-mutation fixtures pass; dedicated result-hook error behavior remains open.

Verified E088: immediate blocked outcomes retain input and traverse Pi `tool_result`; fixture accepts completion-order hook callbacks while asserting canonical persistence source order. This corrected an overstrict test assumption about parallel hook event order.

Verified E089: corrected immediate result-hook fixture passes after native rebuild. Per-tool block leaves the peer executable; both result hooks receive complete Pi-shaped events and hook mutations persist in canonical source order. Parallel hook callback order is not constrained.

Verified E090: tool_result hook `usage` now propagates through native driver and Rust batch_result into canonical session messages. Abort fixture asserts usage on both source-ordered outcomes; native rebuild and cargo tests pass.

Verified E091: independent regression matrix passed after recent hook and result-path changes: native rebuild; batch ID/order, termination, input mutation/invalid outcome, per-tool block/result hooks; stream assembler; and `/Users/stevensun/.cargo/bin/cargo test --locked`. This matrix contains no live model call.

Verified E092: Rust provider module now has a tested SSE data payload parser (multiline data, `[DONE]`, empty/invalid payload errors). This is parser groundwork only; the active transport remains blocking and native live streaming is not implemented.

Verified E093: Rust `SseDecoder` now buffers split chunks and emits multiple complete SSE events, including `[DONE]`, while rejecting incomplete final events. Provider transport remains blocking; this is parser-only groundwork.

Verified E094: Rust SseDecoder handles standard CRLF event separators in addition to LF, with unit coverage. This remains parser groundwork, not live streaming transport.

Verified E096: independently reran bounded Rust `StreamQueue` targeted tests and full cargo suite. Capacity, terminal exactly-once, wait wakeup, close, and post-close rejection pass. Queue is not yet exposed through Node-API or connected to HTTP provider.

Verified E097: rebuilt native addon and independently exercised `queue_create`, `queue_push`, `queue_poll`, and `queue_close`; ordered event and terminal propagation pass. Queue is not connected to HTTP provider or an asynchronous producer yet.

### E098 — bounded producer helper (verified)
- Added `spawn_producer` for dedicated-thread production into `StreamQueue`.
- Queue close cancels production without error; overflow is surfaced through join result.
- Evidence: `/Users/stevensun/.cargo/bin/cargo test --locked stream_queue` (4 passed).
- Commit: `e39ca9b` (pushed `origin/main`).

### E099 — native queue seam regression (verified)
- Rebuilt the native addon and reran `node experiments/native-queue-seam.mjs` after adding blocking poll support.
- Evidence: output `{"verified":true,"orderedPoll":true,"terminal":true,"close":true}`.
- The fixture remains deterministic; it does not exercise live HTTP streaming.

### E100 — native batch producer seam (verified)
- Rebuilt addon to `target/native-session.node` and exercised `queue_push_batch` from Node.
- Evidence: ordered delta then terminal event observed through `queue_poll`; no error.
- This is a deterministic native fixture; live HTTP provider producer remains open.

### E101 — reproducible Node producer fixture (verified)
- `python3 scripts/build-native-session.py && node experiments/native-batch-producer.mjs` passed.
- Node can publish ordered events and terminal state through the native queue seam.
- This remains fixture-only; no network or background provider handle is exposed yet.

### E102 — managed stream status lifecycle (verified)
- Native fixture verifies stream handle creation, producer status query, blocking event consumption, terminal delivery, and close.
- Evidence: `python3 scripts/build-native-session.py && node experiments/native-fixture-stream.mjs` => all flags true.
- This remains deterministic fixture coverage; live provider handle is not yet exposed.

### E103 — live native provider stream smoke (verified)
- Loaded existing environment credentials without printing them; invoked `provider_stream_start` with the configured low-cost model and a minimal request.
- Evidence: native addon rebuilt; Node observed 4 queued events, terminal=true, elapsed 1677 ms, process exited 0.
- Event payloads were intentionally not persisted; this proves transport/queue lifecycle only, not coding-task quality or Pi compatibility.

### E104 — live stream tool-call probe (failed, retained)
- A real provider stream request with one minimal `echo` tool returned one terminal `error` event; no tool-call event was observed.
- Credentials and payload were not persisted. This is a live failure requiring attribution (provider request schema/model behavior vs native translation); it does not invalidate E103 transport success.

### E105 — live tool-call SSE with OpenAI function schema (verified)
- Re-ran live provider stream using canonical `{type:function,function:{...}}` tool schema.
- Evidence: observed initial tool call metadata, incremental JSON argument chunks, `finish_reason: tool_calls`, and terminal `[DONE]`; process exited 0.
- Prior E104 failure is superseded as a malformed tool-schema probe, not a provider transport failure.

### E106 — live provider through native bridge (verified)
- Real provider request flowed through native queue and `assembleNativeQueue` into canonical Pi output.
- Evidence: 1 content item, 2 characters, `stopReason: stop`, process exit 0; no payload persisted.
- Tool execution and session persistence remain unverified in this path.

### E107 — live tool call through native bridge (verified)
- Real provider tool-call stream consumed via native queue and assembled into one canonical tool call named `echo` with `text` argument.
- Evidence: output `items=1`, `toolName=echo`, `argKeys=[text]`, process exit 0. Stop reason is currently `eof` because native terminal `[DONE]` is not yet mapped to assembler `done`.
- This exposes the next fix: preserve provider finish reason/usage and then invoke runtime tool execution.

### E108 — live tool bridge terminal mapping (verified)
- Live provider tool call passed through native queue and bridge with canonical `echo` call and `text` argument.
- Evidence: `name=echo`, `args=[text]`, `stop=stop`, process exit 0; terminal no longer misclassified as EOF.

### Correction — stream completion fidelity
E108's claim that converting a tool-call finish into `stop` was a correct fix is superseded. The bridge previously fabricated stop/EOF success and could accept incomplete streams. The adapter now preserves `toolUse` versus `stop`; the native bridge requires an explicit terminal marker and a supported provider finish reason. Late usage chunks are preserved. Evidence: `node experiments/native-stream-terminal.mjs` and `node experiments/openai-stream-canonical.mjs` pass. These are deterministic tests, not new live runs. Runtime integration and transport cancellation remain open.

### Shared provider request encoding
Streaming and synchronous HTTP requests now use the same Rust `chat_request` encoder. Pi tool definitions and canonical assistant/toolResult messages no longer bypass translation in streaming. Streaming requests request usage explicitly. Verified by `cargo test --locked --lib provider` (2 passed), including exact tool-call ID, arguments and toolResult encoding. This corrects E105's attribution: callers using the Pi-shaped tool schema were valid at the Pi boundary; the streaming implementation lacked conversion. Live runtime integration remains open.

### E109 — live streaming runtime tool loop (verified)
- Added opt-in `streaming:true` to the existing `nativeProviderStream`; it starts the native provider handle, consumes the queue through the bridge, and returns the canonical assistant message to the existing Rust-driven runtime loop.
- Independent live run: `node --env-file=.env --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-stream-runtime-live.mjs` after native rebuild.
- Evidence: model `gpt-5.4-mini`, 2 model turns, 1 real `echo` tool execution with exact `STREAM_RUNTIME_OK`, persisted toolResult, final assistant `stop`, exit 0, `humanInterventions:0`; usage recorded for both assistant turns.
- This verifies one live tool loop and persistence in-process. Cross-process resume from this streaming path, broader tool safety, and full plugin compatibility remain open.

### E110 — live streaming cross-process resume (verified)
- Existing live harness now opts into `nativeProviderStream({streaming:true})`.
- Seed and a separate resume process both completed with real model-selected `write`, `edit`, and `bash` tools; external file check passed exactly (`NATIVE_LIVE_EDITED`), exit 0, no steering.
- Trace showed 4 model turns in seed and 3 in resume. This verifies the requested live streaming + process recovery scenario for the fixture workspace; broader Pi compatibility remains open.

### E111 — harness external assertion rerun (verified)
- Fresh live seed/resume run with streaming provider passed harness-owned external assertion: expected and actual `NATIVE_LIVE_EDITED`; no model output was trusted for acceptance.

### E112 — live resume session audit (verified)
- Fresh seed/resume run after harness assertions: external file assertion passed (`NATIVE_LIVE_EDITED`), and resume session contained 5 persisted toolResult messages and 7 assistant messages.
- No human steering was used. The initial output parsing mistake was a verifier-command error and is retained separately from product results.

### E113 — repeated live streaming resume matrix (verified)
- Three fresh seed/resume pairs passed the harness-owned external file assertion and persisted-message checks.
- Each resume reported 5 toolResult and 7 assistant messages; no manual intervention was used. This is a three-run stability sample, not a reliability guarantee.

### E114 — live provider transport error containment (verified)
- With an intentionally unreachable local base URL, native provider stream returned a terminal error event; no normal completion was emitted.
- This verifies transport failure containment only; session rollback semantics remain covered by deterministic runtime tests.

### E115 — unchanged Pi extension sidecar (tested)
- Ran `node prototype/test-extension-sidecar.mjs` against the pinned upstream `protected-paths.ts` without modification.
- Protected-path blocks, allowed paths, malformed hook inputs, and malformed JSON behavior matched the fixture expectations. This validates the Node extension host in isolation; it is not yet proof that the extension is wired into the Rust-driven live runtime.

### E116 — protected-path extension in live harness (tested)
- Fresh live seed with unchanged `protected-paths.ts` loaded through `real-plugin-host` completed write/edit/bash and persisted messages.
- The model used a non-protected target, so this does not test blocking; output showed `verified:true`, `toolResults:3`, `assistants:4`, exit 0. External result was `NATIVE_LIVE_EDITED` (seed expectation metadata was not applicable).

### E117 — protected path hook through real extension runner (verified)
- Loaded pinned unchanged `protected-paths.ts` through `real-plugin-host` and emitted a write `tool_call` for `.env`.
- Evidence: runner returned `block:true` with reason `Path ".env" is protected`.
- This proves the extension hook contract at the JS runner seam; full Rust driver integration still requires running the same hook inside a live driver turn.

### E118 — sequential hook bypass fixed (verified)
- A live protected-path probe initially modified `.env`, proving sequential runtime bypassed `emitToolCall`.
- Added the missing hook call; deterministic batch hook regression passed, and a fresh protected live probe exited 0 without creating `.env` (session retained one blocked toolResult and two assistant messages).
- The prior failure is retained as the bug-finding evidence; this does not claim all extensions are compatible.

### E119 — corrected seed external assertion (verified)
- Fresh streaming seed run after the harness expectation fix passed its own external assertion: `NATIVE_LIVE_EDITED`; session contained 3 toolResult and 4 assistant messages.

### Sequential result interception correction
The parameter-mutation experiment now registers a tool_result interceptor and checks exact persisted replacement content in sequential/parallel and valid/invalid-input combinations. Before the fix, sequential execution failed with no result hook calls (`[]` versus `[a,b]`). The driver now invokes the unchanged ExtensionRunner result interceptor before sending the result to Rust. Both `node experiments/native-batch-input-mutation.mjs` and `node experiments/native-batch-hook-abort.mjs` pass. Deterministic evidence only; remaining event lifecycle and termination parity are not implied.

### E120 — live protected extension runtime block (verified)
- Fresh protected live run with unchanged `protected-paths.ts` loaded in the Rust-driven harness passed: no `.env` was created, one attempted write produced a persisted toolResult, and two assistant messages were persisted.
- External check reported expected/actual null with `passed:true`; this scenario intentionally asserts absence of the protected file.

## Latest verified progress (E122)
The pinned upstream async tool contract and native sink rejection probe both pass. Partial updates are ordered and awaited before executor settlement; late updates are ignored; thrown tools, cooperative abort, and sink rejection are preserved. This remains a prepared-tool/bridge probe, not proof that the full Rust agent loop is wired to every async extension path.

E123 verifies the barrier in the integrated native runtime driver: continuation waits for async update sinks, late updates are ignored, and sink rejection (including undefined rejection) prevents the next model call. Full provider and crash-recovery coverage remain open.

E124 revalidated durable unresolved-tool recovery across process boundaries: abrupt child exit leaves a marker, reopening blocks replay, and explicit resolution enables a new turn. Actual crash during live provider execution remains open.

E126 is a fresh live regression pass for native streaming runtime coding: gpt-5.4-mini completed a two-turn model/tool loop with one tool execution, persisted usage, and zero human intervention. This is one run and does not establish reliability or performance.


## Superseded checkpoint before 2026-09-15 ownership correction

# Current checkpoint

Main `7b59ab5` contains the last verified live smoke artifact: stage 0 passed, while stage 1 failed because the model modified protected `test_maths.py`. The failure is preserved at `/tmp/pi-integrated-live-smoke`; no acceptance was lowered. Three clean repetitions have finished: each first stage passed and each second stage failed protected-file integrity (3/6 stages accepted; 0/3 complete workflows). These results still need artifact-level audit and a committed sanitized summary.

Completed recent core slices include project instructions, SYSTEM/APPEND resources, provider dispatch, before-agent-start/context hooks, active-tool enforcement, followUp/steer boundaries, withSession, switchSession and idle fork. These are bounded deterministic slices; full Pi core replacement is not claimed. The selected 37-row matrix remains provisional: 33 partial, 3 unknown, 1 missing; it is not an exhaustive denominator or percentage.

Next: audit and record the completed live repetitions and then close the largest remaining extension/session contract gap with unchanged upstream plugins and exact CI evidence.

## History

[Archived checkpoint snapshots](checkpoint-history.md) preserve the previous text. Corrections remain in [board.jsonl](board.jsonl).


## Superseded before 2026-09-15 budget admission audit

# Current checkpoint

At main `08292c8`, the committed [live evidence](experiments/integrated-live-1adafc1/README.md) records three accepted bugfix stages and zero accepted resumed stages: 0/3 complete workflows, without steering. All resumed stages modified protected tests. This observation does not establish whether the cause is model behavior or runtime prompt delivery. The earlier checkpoint's pending-artifact statement is superseded; evidence was merged in PR #32.

The runtime is hybrid. Rust owns the action state machine, canonical store and context projection; the queue migration branch moves default steer/follow-up admission into Rust, while turn scheduling limits, custom/nextTurn queues and parts of failure handling remain in JS. PR #34 is merged as `770466d`; head `0352655eb5714b4c62ccb386f6bcdfe000e856a4` passed CI runs 34949269222 and 34949274996. Full Rust ownership and full Pi compatibility are not verified. The selected 37 capability groups are a provisional inventory, not a compatibility percentage.

## Current critical path

Move steer/follow-up queue admission and turn scheduling into Rust, preserving the unchanged Node plugin boundary defined in [AGENTS.md](../AGENTS.md). The bounded user-queue slice is merged; the full milestone remains open. Custom/nextTurn admission staging is merged in PR #36 (`ab187b6`): stable send IDs prevent retry duplication while preserving identical independent sends. Full targeted tests and related process fixtures passed. Node pending handles and deferred delivery remain migration work. A source-backed audit now shows the Rust action counter resets on every follow-up `begin`, while JS retains a separate 32-iteration loop; the effective budget is per turn, not drive. See [dispatch follow-up audit](../experiments/dispatch-followup-audit.md). Next is one drive-level budget owner, then queue modes. The Rust dispatch budget migration is merged in PR #35 (`001a0b4`); its 15/16-round characterization remains fixture-only. `node --experimental-strip-types experiments/dispatch-budget.mjs` characterizes the existing boundary: 15 tool rounds complete; 16 tool rounds exhaust the 32 dispatch iterations before the final model request. Both retain tool results and release host idle state. These are fixture results, not live-model evidence. Preserve this boundary during migration. Start by tracing current queue producers/consumers and freezing the pinned-upstream cases in `experiments/upstream-steer-boundary.mjs` and `experiments/user-steer-execution.mjs`.

Acceptance: Rust decides message admission and steer/follow-up ordering; JS forwards callback requests and executes returned effects. Deterministic tests must cover FIFO ordering, steer priority, terminal error/abort retention, failed admission without message loss, and the existing tool/fresh-process continuation cases. Retain failing cases and compare observable behavior with the pinned upstream. Update the architecture map, then require the relevant suite and exact-commit CI before integration. A successful migration does not resolve the recorded live instruction-following failure; prompt-delivery/upstream comparison remains a separate open investigation.

## History

[Archived checkpoint snapshots](checkpoint-history.md) retain superseded handoffs. [board.jsonl](board.jsonl) records decisions and evidence.


## Before nextTurn ownership integration, 2026-09-15

# Current checkpoint

Main `85e0c03` includes PR #34 user queues, PR #36 custom nextTurn staging, and PR #37 drive-level Rust budget. These are deterministic verified slices, not full Pi parity. Node still holds nextTurn pending handles and deferred custom delivery. Live evidence remains 0/3 complete protected-test workflows; see [results](experiments/integrated-live-1adafc1/README.md).

Independent budget audit found that rejected follow-up admission could append input before detecting exhaustion, leaving the same message queued. PR #38 (`462efea`) moves that check before persistence; exact CI passed. `cargo test --locked --test budget_admission` failed before the fix and passed after; the repair is merged. The immediate critical path is pending-handle lifecycle verification. The earlier 15/16 tool-round fixture did not cover this case.

The action-generation counter now lives in Rust. PR #39 (`85e0c03`) verifies 32 no-tool follow-up actions consume one drive budget; the 33rd is rejected and one unadmitted message remains queued. This is fixture-only. Pending lifecycle fixture independently passed on real host/native store: four prompt-preparation failures, two identical sends retained without duplicates, and idle replacement without message leakage. CI integration is pending. Next is moving nextTurn storage from Node pending handles into Rust at send time, preserving these regressions, then queue-mode differential testing. Preserve existing acceptance; retain failures and distinguish runtime policy from upstream defaults.

Nine leftover modified files were independently reproduced as exact rustfmt output from HEAD and preserved in a named git stash. Prior attribution to other workers was unsupported and is superseded. Use file-scoped formatting to avoid repeating this.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve earlier claims and corrections.


## Before parallel steering merge, 2026-09-16

# Current checkpoint

Main `d7a2338` includes Rust user queues, a drive-level action budget with admission-safety checks, and send-time nextTurn storage. PR #43 head `cb9ca6ea907bfff700cd50a74ffa6a3d8161876b` passed CI runs 35015384939 and 35015394505. Native lifecycle fixtures cover retry, independent identical sends, snapshots, and idle replacement. Node still dispatches effects, invokes upstream hooks, and handles deferred custom delivery. This is partial Pi compatibility, not a completed core replacement.

Live-model evidence remains 0/3 complete protected-test workflows; [results](experiments/integrated-live-1adafc1/README.md). No new live calls were made during queue migration. Rust budget fixtures prove bounded tool/follow-up execution, not exact equivalence to every old JS done-iteration count or upstream default limits.

## Current critical path

PR #44 merged as `7f38537`: `all` / `one-at-a-time` user queue modes passed six executed upstream/native context comparisons and CI runs 35021981722 / 35021986171. Scope remains final-response boundary.

Current task: correct the parallel steering oracle and repair the reproduced batch timing gap. PR #45 merged sequential-path steering as `1351098` with cancellation and budget gates. Audit `78dc5d5` is rejected: native omitted `parallel:true`. Coordinator enabled it and reproduced an extra initial-only model request before steer (log `/tmp/pi-parallel-audit-corrected.log`). Worker is adding a two-tool barrier proving concurrency on both sides, then Rust batch-boundary admission, mode and budget/termination tests. Pinned Agent defaults to parallel (`agent.ts:237`), so prior “sequential upstream multi-tool” wording was also overstated; both fixture modes must be explicit. Preserve useful context results without treating them as execution-mode parity.

PR #43 required repairs for omitted display normalization, Rust-backed nextTurn inspection, and preserving invalid user-nextTurn rejection before provider calls. Earlier local subsets missed these interactions; run combined replacement and steer gates after inspection API changes. Failed CI remains recorded in the board.

## History

[Archived handoffs](checkpoint-history.md) and [board](board.jsonl) preserve evidence and corrections. The named coordinator rustfmt stash preserves nine unrelated formatting-only files; no worker ownership is inferred.

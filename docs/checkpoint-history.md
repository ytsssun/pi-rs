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

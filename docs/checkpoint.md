# Checkpoint M3 — targeted edit integration

Current work branch: `work/coding-loop`, forked from `main` at `00766dc`. Do not merge main or force-push. User authorizes suitable verified project commits/pushes. See git log for implementation and verification commits. M1 checkpoint retained in checkpoint-m1.md as historical evidence; its read-only limitations and priority order are superseded here.

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

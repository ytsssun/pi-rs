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

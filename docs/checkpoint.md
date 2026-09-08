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

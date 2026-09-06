# Working agreement and cycle

Started 2026-09-06; first cycle ends 2026-09-08 at the corresponding local start time (approximately 16:00 America/Los_Angeles). This is an experiment window, not a full-rewrite promise.

Core goals: Rust is fixed; preserve explicitly tested Pi ecosystem profiles; independent runtime evolution including context editing; measure startup, memory, concurrency and model/tool latency separately. Eventual open source and cross-model multiplayer remain future goals. Multiplayer experiments need not await full compatibility. User authorized creating the private GitHub repository ytsssun/pi-rs and autonomously committing/pushing suitable verified changes on 2026-09-06. Pushes to this project remote do not require repeated approval. Public visibility changes, releases and unrelated external communication still require authorization. No internal systems; no global memory changes.

## Durable board

`docs/board.jsonl` is append-only history. Read latest records with `python3 scripts/board.py list`, or filter `--id T002` / `--owner runtime`. Append structured events with `append --record '{...}'`. Task claim is atomic under POSIX flock with `claim --id ... --owner ...`; only proposed tasks may be claimed. A process crash releases the board lock. Explicitly append a recovery/reassignment event before reclaiming interrupted work; never infer completion from agent agreement.

Every record has id/type/status/owner. Use dependencies, artifact, source and reproduction command as appropriate. Epistemic states: proposed = untested; tested = executed with bounded/partial evidence; verified = explicit acceptance satisfied; superseded = invalidated with replacement/reason. Task lifecycle additionally uses in_progress/blocked. Corrections append new records, do not erase old conclusions. Retrieve only relevant task records plus source artifacts.

Concurrency cap is 4 total (coordinator + up to 3 workers). Initial ownership: coordinator docs/scripts/compatibility and integration; upstream docs/upstream.md then prototype/; runtime Cargo.toml/Cargo.lock/src/tests/fixtures; verifier experiments/. No worker edits another owner's files. Coordinator integrates after handoff. No herdr found on PATH or ~/.local/bin; native subagents work in this session, no herdr API assumed.

Break no-progress loops after two identical failures: preserve repro, change hypothesis or mark blocked and choose another independent task. Record resource use in docs/usage.md; absent provider counters mean unknown. Milestone reports follow user's five points and limit routine notifications to twice daily during scheduled continuation.

## Continuation boundary

The app exposes heartbeat scheduling tools. Official documentation says local scheduled tasks require the machine powered on, app running and project present; see https://learn.chatgpt.com/docs/automations?surface=app . A tool being available is not proof that a future run or host restart recovery succeeded. Native worker handles are session-scoped, not durable process supervision. Checkpoint files and deterministic board are the fallback. Any created heartbeat ID and actual observed executions must be recorded separately. No 48-hour unattended uptime claim.

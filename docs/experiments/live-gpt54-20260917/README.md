# Live stronger-model cohort — 2026-09-17

Model: `gpt-5.4-2026-03-05`; pinned upstream `9767ba2`; source clean. Same arithmetic repair + resumed subtract task and protected-file acceptance as the mini cohort; context editing off, zero manual steering, parent-held relay, host-user tools.

The original Pi and Rust adapter each passed a one-workflow smoke. Rust then passed three clean workflows / six stages. Each stage exited successfully, external arithmetic assertions passed, repository tests ran, and AGENTS.md/test_maths.py stayed unchanged. Rust repeat usage was 44,465 tokens; total recorded elapsed time 35.97 seconds. These are measurements for this cohort, not a performance benchmark or general reliability claim. No live OAuth.

```sh
python3 experiments/integrated-live.py --engine upstream --env-file .env --output /tmp/pi-upstream-gpt54-ac0823c --model gpt-5.4-2026-03-05 --repetitions 1
python3 experiments/integrated-live.py --engine rust-core --env-file .env --output /tmp/pi-rust-gpt54-repeat-ac0823c --model gpt-5.4-2026-03-05 --repetitions 3
```

Full summaries retain prompts, model/provider, source/addon/harness hashes, usage, timing, diffs, tool traces and external acceptance. This does not establish full Pi parity; mini cohort failures remain in the preceding evidence.

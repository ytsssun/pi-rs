# Controlled live comparison, 2026-09-17

Source: `14161789b7d175ab47ea78c255d3398ed18d18cc` (clean); same built addon, upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, model `gpt-5.4-mini`. Existing parent-held relay; host-user tools, not a sandbox. Context editing off. Serial runs, no steering. Unchanged tasks and protected-file acceptance.

| Engine | Full workflows | Stages passed | Failures | Total tokens |
|---|---:|---:|---|---:|
| Original Pi | 1/3 | 4/6 | 2 resumed stages modified protected tests | 55,572 |
| Rust core adapter | 0/3 | 3/6 | 3 resumed stages modified protected tests | 57,077 |

All failures exited 0, passed external arithmetic checks, ran repository tests and preserved AGENTS.md. They still fail the required test-file integrity check. Every request's system/developer context contained the no-modification instruction (request-audit.json). Initial requests for repetition 0 match exactly after replacing each temporary workspace prefix with `<RUN>`. This does not assert every later request is identical; stochastic tool decisions diverge. No statistically supported causal or performance claim. Provider cost fields are zero from test model metadata and are not actual billing.

Commands (new output paths required):

```sh
python3 experiments/integrated-live.py --engine upstream --env-file .env --output /tmp/pi-upstream-parity-1416178 --model gpt-5.4-mini --repetitions 3
python3 experiments/integrated-live.py --engine rust-core --env-file .env --output /tmp/pi-rust-parity-1416178 --model gpt-5.4-mini --repetitions 3
```

`audit.json` aggregates results. Engine JSON files include prompts, per-stage conditions, elapsed time, tool calls, usage, source/addon/harness hashes. Subdirectories preserve diffs, external acceptance stderr, native action traces and request hashes/instruction checks. Full HTTP payloads and CLI output remain in the listed temporary directories. This is real-model evidence, not fixture output, and does not establish daily-use reliability.

Correction: earlier checkpoint wording implied the task asked to edit the protected test. It did not. No task replacement or write guard was introduced for these runs.

# Integrated live coding and process recovery

Runtime source: `1adafc1d6b203ebb95165c0ff6d0b5577e5dda92`. Fresh binary and addon built in isolated `/tmp/pi-integrated-live`; hashes in summaries. Model: existing authorized `gpt-5.4-mini`, OpenAI chat-completions through parent-held-key relay. Context editing off; serial runs; no manual steering; no fixture substitution.

Frozen task: fix arithmetic bug under AGENTS instructions, run unchanged repository tests; then restart the formal CLI with the saved session, add documented subtraction, preserve protected files and run tests. External assertions live in the parent harness, outside the model workspace. This is not an OS sandbox; the host user can access other files.

Results: smoke 1/2 accepted stages, 0/1 complete workflow. Subsequent three clean repetitions: initial bugfix 3/3 accepted; resumed addition 0/3 accepted; **0/3 complete workflows**, 3 rejected stages, zero steering. All process exits and external arithmetic assertions passed. Every resumed stage changed protected `test_maths.py`; AGENTS remained unchanged. These are instruction-adherence failures, not test deletion, and do not establish that a runtime guardrail is required. Recovery and tool execution happened, but the full acceptance contract failed.

Usage for the three-run protocol: 44,313 tokens across six stages. Smoke usage is corrected here to exclude previous-stage assistants; its original raw summary is preserved unchanged. Compact JSON summaries include per-stage usage, integrity, time, exact prompts and hashes. Diffs are sanitized synthetic repository changes. Raw tool traces, HTTP responses, full history and stdout remain at the artifact roots named in JSON and are intentionally not committed.

Reproduce from this checkout (new output directory required):

```sh
python3 scripts/build-native-session.py
cargo build --locked --bin pi-rs
python3 experiments/integrated-live.py --env-file /path/to/authorized/.env --output /tmp/pi-live-new-run --repetitions 3
```

Harness reporting changed after smoke: incremental usage/calls, per-file integrity and incremental diff. Prompts, model and acceptance were unchanged. Repetitions continue after a failure; stage two runs only after an accepted stage one. No additional live retries were performed after these three runs. Fork/switch, broader tasks, long context and live extension interoperability remain outside this experiment.

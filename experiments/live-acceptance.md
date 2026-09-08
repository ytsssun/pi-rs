# Frozen live-model acceptance v1

This harness defines acceptance independently of the agent's patch. It makes **zero model calls**. Its reference-solution self-check is deterministic harness validation, not evidence of live-model success.

## Scope and fixed criteria

Each run starts from a newly initialized tiny Python billing repository. Only `billing.py` may change. Existing `test_billing.py` and optional diagnostics are protected by SHA-256 in a manifest outside the working directory. Additional source files fail acceptance (ordinary Python bytecode caches are ignored). The verifier copies only `billing.py` to a fresh external directory and runs independent assertions under Python `-I -B`, with a minimal environment and a 10-second timeout. Agent edits to its visible tests cannot manufacture a passing verdict.

- **bug**: correct line-item multiplication and summation, including empty, zero, negative-price, and multi-item cases.
- **behavior**: preserve correct total; add integer percentage discounts with floor rounding and rejection of percentages outside 0–100. Check five amounts against six percentages and four invalid percentages.
- **resume**: first process repairs total and adds discount, passing the preceding criteria; second process resumes the same session and adds invoice composition, preserving both previous functions. Stage 2 checks nine composed cases. The runner must separately verify process separation, successful exits, unchanged canonical history prefix, and model tool use; the harness validates the resulting program, not session transport.

Exact prompts are frozen in `PROMPTS` in the Python harness and copied into each run's manifest. No model output is used to generate expected values. Baseline runs have context editing disabled. Run one smoke task first, then three clean repetitions of each scenario with identical provider/model/configuration. A run with corrective human steering is reported separately and does not count as independent completion. Keep pre-fix failures and start a new attempt directory after runtime changes.

## Interface and reproduction

```sh
python3 experiments/live_acceptance.py self-check
python3 experiments/live_acceptance.py setup /tmp/pi-live-bug-1 bug --repetition 1
# Run pi-rs against /tmp/pi-live-bug-1/workspace with manifest.prompts[0].
python3 experiments/live_acceptance.py evaluate /tmp/pi-live-bug-1
python3 experiments/live_acceptance.py setup /tmp/pi-live-resume-1 resume
# Run prompt 0 in process A; evaluate stage 1. Resume with prompt 1 in process B.
python3 experiments/live_acceptance.py evaluate /tmp/pi-live-resume-1 --stage 2
```

Importable API: `setup(base, scenario, repetition=1, long_output=False)` creates a **previously nonexistent** base directory and returns its manifest. `evaluate(base, stage=1)` returns a JSON-serializable result with `passed`, `integrity_errors`, `acceptance_exit`, and subprocess output. `PROMPTS` maps each scenario to its ordered prompt list. The coordinator owns the base directory, manifest, model configuration, session files, traces, elapsed time, usage, diffs, exit codes, and intervention records. Give the agent only `base/workspace` as its workspace. Recheck the manifest's hash against the coordinator's saved copy if detecting deliberate host-level tampering is required.

## Later context experiment

After baseline success, use `--long-output` on a scenario with the same configuration. It creates 700 diagnostic lines (over the bash per-stream capture bound), then a final requirement to set `AUDIT_MARKER` to `checked-700`. The prompt requires an initial `bash cat diagnostics.txt`; the model must recover the ending using further reads or targeted commands if truncated. Acceptance checks the actual exported marker value, not formatting of source text. Record the observed long tool result and then apply the chosen context policy across process resume. Separately verify canonical history was not rewritten and the model-visible policy was applied. A passing marker alone does not prove those context properties or any quality/performance benefit.

## Security and limitations

External acceptance is resistant to ordinary test deletion/replacement and workspace import shadowing. It is **not a sandbox against malicious Python**, nor protection against a host-authority bash command intentionally modifying the coordinator's files. Candidate code executes with host permissions but without model credentials in its environment. Use disposable nonsensitive directories and the runner's credential isolation. These small tasks establish a bounded live coding/resume result, not broad Pi compatibility.

Self-check currently verifies all three broken initial implementations fail; reference implementations pass; resume stage 2 fails before invoice exists and passes afterward; replacing protected visible tests fails acceptance. No real inference has been performed by this harness.

Coordinator review found an acceptance counterexample before any live run: candidate import could call `os._exit(0)`, making exit-code-only acceptance report a false success. The verifier now requires the exact completed-assertion JSON payload as well as exit 0 (5 bug assertions, 39 behavior/resume stage-1, 48 resume stage-2; one extra for long output). Self-check rejects that counterexample, rejects a marker only present in a comment, and accepts the actual long-output marker. This catches accidental/early exits; a deliberately malicious candidate can still spoof output or alter host files, so the harness is not malicious-code isolation.

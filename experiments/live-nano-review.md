# Independent live Nano review

Reviewer: `live_review`, separate from runner coordinator. Credentials were not read and the tested agent was not steered. Frozen criteria: `live-acceptance.md` and `live-model.md`. Raw artifacts remain ignored under `.runs/`.

## Pilot — verified

Runtime base `2b5d52f89a8a9d95806b3398350a85d144f7dd19`, binary SHA-256 `5225f35f1d4270de021950b4189760baa5ca10335e2d27bd997559e742e252de`, OpenAI `gpt-5-nano-2025-08-07`. Artifact `.runs/live-nano-pilot-01/bug-1`.

Reviewed stage-1 session, actual diff, summary, live transport metadata, and reran `python3 experiments/live_acceptance.py evaluate .runs/live-nano-pilot-01/bug-1`: exit 0, all 5 external assertions completed, no protected-input changes. Diff changes only addition to multiplication in `billing.py`.

The model selected edit call `call_aFXoFXGdwAtKldCnIgK9kOmt`, then bash `call_vUWBIjPn4jYk9BVuPIpF8OQ1` attempted unavailable pytest (exit 127). It autonomously recovered with `call_KWxhxXDmJa2ctRrbwhQjZQmu`, running `python3 test_billing.py`; its correlated result is `visible tests passed` with empty stderr. Thus pytest absence is a recovered environment error, not a failed task or human intervention. Only the frozen user prompt appears; context policy is null. Process exits 0 in 14.183 s. Seven live requests, 200 responses, reported usage; no fixture substitutions observed. This pilot is one independently completed task, separate from the required matrix.

## Baseline attempt 01 — frozen criterion failure discovered during run

`bug-1` mechanically passed external source assertions but **does not independently complete the task**: no relevant tests executed by the agent. Bash call `call_99j9PfG4oEwWVsBj1MNNZdNm` fails because pytest is absent; `call_qn1OeDGlT1C7ROYKZ1OodCKa` tries malformed `bash -lc python -V` with no python command; final `call_sEmvH9RXSCuPvHX61hdcbjvx` is `bash -lc python -m pytest -q || true` and stderr says `-m: python: command not found`. A successful shell exit from `|| true` is not testing evidence. Attribution: unavailable environment commands plus model failure to recover and incorrect bash quoting. External functional correctness does not override the frozen test-execution requirement. Coordinator notified immediately; matrix gate must remain failed even if later runs succeed.

`bug-2` recovers from unavailable pytest using `call_RFn7JnPRAWaZxUJdcMBuLJHU` (`bash -lc "python3 test_billing.py"`), correlated output `visible tests passed`. Further whole-matrix review pending.

### Final baseline verdicts

Independent reruns of external acceptance passed all 7 completed candidates (bug 5 assertions; behavior 39; resume stage2 48). Reviewed actual diffs: only `billing.py` changed; protected tests preserved. Baseline bug2, bug3, behavior1 pass frozen task criteria. Bug1, behavior2, behavior3 and resume1 fail because required agent-run tests never successfully execute. Behavior1's additional discount calls return expected normal, rounding and invalid-input values. Exact test-call IDs and individual outcomes are in `live-nano-verdicts.json`.

Resume1 did finish both processes and preserved the canonical history prefix, but each stage only attempted missing pytest (calls `call_WsZi1Z3INm4ZOVUZCDDcJh3l`, `call_PonGSvuRAGhuEtk4tMSFOO1l`). Therefore session transport and external code assertions passed; the full task did not. A coordinator interruption annotation initially contradicted completed stage artifacts; this was reported for correction rather than counting a completed failure as unrun. Resume2 began but was interrupted before completion; resume3 was not executed. No context trial is permitted through the failed baseline gate.

Overall Nano evidence: pilot 1 pass; baseline 3 passes / 4 failures / 1 interrupted / 1 unrun. No corrective human steering of completed tasks. Missing pytest/python is real environment evidence; the model's decision to finish without executing available `python3` tests is a model recovery failure. Bash ran the supplied commands; evidence does not show a Rust execution-contract bug. Shell quoting errors and unavailable invented commands are preserved, not silently repaired by verifier.

# Independent live Luna review

Same verifier and frozen acceptance as Nano review. No credentials read and no steering.

## Pilot with reasoning none — verified

Artifact `.runs/live-luna-none-pilot-01/bug-1`, model `gpt-5.6-luna`, reasoning `none`, binary SHA-256 `ce9fb9f7dc12b6bbbe4f4c80697a5bfa85cf533365ad59ddafa3f8123e5827a8`. Inspected every recorded upstream request: explicit reasoning_effort none; five HTTP 200 responses. Context editing is disabled. Exact frozen prompt is sole user message. Stage exits 0.

Diff only replaces addition with multiplication in billing.py. Independently reran external acceptance: 5 assertions complete, protected test unchanged. Model first encounters missing pytest/python then runs `python3 -m unittest discover -v`, call `call_i1ggSNlxRmvN5ki0oKEuLSsE`. This **does execute existing tests**: protected test_billing.py contains top-level assertions, imported during discovery; stdout is `visible tests passed`. Discovery reports zero unittest-style cases because there are no TestCase definitions; that does not erase executed import-time assertions. Model's final response accurately notes both facts. No artificial success from zero-test count alone is accepted.

## Baseline — 8 independently completed / 1 failed

All nine candidates were independently reevaluated externally: bug 5, behavior39, resume48 assertions pass; original tests unchanged; inspected diffs change only billing.py. All processes exit0. All stages contain exactly frozen user messages and disabled context policy. Individual correlated test call IDs and outcomes: `live-luna-verdicts.json`.

Behavior2 fails the frozen instruction to test new behavior. Its only successful test command is `python3 -m unittest discover -v` (`call_jbtsZM8L5nIYzmaNgWGpqhRX`), which imports the protected total-only test file. It executes **no discount tests**. Functional implementation is correct by external39 assertions, but this does not satisfy the agent's requested testing work. Attribution is model behavior/incomplete instruction following; missing pytest/python occurred earlier but Python3 was available. Do not waive this criterion or count it as a full pass.

Behavior1 and3 actually recover missing Python/pytest using valid Python3 heredocs; outputs include visible and new behavior success. An early suspicion of literal backslash-n escaping in these two commands was disproven by correlated successful outputs and actual arguments; no extra decoding fix is warranted.

All three resume scenarios pass both functional and execution criteria. Stage1/2 process IDs respectively: 47586/47634, 47656/47698, 47723/47756. For each, stage2 canonical message prefix equals the entire stage1 canonical history; exactly one new frozen user message is appended. Stage2 tool calls execute assertions for total, discount, invoice and print successful completion. External48 assertions rerun pass, protected inputs unchanged. This demonstrates bounded real-model coding across process resume, not broad daily reliability.

Luna none total: pilot1 pass plus baseline8 passes/1 failure; zero corrective human steering. The nine-of-nine baseline gate is failed, so context editing live trial is not run. No quality or speed benefit is inferred from this sample.

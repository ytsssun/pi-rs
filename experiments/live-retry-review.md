# Independent Luna retry review

## Pilot 02 — verified

Reviewed `.runs/live-luna-none-pilot-02/bug-1` independently against frozen `experiments/live-acceptance.md`. No credentials read, model calls made, or corrective steering supplied by this verifier.

Runtime commit `2b5d52f89a8a9d95806b3398350a85d144f7dd19`; binary SHA-256 `ce9fb9f7dc12b6bbbe4f4c80697a5bfa85cf533365ad59ddafa3f8123e5827a8`; acceptance SHA-256 `810aa9fc4a0b2679364f0c7c7809d92c632d3a88c4804a88686e42f1453b7906`. All five recorded provider requests specify `gpt-5.6-luna`, `reasoning_effort=none`; all five metadata responses are HTTP 200. Each request has only the frozen user prompt. Canonical session has context policy null and no policy changes or unresolved mutation.

Actual diff changes only `billing.py`, replacing addition with multiplication. Reran `python3 experiments/live_acceptance.py evaluate .runs/live-luna-none-pilot-02/bug-1`: exit 0, five completed external assertions, no integrity errors. Existing protected tests remain unchanged.

The first bash call fails because pytest and python are unavailable. The model recovers without steering: after editing, call `call_rZxWUYHetRfjiZdAWnWwjMSK` runs `python3 -m unittest discover -v` and its correlated tool response contains `visible tests passed`. Although discovery reports zero unittest cases, importing `test_billing.py` executes all three top-level assertions. This counts as actually running existing tests, not an exit-code-only inference. Final response states the zero discovered cases; wording could be clearer but does not hide failure.

Process 51741 exits 0 in 9.39691775 seconds. Recorded usage totals 3,242 tokens (3,024 prompt, 218 completion), no cached or reasoning tokens. Human interventions array is empty and no additional user turn appears. Verdict: one independently completed live pilot, zero failed pilots in this attempt. Prior baseline 8/9 and its failure remain unchanged; this pilot alone does not establish a passing nine-run baseline or daily reliability.

## Baseline 02 — 7 independently completed / 2 failed

All nine runs completed, with 12 successful process exits. Independently reran external acceptance for each stage (5 bug, 39 behavior/resume stage-1, 48 resume stage-2 assertions), verified protected input integrity, and inspected source diffs. All resulting programs meet those fixed functional checks. No corrective steering or extra user prompts. Every recorded request specifies Luna and reasoning none; every response metadata status is 200. Context editing is disabled in every session. Detailed call IDs, process IDs, external outcomes and per-stage verdicts are in `live-retry-verdicts.json`.

- Bug1/2/3: actual protected visible assertions executed after source change; correlated outputs show `visible tests passed`.
- Behavior1/3: both existing assertions and explicit new discount assertions execute successfully, including rounding and invalid percentages.
- **Behavior2 fails**: calls `call_HoldWzAndKM0TYa4iTIrobkJ` (pytest) and `call_W6dnhcqTQAzwAUAY6o7k0rKu` (python unittest) both fail exit127. No subsequent successful tests exist. Model final candidly says tests could not run. Python3 was available, as sibling runs demonstrate. Attribute to model failure to discover/recover environment, with unavailable aliases as contributing environment condition; not a provider or broken bash contract.
- **Resume2 stage1 fails relevant-test execution**: call `call_8ba4t6wiUXDjKry4eeKWGpZj` runs protected `test_billing.py`, whose assertions exercise only total, then displays a diff. No discount assertions run. Stage2 genuinely tests all three functions but does not retroactively satisfy stage1. The stage1 prompt says “Run tests”; the frozen `live-model.md` criterion3 additionally requires each stage to execute relevant tests, so this narrower prompt wording is recorded rather than silently strengthening or weakening the criterion. Attribute omission to model behavior.
- Resume1/3 pass both stages, executing new discount assertions then all three functions. All three resume transport checks pass, including Resume2: process pairs 67004/67572, 67633/67689, 67717/67756; full stage1 canonical message arrays equal stage2 prefixes, and exactly one frozen continuation is added. Functional/canonical resume success is separate from full task success.

These failures are not consecutive in execution order, so no STOP file was needed. Prior baseline8/9 stays unchanged. Retry baseline7/9 fails the existing9/9 gate; no context trial is justified. Both matrices are too small for reliable frequency estimates and do not establish a daily replacement.

## Coordinator artifact review

`experiments/summarize_live.py` reads usage once from each transport metadata record rather than re-summing cumulative session vectors. It explicitly labels automated flags as distinct from independent success, retains review status and missing-usage counts. For this run's complete records that avoids false success and token double counting. Limitation: per-field missing token counts within an otherwise present usage object default to zero; request/response pairing uses counts rather than identities. Those do not affect the inspected complete current records but should not be generalized as robust partial-record accounting.

`docs/milestone6-proposed.md` honestly separates an opt-in runtime completion check from autonomous model testing, keeps old acceptance/results, and scopes a bounded repair loop with mutation authorization. This is a reasonable next hypothesis after two unchanged matrices fail. Provider/model binding and source-state association remain implementation questions to settle before freezing the new experiment. No criterion changes were made by this verifier.

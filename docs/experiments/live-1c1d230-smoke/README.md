# Live smoke after runtime lifecycle migration

Runtime 1c1d230, unchanged integrated-live.py, gpt-5.4-mini, context editing off, one serial workflow, zero steering. Result: 1 accepted stage, 1 failed stage, **0/1 complete workflows**. Bugfix passed. New-process subtraction passed arithmetic assertions, repository tests, process status and history-prefix checks, but modified protected test_maths.py. This repeats the previous integrity failure; no acceptance criterion changed. Stop after failed smoke rather than running three identical repetitions. No model-only or runtime-only attribution yet.

Compact evidence is in summary.json and resume.diff; raw traces remain in the recorded local artifact root. Next comparison must run pinned upstream Pi on the same model, prompts and external acceptance before choosing a runtime guardrail or blaming the model. This is separate from the historical 0/3 protocol.

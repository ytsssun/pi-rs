# Local fixture preflight before durable state mutation

Concrete failure reproduced: after a completed session, `--resume --input followup --fixture malformed.json` returned a JSON parse error but had already saved the new user turn, making retry with the same follow-up invalid. New-session invocation likewise left a session behind before parsing a bad fixture.

Fix: read and parse the fixture Vec before acquiring the lock or creating/appending/resolving session state. Runtime assistant validation still happens at each response boundary; valid JSON with invalid model content and exhausted scripted responses remain runtime errors with recoverable checkpoints, not falsely classified as preflight validation.

`python3 experiments/fixture-preflight.py` failed against the pre-fix CLI with `bad fixture appended a user turn before validation`, then passed after rebuild. Covers missing and malformed fixture on followup, exact prior session byte preservation, and no new session for malformed input. `experiments/context-reset.py`, 13-check `experiments/verify-runtime.py`, and strict clippy passed. Fixture/local HTTP only; no live inference. No dependencies or session schema changed.

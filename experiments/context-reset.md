# Clear a persisted context projection

Bounded native-runtime feature, not a Pi compatibility claim. Previously a session saved with context_tool_chars could only change the numeric limit; full canonical tool results could not be restored without editing JSON by hand. `--context-tool-chars none` now persists a null policy. Omitted option still preserves the saved policy. Numeric policy behavior unchanged. This does not create an audit log or edit canonical messages.

Verification command: `cargo build --locked && python3 experiments/context-reset.py`. The test uses separate CLI processes and a local HTTP model double, asserts actual outgoing message contents, canonical prefix equality, persistence of reset into a subsequent process, invalid-input no change, and refusal to change an uncertain-effect session. No live inference.

The same scenario failed against the previously built bf37af7 binary in /tmp/pi-rs-m4-final with `invalid digit found in string` at the reset request; passed after implementation. Strict clippy passed. Existing 13-check and 28-check HTTP scenarios are rerun to catch policy/CLI regressions. No new dependencies. Preserve uncertain effects until explicitly resolved; policy reset must not hide or replay them.

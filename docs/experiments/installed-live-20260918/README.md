# Installed upstream-core live smoke — 2026-09-18

Installed via `cargo install --locked --path . --bin pi-rs --root /tmp/pi-rs-installed-probe --debug`; binary SHA and source/addon hashes are in `summary.json`. The experimental flag launches unchanged upstream Pi CLI with Rust Agent and private per-process scratch. Model `gpt-5.4-2026-03-05`, context editing off, zero steering, existing relay.

Stage 0 passed: real model fixed arithmetic, ran repository tests, and preserved protected files. Stage 1 resumed through a new installed process and exited successfully with correct arithmetic/tests, but modified protected `test_maths.py`; external acceptance failed. This reproduces the existing model/task-adherence failure while proving installed startup, original provider/tool path, Rust actions and canonical resume wiring. It is not complete Pi parity or reliability evidence.

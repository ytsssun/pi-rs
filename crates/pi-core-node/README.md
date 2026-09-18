# pi-core-node

This is a minimal Node-API cdylib host boundary for `pi-core`. Its request function accepts a JSON string and returns a JSON string. Session creation/opening, append/branch/snapshot, and the deterministic runtime state machine are exposed. The Node host supplies model and tool effects through `model_result` and `tool_result` events; provider, queue, HTTP, and credential code are intentionally absent.

Build on macOS or Linux with `node crates/pi-core-node/build.mjs`; this uses the bundled Cargo path when available and writes `target/pi-core-node.node`. Run the deterministic bridge tests with `node --test crates/pi-core-node/bridge.test.mjs` after building.

Windows and other targets are unsupported because Node-API linker setup has only been validated for macOS and Linux. The interface is experimental and carries no ABI stability promise.

The implementation was extracted from `prototype/native-session.rs` in the pi-rs runtime prototype. Provider and stream queue branches were removed; session and runtime behavior is delegated to `crates/pi-core`.

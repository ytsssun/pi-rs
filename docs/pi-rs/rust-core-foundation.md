# Rust core foundation

This directory is the first standalone Rust crate in the pi-rs product
repository. It imports a small, bounded execution foundation from the earlier
pi-rs prototype without changing Pi's TypeScript packages.

## Scope

`crates/pi-core` contains the runtime state machine, Pi v3 session store, and
read-only session index. The crate emits model, tool, lifecycle, and queue
actions; a host must execute those effects. It is **not connected to the fork's
Agent, coding-agent CLI, or provider implementations yet**.

The source was imported from prototype commit
`54631ea52b83ac37f49977168759eb71afc9beed` in `ytsssun/pi-rs-archive`.
The fork baseline is `46c9de402bddf46b03c3b9f46487b777aaa41861`; compatibility
with that newer Pi revision remains unverified and is a separate milestone.

## Verification

From the repository root:

```sh
cargo test --manifest-path crates/pi-core/Cargo.toml --locked --all-targets
cargo clippy --manifest-path crates/pi-core/Cargo.toml --locked --all-targets -- -D warnings
```

The tests are deterministic runtime contract tests. They do not prove live
provider behavior, extension compatibility, CLI integration, or full Pi
parity.

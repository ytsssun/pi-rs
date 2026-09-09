# Parity classification

Reference upstream: Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`. The static inventory reports 43 public Runner methods and 15 event emitters (`experiments/parity-inventory.json`); it cannot establish runtime semantics. No overall percentage is reported.

## Verified (bounded)

- Core read/write/edit/bash behavior, truncation, and fresh-process coding/resume: E249–E252, E251, E255.
- OpenAI-compatible provider HTTP transport (success, incomplete response, 429, redirect refusal): checkpoint provider verification.
- Unchanged loader/ExtensionRunner deferred-tools and context chaining: `docs/real-plugin-host.md`; E243.
- Extension entry persistence and explicit `triggerTurn:false` custom-message persistence across restart: E242–E243.

## Partial

- Host surface (`createHost`, `requestTools`, `execute`, actions, context actions, providers, `drainMessages`) exists, but semantics are not exhaustive.
- Provider registration is retained; model resolution, OAuth/credentials, refresh, and scoped enumeration remain unverified.
- Message delivery supports explicit non-trigger custom messages; other queued modes require a scheduling consumer and currently error explicitly (E243).
- Context projection/truncation and policy persistence are tested (E226, E252, E158), while full schema conversion, chained mutation, cancellation, and live model-view coverage remain open.
- Native snapshots support resume and recovery, but Pi SessionManager format, migration, branching, and compaction parity are absent/unverified (E250–E251).
- Selected event-bus ordering/mutation is tested; complete lifecycle ordering, cancellation, steering, and error semantics remain open.

## Missing or unverified

Complete discovery/install/load compatibility; all registration surfaces (commands, shortcuts, renderers); full lifecycle and cancellation; TUI/UI modes; provider auth/live breadth; inter-plugin identity/collision/cleanup; JS export/environment compatibility; malformed session import/export and migration; and failure-race/performance behavior. These obligations are enumerated in `docs/plugin-seams.md`.

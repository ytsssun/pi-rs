# Pi capability classification

Reference: pinned Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`. This is a capability inventory, not a compatibility percentage.

## Verified or bounded

- Rust core `read`, `write`, `edit`, and `bash`, including limits and failure recovery (Cargo suites; E239).
- Formal `pi-rs` CLI with real OpenAI model calls, tool execution, and fresh-process continuation (E249–E251, E256).
- Canonical session retention with bounded context projection (E226, E252).
- Unchanged upstream extension loader, tool hooks, context chaining, custom entries, and deferred custom-message persistence (E230–E243).
- OpenAI-compatible SSE parsing, bounded native queue, and live transport path (E248, E254).

## Partial

- Extension messages: `triggerTurn:false` and deferred `nextTurn` custom messages persist and re-enter context; in-turn steer and follow-up scheduling are not implemented.
- Provider support: registration is retained; model resolution, scoped models, credentials refresh, OAuth, and provider breadth are incomplete.
- Extension lifecycle: selected events and error propagation work; full 15-event ordering, cancellation, UI, and command context semantics remain unverified.
- Session format: native snapshots and recovery are robust, but Pi SessionManager migration/import/export parity is incomplete.
- Context editing: canonical retention and bounded projection work; full upstream mutation and event semantics remain partial.

## Missing or unverified

Extension discovery/install, all renderers and shortcuts, TUI/UI modes, provider OAuth, inter-plugin cleanup and identity, malformed-session migration, crash-race coverage, and complete performance measurements. A scoped help-process baseline now exists in `docs/startup-measurement.md`; it excludes model/tool/restore cost.

Do not report 70–80% parity until each capability has runtime evidence and a defined denominator. Current priority is live replacement/continuation evidence and a usable formal CLI path; missing session options and cancellation/message scheduling follow. See `docs/checkpoint.md` for current dependencies.

Session replacement now has bounded deterministic evidence: actual owner, veto, distinct native identities/history, stale contexts, idle waiter and terminal failure cleanup (`experiments/cli-new-session.mjs`, `experiments/session-owner-failures.mjs`, PR #11). This does not establish active-turn replacement, parentSession/withSession or full command-context compatibility.

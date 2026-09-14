# Steer semantics audit

Status: tested blocker (2026-09-14, main f570fc0).

Pinned Pi's `steer` is admitted while an active model/tool turn is running, aborts the current turn, persists the aborted assistant/tool settlement, then starts the queued steer message exactly once in the same drive. Ordering and persistence are observable through the session history; a fresh process must not replay an already admitted steer.

pi-rs currently has no equivalent admission seam. `native-runtime-driver.mjs` only drains queued messages after Rust reports `done`; entries labelled `steer` are treated as deferred custom messages (or rejected when no consumer exists). During `model` or `tool` actions, queued steer is neither observed nor causes cancellation. Therefore the required active-drive abort/order/once-only semantics cannot be claimed.

Reproduction/source evidence: inspect the driver branch at `f570fc0` and run the existing deferred-message fixtures. They pass only for `triggerTurn:false`/`nextTurn`; no fixture can demonstrate active-turn steer because the runtime has no injection point. This is an architecture gap, not a missing assertion. A future implementation must add a Rust-owned admission operation tied to the active request id, with tests for FIFO, abort settlement before steer begin, duplicate rejection, restart no-replay, and same-host continuation.

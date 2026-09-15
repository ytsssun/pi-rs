# Dispatch budget follow-up audit

Status: tested (2026-09-15), main `2cd468a`.

The native driver still has a JS `for (count=0; count<32; count++)` guard, while Rust resets `action_count` on every `begin`, including `advance_queued` admitted follow-up turns. Therefore a chain of follow-ups can reset the Rust budget; direct Rust `step(begin)` similarly resets its counter. The effective 32-action limit is per admitted turn, not per drive. Removing the JS guard would permit repeated follow-up turns until the host's JS guard currently throws, so budget ownership is not yet fully Rust-owned. This is a source-backed finding; no live/model calls.

Reproduction: `experiments/dispatch-budget.mjs` demonstrates the 15/16 tool boundary; inspect `native-runtime-driver.mjs` loop and `PiRuntime::step` `begin` reset, then enqueue a followUp and call `advance_queued` after `done`. Expected: second begin has action_count=0. Acceptance for migration: Rust exposes one drive-level budget, follow-up admission cannot reset it, and JS has no independent iteration cap.

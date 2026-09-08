# Native provider streaming contract

Reference: pinned Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, `vendor/pi-mono/packages/agent/src/proxy.ts` and `packages/ai` event types.

The Node host must receive ordered `text_delta`, `thinking_delta`, `toolcall_start`, `toolcall_delta`, `toolcall_end`, and terminal `done` or `error` events. A terminal `done` carries the assembled assistant message, stop reason, and usage. A clean EOF without a terminal event is an error. Tool call JSON is assembled incrementally and must be validated only at completion.

Current pi-rs native provider returns a synchronous completed OpenAI response and emits only `{type:"done"}`. This document freezes the target seam; no streaming compatibility claim is made until Rust transport can expose ordered events without blocking the Node event loop.

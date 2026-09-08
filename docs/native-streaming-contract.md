# Native provider streaming contract

## Current native queue seam

The experimental binding exposes `queue_create`, `queue_push`, `queue_push_batch`,
`queue_poll` (with optional `wait:true`), and `queue_close`. Batch publication is
source ordered and returns the first queue error. This is a transport seam only:
the provider request still needs a managed background handle before it can be
called a live Node streaming path.
Reference: pinned Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, `vendor/pi-mono/packages/agent/src/proxy.ts` and `packages/ai` event types.

The Node host must receive ordered `text_delta`, `thinking_delta`, `toolcall_start`, `toolcall_delta`, `toolcall_end`, and terminal `done` or `error` events. A terminal `done` carries the assembled assistant message, stop reason, and usage. A clean EOF without a terminal event is an error. Tool call JSON is assembled incrementally and must be validated only at completion.

Current pi-rs native provider returns a synchronous completed OpenAI response and emits only `{type:"done"}`. This document freezes the target seam; no streaming compatibility claim is made until Rust transport can expose ordered events without blocking the Node event loop.

## Next implementation slice

Implement a Rust-owned bounded event queue behind the native handle. A provider task writes parsed `SseDecoder` events; Node polls events and explicitly closes the stream. Acceptance requires: bounded queue overflow is an explicit error, terminal event is delivered exactly once, close unblocks the producer, and no callback runs after close. Until these cases pass, the synchronous provider path remains the only live path.

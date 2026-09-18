# Fork Agent seam audit

Source inspection: fork `46c9de402`, legacy adapter on `308fec73c`. This is a source audit, not executed compatibility evidence.

## First blocking contract change

`packages/agent/src/agent.ts:81` creates an initial system message from initialState.systemPrompt and tool declarations. `state.systemPrompt` is a getter derived from messages; message assignment copies the array. Its default model conversion includes role `system` (lines35–43).

The old `experiments/agent-shaped-adapter.mjs` assigns a plain mutable systemPrompt string and filters default messages to user/assistant/toolResult. Copying that adapter would lose system-message semantics on this fork. The first facade acceptance must assert initial instructions/tools, a mid-conversation system update, and new-process restoration against the fork Agent. A text/tool smoke alone is insufficient.

## Migration slices

1. Add a Node-API crate depending only on crates/pi-core and serde_json. Extract session handle lifetime/request dispatch from the old prototype; exclude provider_chat, provider_stream_start and stream queue registry. Keep providers in the fork SDK for this slice. Test close, invalid handles and per-environment teardown.
2. Implement the fork Agent state contract, including system messages and copied message arrays, before wiring the default export. Preserve fork provider callbacks. Add an explicit Rust Agent export for differential tests first; keep the current default working until acceptance passes.
3. Compare actual fork Agent and Rust Agent with identical scripted streams: initial system prompt/tools; system update; user/tool turn; provider failure; custom/image input; new-process recovery. Compare messages/events and external file assertions, not only process success.
4. Route unchanged coding-agent imports through the Rust implementation only after this gate and full CI pass. Product executable remains pi-rs.

## Scope

No claims about whole ecosystem parity. Context adoption/compaction remain incomplete from the old branch; do not migrate their green micro-test status as full Session compatibility. The legacy addon imports HTTP/stream modules and is not the desired minimal bridge.

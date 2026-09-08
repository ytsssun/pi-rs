# Upstream lifecycle trace fixture

Against the pinned `vendor/pi-mono` checkout, `AgentSession` subscribes to agent events (agent-session.ts:402) and dispatches the `tool_result` extension hook (lines 510–512). The deterministic fixture records the minimum model/tool turn ordering used for Rust differential tests.

Run:

```sh
node experiments/upstream-event-trace.mjs
```

Output is also written to `experiments/upstream-event-trace.json`. This is a source-derived deterministic fixture, not a live provider run; streaming, parallel tools, steering and cancellation remain unverified.

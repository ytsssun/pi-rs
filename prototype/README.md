# TS extension sidecar architecture spike

Status: **tested** on Node v22.18.0. Run from repository root:

```sh
node prototype/test-extension-sidecar.mjs
```

The test spawns a real Node child process using `--experimental-strip-types`, imports the unchanged upstream [protected-paths.ts](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/examples/extensions/protected-paths.ts), registers its actual handler, sends JSONL requests and asserts JSONL responses. Type-only package imports are erased, so this example needs no npm installation. The upstream checkout must be at the reference commit in `docs/upstream.md`.

Verified subset: `pi.on('tool_call', handler)`, async handler execution, `event.toolName`, `event.input.path`, `ctx.hasUI=false`, JSON block/reason result. Seven cases cover protected write/edit, ordinary write, protected read, the upstream substring behavior (`safe.env.example` is blocked), unsupported method and malformed JSON. The 5-second process timeout bounds the test. Invalid requests return errors and do not terminate the process.

Example request on stdin of `node --experimental-strip-types prototype/extension-sidecar.mjs`:

```json
{"id":1,"method":"tool_call","params":{"toolName":"write","input":{"path":".env"}}}
```

Response:

```json
{"id":1,"result":{"block":true,"reason":"Path \".env\" is protected"}}
```

This proves a real upstream extension's narrow headless hook can cross a process JSON boundary. It does **not** run Pi's jiti loader, test registration of tools, connect the Rust runtime, or verify the full ExtensionAPI. No filesystem tool executes. The upstream example is a substring guard, not a security boundary. The protocol is spike-specific, not Pi RPC.

Unknown/unsupported: runtime imports and npm package aliases, UI Components, provider streams, arbitrary callback identity, cancellation, hook ordering across multiple extensions, reentrant session access, crash recovery, production framing/backpressure and resource limits. The sidecar currently trusts the reviewed extension and cannot recover its internal state after death. A next bounded experiment should connect Rust to this process, enforce a hook deadline, and verify sidecar death produces an explicit runtime error rather than silently allowing a blocked tool.

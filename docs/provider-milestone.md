# Provider milestone — native OpenAI path

**Status: proposed.** The CLI already has an OpenAI Chat Completions transport, but the integrated Rust runtime experiment uses a fixture stream. The next vertical milestone moves one real provider request through the native Rust state machine while retaining the unchanged JS extension host.

Acceptance:

1. A pinned model response is requested through the existing credential/config path without logging secrets.
2. The native runtime owns model/tool continuation and persists the same canonical session entries as the fixture path.
3. At least one unchanged JS plugin tool executes, including an error result, and a fresh process resumes without replay.
4. Provider HTTP/API failures are recorded separately from tool or runtime failures.

This is one provider/model path only; it does not claim all providers, streaming parity, performance gains, or full Pi compatibility.

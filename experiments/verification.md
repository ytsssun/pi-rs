# Independent verification — cycle 1

## V001: Original Pi truncation oracle (verified)

Reference: `badlogic/pi-mono` commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, original `packages/coding-agent/src/core/tools/truncate.ts`.
Executed 2026-09-06 with Node v22.18.0. No workspace npm install or copied TypeScript implementation is involved.

Reproduce from repository root:

```sh
node --experimental-strip-types experiments/upstream-oracle.mjs > /tmp/pi-upstream-truncate.json
diff -u experiments/upstream-truncate.json /tmp/pi-upstream-truncate.json
```

The script refuses a mismatched upstream HEAD or modified oracle module. `truncate-cases.json` contains 36 fixed cases; `upstream-truncate.json` records all result fields, not only resulting text. Cases cover empty input, trailing newline preservation/counting, head/tail direction, line limits, byte limits, oversized lines, UTF-8 boundaries, blank lines, exact limits, CRLF, simultaneous limits, zero limits, emoji, and actual default 2,000-line/50-KiB boundaries.

Observed upstream behavior to preserve or explicitly classify as a deviation:

- Empty string has zero lines. A trailing newline adds bytes but does not add a line.
- Output keeps its trailing newline when no truncation is needed; truncated output joins complete lines without preserving it.
- Oversized first line produces empty head output with `firstLineExceedsLimit=true`; tail allows a partial line.
- Tail output for `你好世界` with a five-byte budget is `界` (three bytes); it does not split UTF-8 code points.
- Input `a\n` with a one-byte budget reports `truncated=true`, `truncatedBy=lines`. This counterintuitive classification is observed original behavior, not a claim that line count actually exceeded its limit.

Rust comparison (verified): all 36 fixed cases match every result field. Reproduce with `cargo build --manifest-path compatibility/Cargo.toml` then `node experiments/compare-truncate.mjs`. This invokes the original oracle afresh and compares the independently built Rust binary. Output: `truncate-differential.json` (36 passed, zero failures). This is bounded truncation-module parity, not proof of read/bash-tool, session, extension, provider, or end-to-end compatibility.

## V002: Vertical-slice adversarial acceptance (proposed)

These expectations originate from the user's save/resume and usable-agent goals. They are independent of implementation details:

1. A request causes at least one tool invocation; returned tool content influences the final model request and final response.
2. Resuming a saved session retains prior user, assistant tool-call, and tool-result records; a follow-up can use earlier information.
3. A tool error becomes a correlated tool result usable by the model; it must not silently become a success or erase the session.
4. Repeated tool calls terminate at an explicit bound with a useful error and a recoverable checkpoint.
5. Invalid/truncated JSON session data and unknown session versions fail without overwriting the original session.
6. An incomplete assistant-tool-call checkpoint is either repaired deterministically or rejected explicitly on resume, never sent as an invalid provider conversation.
7. A transport/provider failure is distinguishable from a valid assistant response; fixture execution is labeled as fixture rather than live provider validation.
8. Session writes cannot silently truncate existing history after a process crash. Concurrent use of one session is rejected or safely serialized.

Live model acceptance must check structural behavior (request/tool/result/final response), not exact natural-language text equality. Live API access and crash/concurrent-write behavior remain unverified until corresponding experiments run.

## V003: Independent CLI/HTTP experiment (verified)

Reproduce: `cargo build` followed by `python3 experiments/verify-runtime.py`.
Result: `runtime-verification.json`, 13 passed assertions. The script creates an ephemeral workspace, binds a local loopback HTTP server on an ephemeral port, and invokes the Rust binary through separate subprocesses. The local provider double returns a read call, then constructs its final response from the actual tool result received over HTTP.

Verified: round limit failure with completed tool checkpoint; separate-process resume with correlated tool result in the next HTTP request; two provider usage entries persisted; completed session resume without HTTP call; existing/corrupt/unknown-version session protected from overwrite; unknown tool converted into an error tool result; incomplete `finish_reason=length` rejected without saving an assistant; context editing changes the HTTP view while retaining full canonical tool content.

This verifies HTTP integration and deterministic control flow using a local test double. It does not verify a real model, credential access, provider-specific behavior, or end-to-end task quality. Resume currently supports a single request lifecycle only; a new user follow-up turn is not implemented. Crash fault injection, simultaneous processes, external Pi session import/export, and runtime integration of the separately tested truncation module remain unverified. These limitations are not waived acceptance criteria.

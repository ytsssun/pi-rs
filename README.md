# pi-rs

Experimental Rust runtime inspired by Pi, started from scratch. First milestone is a deterministic resumable model/tool loop, not a full coding agent or a drop-in Pi replacement.

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo test --locked
mkdir -p .runs
cargo run --locked -- --input 'Read fixtures/hello.txt' --session .runs/demo.json --fixture fixtures/read.json
cargo run --locked -- --resume --session .runs/demo.json --fixture fixtures/read.json
```

Use a fresh session path for another run. `--resume` continues an interrupted model/tool round or returns the saved final answer; adding a follow-up user turn is not implemented yet. Fixture responses are scripted: they verify control flow and actual tool output persistence, not model intelligence or real provider availability.

The path restriction assumes a trusted local workspace; it is not a sandbox against concurrent directory replacement. The only runtime tool is bounded UTF-8 file `read` inside the workspace. It rejects oversized files rather than implementing Pi read pagination/truncation. Native sessions are versioned JSON snapshots; they are **not** Pi v3 JSONL sessions. Writes use temporary file + fsync + rename with one process owner. After an unclean exit, inspect `.lock` and `.tmp` siblings and confirm the owner process is gone before removing stale files and resuming. Read-only tool replay is permitted; this is not exactly-once execution for future write tools.

Optional provider path (not live-verified): set `OPENAI_API_KEY`, optionally `OPENAI_BASE_URL`, then replace `--fixture ...` with `--model MODEL_ID`. Uses a non-streaming Chat Completions-shaped endpoint. Codex login is not assumed to be a generic API key. Never commit credentials or real session content.

`--context-tool-chars N` derives a trimmed model context without replacing canonical tool results. It is an initial context projection experiment, not a durable edit/branch protocol.

## Deterministic compatibility probes

```sh
sh scripts/bootstrap-upstream.sh
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
node prototype/test-extension-sidecar.mjs
```

The upstream commit is fixed in [docs/upstream.md](docs/upstream.md). The separate truncation probe compares complete results with original upstream code. The Node extension spike loads one unchanged upstream extension; the Rust runtime does not yet invoke it. Node 22.18+ is used for native TypeScript stripping. No TUI, complete providers/extensions, Pi session import/export or multiplayer claim.

Start/resume engineering work from [docs/checkpoint.md](docs/checkpoint.md). Durable tasks and evidence: [docs/board.jsonl](docs/board.jsonl); query with `python3 scripts/board.py list`. Ownership and scheduling limits: [docs/coordination.md](docs/coordination.md). No performance advantage has been measured.

# pi-rs

**A Rust core for the Pi coding-agent ecosystem.**

Pi-rs is an experimental reimplementation of Pi’s core runtime in Rust. It keeps Pi’s TypeScript/Node.js extension boundary so existing Pi plugins can continue to run while the session, context, recovery, and execution loop evolve independently.

This project is not yet a drop-in replacement for upstream [Pi](https://github.com/badlogic/pi-mono). The compatibility target is the core runtime plus the unchanged Pi ecosystem; compatibility is measured by behavior and evidence, not by a claim that a few demos cover every plugin.

An experimental Rust coding-agent runtime with narrowly tested Pi compatibility. It can change files, execute tests, save a session, exit and continue a new user turn. Real OpenAI model coding and cross-process continuation have been independently verified on small fixed tasks. The first Luna baseline completed 8/9 tasks fully; one run omitted testing its new behavior despite correct code. See [live review](experiments/live-luna-review.md) and [current checkpoint](docs/checkpoint.md) for retry status and limitations. This is not yet a drop-in Pi replacement.

## Direction

The project rewrites **Pi's core runtime**, while keeping the existing TypeScript/Node.js host as the compatibility boundary for the Pi ecosystem. Rust owns the session tree, context projection, runtime state machine and recovery; the host continues to load extensions, hold plugin objects and closures, dispatch UI events, and adapt providers. Node-API is the current seam because it preserves JavaScript identity and lets existing plugins run without a rewrite. It is an implementation boundary, not a claim that every Pi subsystem must remain in TypeScript.

The next milestone is **provider continuation and extension conformance**: verify live streaming tool results across resumed processes while invoking the unchanged JS extension host. The acceptance cases and known gaps are tracked in [the checkpoint](docs/checkpoint.md); passing fixtures will not be treated as full Pi compatibility.

## Run the coding scenario

Requirements: Unix, Rust (pinned by rust-toolchain.toml), Python 3, Git; Bash for command tools. Add the installed Cargo directory to PATH.

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
cargo test --locked
python3 scripts/demo-coding.py
python3 scripts/demo-coding.py --edit
```

The demo creates a fresh tiny repository under `.runs/`, runs its failing test, repairs the source through the Rust `write` tool, runs the passing test, exits, and launches a separate CLI process with a follow-up request. It checks actual test output and files. Artifacts and the session are retained in the printed directory. The model decisions are scripted, not real inference.

For a simple read-only fixture:

```sh
mkdir -p .runs
cargo run --locked -- --input 'Read fixtures/hello.txt' --session .runs/demo.json --fixture fixtures/read.json
cargo run --locked -- --resume --session .runs/demo.json --fixture fixtures/read.json
```

Use a fresh session path for a new run. Fixtures index responses by **all historical assistant messages**, including earlier turns; a follow-up fixture must include that history's response prefix.

## Real provider interface

Set `OPENAI_API_KEY`, optionally `OPENAI_BASE_URL` (default `https://api.openai.com/v1`), and use a tool-capable model ID:

```sh
mkdir -p .runs
cargo run --locked -- --input 'Fix the failing tests' --workspace /absolute/path/to/small-repo --session .runs/coding.json --model MODEL_ID --allow-mutations
cargo run --locked -- --resume --input 'Add a regression test and run it' --session .runs/coding.json --model MODEL_ID --allow-mutations
```

For the recorded live validation harness, load a local ignored dotenv file without
sourcing it as shell code:

```sh
python3 experiments/run_live.py --phase pilot --output .runs/my-luna-pilot \
  --env-file .env --model gpt-5.6-luna --reasoning-effort none
```

The observed Luna Chat Completions API rejects tool calls with default reasoning;
`--reasoning-effort none` is required for this tested combination. The CLI forwards
explicit effort and otherwise preserves provider defaults; support is model/API
specific. Repeat the option on resume: provider/model/effort are not yet bound into
the native session. Higher reasoning for Luna requires a Responses adapter, which
is not implemented. [Live evidence](experiments/live-luna-review.md) separates
provider configuration errors from task failures.

Without `--allow-mutations`, only read is advertised and fabricated write/edit/bash calls return errors. With it, **bash runs with your host user's authority**, in the saved workspace. It is not a sandbox. Use a trusted disposable repository for experiments, and keep session state outside that repository. Codex login is not assumed to be a generic provider API key. Never commit credentials or real session content.

## Runtime details

Detailed tool limits, recovery semantics, context editing behavior, and known compatibility gaps live in [runtime details](docs/runtime-details.md).

## Verify the bounded compatibility profiles

```sh
sh scripts/bootstrap-upstream.sh
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
node prototype/test-extension-sidecar.mjs
node --experimental-vm-modules experiments/write-differential.mjs
node --experimental-vm-modules experiments/edit-differential.mjs
python3 experiments/verify-runtime.py
python3 experiments/round2-coding.py
node --experimental-vm-modules experiments/read-differential.mjs
python3 experiments/read-resume.py
```

Node 22.18+ is used for TypeScript stripping. Fixed Pi reference: `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, MIT. Truncation probe compares 36 full results. Instrumented original write execution compares four filesystem/result cases; see [scope and shims](experiments/write-differential.md). The Node extension spike loads one unchanged extension and is not connected to Rust. Exact bash parity, complete Pi session import/export, TUI, complete extension/provider or multiplayer compatibility remain unverified. No speed/memory advantage has been measured.

[Checkpoint](docs/checkpoint.md) · [Frozen M2 acceptance](docs/milestone2.md) · [Independent baseline](experiments/round2-baseline.md) · [Coordination retrospective](docs/retrospective-m2.md) · [Board](docs/board.jsonl)

Query durable tasks with `python3 scripts/board.py list`. Root and adapted-source licensing are recorded in LICENSE, NOTICE and compatibility/NOTICE. Full transitive distribution audit remains open before public release.

## Run the Rust-backed entry

Build the native addon and upstream dependencies, then run `bin/pi-rs.mjs`:

```sh
python3 scripts/build-native-session.py
node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs bin/pi-rs.mjs \
  --session /absolute/new-session.json --workspace /absolute/disposable-repo \
  --input 'Read the repository' --model MODEL_ID
```

Use `--resume` with the same session and workspace. The entry is experimental; use a disposable workspace because mutation tools and `bash` run with the host user’s permissions. Fixture usage and live recovery probes are documented in [runtime details](docs/runtime-details.md).

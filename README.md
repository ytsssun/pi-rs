# pi-rs

**Pi’s coding-agent ecosystem, with a Rust core.**

pi-rs rewrites the core runtime of [Pi](https://github.com/badlogic/pi-mono) in Rust while keeping its TypeScript/Node.js extension boundary. Rust owns execution decisions, session storage, and context projection; the Node host loads Pi tools and extensions unchanged.

This is an early, headless implementation. Basic coding and session continuation have live-model evidence, but full plugin compatibility and a measured 70–80% feature coverage have **not** been established. See [current status](docs/checkpoint.md) for evidence and limitations.

## Build

Currently supported as a source-checkout build on macOS/Linux, with Rust, Node.js 22.18+, Python 3, and Git. Keep the checkout and its Node dependencies alongside your build; this is not yet a standalone distributable binary.

```sh
export PATH="$HOME/.cargo/bin:$PATH"
sh scripts/bootstrap-upstream.sh
python3 scripts/build-native-session.py
cargo build --locked --bin pi-rs
./target/debug/pi-rs --help
```

## Use

Set `OPENAI_API_KEY` and choose a tool-capable model. Run in a disposable repository while evaluating:

```sh
./target/debug/pi-rs --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Fix the failing test and run it' --model MODEL_ID

./target/debug/pi-rs --resume --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Add a regression test and run it' --model MODEL_ID
```

Original Pi tools can modify files and run shell commands with your user permissions. The workspace is not a sandbox. Keep credentials and session artifacts out of commits.

Load an extension with `--extension /absolute/path/to/extension.ts`; repeat the option on resume. Loading an extension does not imply every Pi API or UI feature it uses is supported.

## Verify

```sh
python3 experiments/formal-cli.py
```

This deterministic acceptance uses scripted model messages and actual tools: write, fresh-process resume/edit, and rejection by an unchanged upstream extension. It does not call a live model.

## Project

- [Checkpoint and evidence](docs/checkpoint.md)
- [Runtime details](docs/runtime-details.md)
- [Pinned upstream reference](docs/upstream.md)
- [Architecture decision](docs/architecture-decision.md)
- [Contribution guide](AGENTS.md)

The previous snapshot-based runtime remains available as `pi-rs-legacy` for regression comparisons. Its session format, fixture schema, and permission flags differ; see [legacy CLI notes](docs/legacy-cli-guide.md). Existing legacy sessions are not automatically migrated.

MIT licensed. Upstream Pi is MIT licensed; its source is retained at the pinned reference. No end-to-end speed or memory advantage is claimed without measurements.

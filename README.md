# pi-rs

**Pi’s coding-agent ecosystem, with a Rust core.**

pi-rs rewrites the core runtime of [Pi](https://github.com/badlogic/pi-mono) in Rust while keeping its TypeScript/Node.js extension boundary. Rust owns execution decisions, session storage, and context projection; the Node host loads Pi tools and extensions unchanged.

This is an early, headless implementation. Basic coding and session continuation have live-model evidence, but full plugin compatibility and a measured 70–80% feature coverage have **not** been established. See [current status](docs/checkpoint.md) for evidence and limitations.

## Install

On macOS or Linux, install from source with Rust, Node.js 22.19+, npm, Python 3, and Git:

```sh
curl -fsSL https://raw.githubusercontent.com/ytsssun/pi-rs/main/scripts/install.sh | sh
```

The installer builds pi-rs and installs the command into `~/.cargo/bin` (or `$CARGO_HOME/bin`). Ensure that directory is on your PATH, then run `pi-rs --help`. It retains the required Node host and runtime files under `~/.local/share/pi-rs`; this is a source installer, not a prebuilt binary download.

Already have a checkout?

```sh
sh scripts/install.sh --source "$PWD"
```

To use `~/.local/bin` instead, add `--prefix "$HOME/.local"`. See [installation details](docs/installation.md) for updates, removal, and development builds.

## Use

Set `OPENAI_API_KEY` (or place it in a project-local `.env`) and choose a tool-capable model. The current live-verified path uses `gpt-5.6-luna`; run in a disposable repository while evaluating:

```sh
pi-rs --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Fix the failing test and run it' --model MODEL_ID

pi-rs --resume --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Add a regression test and run it' --model MODEL_ID
```

Original Pi tools can modify files and run shell commands with your user permissions. The workspace is not a sandbox. Keep credentials and session artifacts out of commits.

Load an extension with `--extension /absolute/path/to/extension.ts`; repeat the option on resume. Loading an extension does not imply every Pi API or UI feature it uses is supported.

## Verify

```sh
python3 experiments/formal-cli.py
```

This deterministic acceptance uses scripted model messages and actual tools: write, fresh-process resume/edit, and rejection by an unchanged upstream extension. It does not call a live model. For a real provider/tool/recovery check, repeat the two commands above with a temporary workspace; evidence and known gaps are maintained in the [checkpoint](docs/checkpoint.md).

The current usable slice is headless coding with the original Pi tools, OpenAI-compatible model calls, session recovery, context projection, and selected extension bindings. UI prompts, provider OAuth, full lifecycle scheduling, and complete extension parity remain under development. Do not treat the project as a drop-in replacement yet.

## Project

- [Architecture and feature map](docs/architecture.md)

- [Checkpoint and evidence](docs/checkpoint.md)
- [Runtime details](docs/runtime-details.md)
- [Pinned upstream reference](docs/upstream.md)
- [Architecture decision](docs/architecture-decision.md)
- [Contribution guide](AGENTS.md)

The previous snapshot-based runtime remains available as `pi-rs-legacy` for regression comparisons. Its session format, fixture schema, and permission flags differ; see [legacy CLI notes](docs/legacy-cli-guide.md). Existing legacy sessions are not automatically migrated.

MIT licensed. Upstream Pi is MIT licensed; its source is retained at the pinned reference. No end-to-end speed or memory advantage is claimed without measurements.

<div align="center">

# pi-rs

### Pi’s ecosystem. A Rust core.

A coding-agent runtime built for compatibility—and room to evolve.

[![CI](https://github.com/ytsssun/pi-rs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ytsssun/pi-rs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status: experimental](https://img.shields.io/badge/status-experimental-orange.svg)](docs/checkpoint.md)

[Get started](#get-started) · [Architecture](docs/architecture.md) · [Compatibility](docs/core-parity-matrix.md) · [Documentation](docs/README.md)

</div>

pi-rs replaces the core runtime of [Pi](https://github.com/badlogic/pi-mono) with Rust while retaining its TypeScript/Node.js extension boundary. The goal is to keep the Pi ecosystem familiar while making execution, session storage, and context editing independently evolvable.

**Experimental and headless today.** Real-model coding and session continuation have been exercised. Full ecosystem compatibility and drop-in replacement readiness have not been established.

## What works today

- **Coding and continuation:** model/tool turns, durable sessions, and fresh-process resume.
- **Project context:** AGENTS files, SYSTEM/APPEND_SYSTEM prompts, and selected extension hooks.
- **Pi extensions:** unchanged TypeScript loading, dynamic tool activation, and registered provider dispatch with bounded acceptance tests.
- **Session controls:** tested idle newSession, switchSession, and fork workflows.
- **Context editing:** projected model context while retaining canonical history.

These capabilities have different evidence levels. See the [compatibility inventory](docs/core-parity-matrix.md) and [current checkpoint](docs/checkpoint.md) for exact scope. TUI integration, complete provider/auth support, active cancellation, and the full extension API remain incomplete.

## Get started

On macOS or Linux, install from source with Rust, Node.js 22.19+, npm, Python 3, and Git:

```sh
curl -fsSL https://raw.githubusercontent.com/ytsssun/pi-rs/main/scripts/install.sh | sh
```

The installer puts `pi-rs` in `~/.cargo/bin` (or `$CARGO_HOME/bin`) and keeps its Node runtime files under `~/.local/share/pi-rs`. Ensure the binary directory is on your PATH. This currently builds from source.

```sh
pi-rs --help
export OPENAI_API_KEY='your-api-key'

pi-rs --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Fix the failing test and run it' --model MODEL_ID

pi-rs --resume --workspace /absolute/path/to/repo \
  --session /absolute/path/to/session.jsonl \
  --input 'Continue the work and verify the result' --model MODEL_ID
```

Choose an available tool-capable model. Tools execute with your user permissions; use a disposable repository while evaluating. The workspace is not a sandbox.

Load an extension with `--extension /absolute/path/to/extension.ts`; include it again when resuming. Selected extension paths are tested, but successful loading does not establish full API compatibility.

For installation from a checkout, `~/.local/bin`, updates, or removal, see [installation](docs/installation.md).

## Why Rust and Node?

Rust owns the execution loop, session storage, and context projection. The Node host retains Pi’s loader, tool and extension code, and JavaScript-facing state. This keeps JavaScript callbacks and synchronous APIs available while the runtime evolves. See the [architecture](docs/architecture.md) for the ownership boundaries.

Performance is a measurement question: startup, memory, and model/tool latency are separate concerns. We do not claim an end-to-end speedup.

## Development

From a prepared checkout, run the deterministic CLI acceptance:

```sh
python3 experiments/formal-cli.py
```

It uses scripted model responses and actual tools; it is not a live-model test. Build instructions, runtime details, historical evidence, and legacy comparisons are indexed in the [documentation](docs/README.md). Contributions should follow [AGENTS.md](AGENTS.md).

## Upstream and license

pi-rs builds on [Pi](https://github.com/badlogic/pi-mono). The upstream reference is pinned for reproducible compatibility checks; see [upstream provenance](docs/upstream.md) and [NOTICE](NOTICE).

Both pi-rs and the referenced Pi source are MIT licensed. See [LICENSE](LICENSE).

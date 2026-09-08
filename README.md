# pi-rs

An experimental Rust coding-agent runtime with narrowly tested Pi compatibility. It can change files, execute tests, save a session, exit and continue a new user turn. Real OpenAI model coding and cross-process continuation have been independently verified on small fixed tasks. The first Luna baseline completed 8/9 tasks fully; one run omitted testing its new behavior despite correct code. See [live review](experiments/live-luna-review.md) and [current checkpoint](docs/checkpoint.md) for retry status and limitations. This is not yet a drop-in Pi replacement.

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

## Behavior and recovery

- `read`: UTF-8 regular file up to 8 MiB; positive integer `offset` (1-based) and `limit`, with Pi-style 2000-line/50 KiB output truncation and continuation notices. No images. Raw edit input remains capped at 64 KiB and never uses a rendered read page.
- `write`: `{path,content}`, creates parents and atomically replaces files, maximum 1 MiB. Workspace traversal/symlink restrictions assume no hostile concurrent filesystem mutation.
- `edit`: `{path,edits:[{oldText,newText}]}` targets original file ranges without cascading; BOM/newline handling and ambiguity rules are compared against pinned Pi. Source maximum 64 KiB. Fuzzy-only replacements, legacy argument coercion and rendered diff metadata are not supported; see [exact-profile evidence](experiments/edit-differential.md).
- `bash`: `{command,timeout?}`, integer seconds, default 30/max 300; retains at most 32 KiB per stdout/stderr stream. Nonzero exit/timeout becomes an error tool result. Normal shell exit/timeout kills ordinary background descendants in its process group. Detached processes or abrupt runtime death are not contained.
- `--resume` continues unfinished work or returns the saved final result. `--resume --input TEXT` appends only after the prior turn completed. A mismatched explicit workspace is rejected.
- `--context-tool-chars N` persists a model-view truncation policy across resumes. Use `--context-tool-chars none` to clear it and restore full canonical tool results to the model view. Canonical tool results remain intact. Each real policy change appends a native `context_policy_changes` entry with previous/new limits and canonical message count. Reapplying the same limit adds no entry. This is a logical audit inside atomic snapshots, not a tamper-proof external log or branch system.
- Native v1 JSON snapshots use fsync/rename and an appended `.lock` file with Unix flock. Old v1 sessions load with default new fields. Leave the permanent lock file in place; ownership releases on process death. A leftover `.tmp` from interrupted save requires inspection before removal; no automatic promotion of incomplete snapshots.
- Before a write/edit/bash effect, an `in_flight` marker is saved. If the process dies before the result is saved, resume refuses automatic replay. Inspect files and surviving processes, then use `--resume --resolve-in-flight 'observed outcome'` with the normal model/fixture arguments. This records an operator-supplied result and continues; it does not re-run that call or prove exactly-once effects. Do not resolve while the original process is still changing files.

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

Node 22.18+ is used for TypeScript stripping. Fixed Pi reference: `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, MIT. Truncation probe compares 36 full results. Instrumented original write execution compares four filesystem/result cases; see [scope and shims](experiments/write-differential.md). The Node extension spike loads one unchanged extension and is not connected to Rust. No exact bash output, full agent-loop, Pi session import/export, TUI, complete extension/provider or multiplayer claim. No speed/memory advantage has been measured.

[Checkpoint](docs/checkpoint.md) · [Frozen M2 acceptance](docs/milestone2.md) · [Independent baseline](experiments/round2-baseline.md) · [Coordination retrospective](docs/retrospective-m2.md) · [Board](docs/board.jsonl)

Query durable tasks with `python3 scripts/board.py list`. Root and adapted-source licensing are recorded in LICENSE, NOTICE and compatibility/NOTICE. Full transitive distribution audit remains open before public release.

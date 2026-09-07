# Round 2 independent baseline (M1)

Status: **verified within the bounds below**, 2026-09-06. Verifier used a separate clean detached worktree, not coordinator's changing files. Runtime reference `00766dc`; upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`. Node v22.18.0. No live model inference occurred.

## Executed commands and observed results

```sh
git worktree add --detach /tmp/pi-rs-round2-verify 00766dc
cd /tmp/pi-rs-round2-verify
export PATH="$HOME/.cargo/bin:$PATH"
cargo test --locked
cargo build --locked
python3 experiments/verify-runtime.py
sh scripts/bootstrap-upstream.sh
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
node prototype/test-extension-sidecar.mjs
mkdir -p .runs
cargo run --locked -- --input 'Read fixtures/hello.txt' --session .runs/demo.json --fixture fixtures/read.json
cargo run --locked -- --resume --session .runs/demo.json --fixture fixtures/read.json
```

All above commands succeeded: 6 Rust integration tests, 13 CLI assertions using a loopback HTTP test double, 36 exact original/Rust truncation matches, 7 Node-sidecar responses/assertions, and both documented demo processes. Bootstrap fetched the public upstream and checked out the fixed commit. `git status --short` remained empty afterward (generated files are ignored). Build was from a fresh target directory. Cargo must be added to PATH as documented: a later bare `rustc --version` without that export failed with `command not found`; this is environment setup, not a build failure.

The fixture demo printed `Fixture complete: read result persisted. This is scripted output, not a live model verification.` in both processes. HTTP tests verify that actual file text reaches a subsequent HTTP request, correlation IDs and usage survive persistence, round limits checkpoint, invalid sessions remain unchanged, and trimmed context preserves canonical text. They do not establish provider availability or reasoning quality. Truncation and sidecar probes are standalone and not connected to the runtime.

## New user-goal counterexamples

```sh
cargo run --locked -- --resume --input 'Now fix a bug' --session .runs/demo.json --fixture fixtures/read.json
```

Exit 1: `Error: provide exactly one of --input or --resume`. A completed session cannot continue with another user request.

A separate ephemeral fixture asked the runtime to execute `write` with `{ "path": "answer.txt", "content": "42" }`, followed by a scripted `done` assistant message. Observed exit 0 and final text `done`, but `answer.txt` did not exist and persisted tool content was `ERROR: unknown tool`. This is expected for the declared read-only profile, but disproves the full small-repository coding scenario. Acceptance must inspect filesystem changes and actual tests, never equate final model text or process success with completed work.

## Scope and conclusion

M1 claims reproduced within their documented narrow scope; no newly observed regression. The user's edit → run tests → exit → resume-and-continue scenario fails due to absent mutation/shell tools and follow-up turns. Real model end-to-end, complete agent-loop conformance, Pi sessions/extensions and performance remain **unverified**. M2 should prioritize the coding scenario and effect recovery before broader compatibility.

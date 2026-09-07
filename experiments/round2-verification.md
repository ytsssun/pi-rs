# M2 independent verification

2026-09-06. **Tested against the working integration binary; clean candidate verification pending.** No live inference: loopback HTTP model double and scripted fixtures supply model decisions. Filesystem edits and Python tests are real subprocesses in ephemeral directories.

## Independent scenario

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
python3 experiments/round2-coding.py
```

Observed **28/28 checks pass**. The verifier constructed the small broken Python repository independently of implementation tests. `add(2,3)` initially fails; the model double requests a read, a real failing test, a full-file write repairing arithmetic, and another test that prints `INITIAL_TEST_PASS`. Assertions inspect file bytes, process exit, persisted failing/successful output, and tool evidence actually sent to the next HTTP request.

A second CLI process resumes with a new user request, writes a negative-input test and executes it (`FOLLOWUP_TEST_PASS`). The entire prior message prefix is unchanged, all calls have exactly one matching result, and provider usage spans both turns. Completed resume makes no new HTTP request or session change. A persisted 40-character context policy trims provider-visible output while preserving the canonical failure text.

Boundary checks: fabricated write/bash calls without opt-in have no effect and yield correlated errors; one-second bash timeout yields an error; normal background child does not hold the CLI open; 100KB output is bounded with a notice; `../` file escape is refused. Crash injection waits for an actual append, kills the Rust process, lets the shell finish, then confirms uncertain resume refuses automatic replay and leaves the session unchanged. Explicit resolution preserves the inspected outcome without another append.

This is stronger than a successful fixture final answer, but it does **not** prove that a real model can autonomously solve the repository. No claims of complete Pi compatibility, exactly-once external effects, malicious-filesystem confinement, TUI, cross-provider coverage or performance advantage follow from these checks.

## Relationship to upstream

Fixed upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`: source inspection of `packages/coding-agent/src/core/tools/write.ts` confirms `{path,content}`, create/overwrite and automatic parent directories. `bash.ts` confirms `{command,timeout?}` (seconds) and nonzero process exit becoming an error. These inputs/effects informed the independent scenario. This report alone does not claim execution of original upstream write/bash; dedicated oracle evidence, if added, must name its exact compared scope. M1 truncation oracle was independently rerun; see round2-baseline.md.

## Final clean-candidate verification — 2026-09-07

Status: **verified** for the deterministic scope above. This supersedes only the earlier `clean candidate verification pending` status; it does not upgrade live inference or full compatibility claims.

A new detached worktree and fresh target directory were created at `/tmp/pi-rs-m2-final` (macOS canonical path `/private/tmp/pi-rs-m2-final`) at exact candidate **`89b4796537f159abd76758535d8678d3d888cd17`**. The earlier M1 checkout remains separate. Executed:

```sh
git worktree add --detach /tmp/pi-rs-m2-final 89b4796537f159abd76758535d8678d3d888cd17
cd /tmp/pi-rs-m2-final
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
python3 scripts/demo-coding.py
python3 experiments/verify-runtime.py
python3 experiments/round2-coding.py
sh scripts/bootstrap-upstream.sh
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
node prototype/test-extension-sidecar.mjs
node --experimental-vm-modules experiments/write-differential.mjs
git status --short
rustc --version
node --version
git rev-parse HEAD
```

All commands succeeded. Results:

- Build and strict clippy passed. Rust **17 tests passed**: 5 coding tools, 6 legacy runtime, 6 session/recovery tests; zero failures.
- Public coding demo passed both CLI processes and real tests. Printed `Verified actual failure -> write -> passing test -> process exit -> follow-up -> passing tests.` Retained ephemeral evidence: `/private/tmp/pi-rs-m2-final/.runs/coding-bmz8gw1b/session.json` and sibling repository/fixture. It used scripted decisions, not inference.
- M1 HTTP-double checks **13/13 passed**; independent M2 checks **28/28 passed**, including the real-effect crash injection. Python bytecode caching is suppressed in the independent script via `PYTHONDONTWRITEBYTECODE=1`; the public demo uses `python3 -B`.
- Fixed upstream bootstrap resolved `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`; original/Rust truncation **36/36 passed**; unchanged protected-paths extension sidecar **7 cases passed**.
- Original write differential **4/4 passed** (nested create, overwrite, UTF-8, empty). Five loaded original modules were clean; zero forbidden stub calls. This verifies the instrumented tool-body filesystem/result profile documented in `write-differential.md`, not TypeBox validation, wrappers/renderers, complete Pi installation or bash equivalence. Node emitted expected experimental TypeScript/VM warnings, not test failures.
- Final `git status --short` produced no output; generated differential evidence matched tracked bytes. Rust was `1.98.1 (48a229cea 2026-09-01)` and Node `v22.18.0`; final HEAD matched the exact candidate above.

No new failure or counterexample was observed in the final clean run. No source was changed by this verifier. No real provider request was made; the live-model acceptance remains **unverified**. Coordinator separately owns secret/scope review and push.

# M3 exact-match edit profile

Status: **verified on working integration for 20 fixed cases; clean candidate pending**. Frozen cases in `edit-cases.json` were executed against pinned Pi `9767ba275f3e9a5ee0f5c5342249b629ab1b2282` before Rust comparison. `edit-original-results.json` records original outcomes and the fixture SHA-256. Do not change expected outcomes to hide a mismatch.

```sh
export PATH="$HOME/.cargo/bin:$PATH"
sh scripts/bootstrap-upstream.sh
node --experimental-vm-modules experiments/edit-differential.mjs --original-only
cargo build --locked
node --experimental-vm-modules experiments/edit-differential.mjs
```

Sixteen fixed cases cover single, multiple noncascading original-text replacements, reverse order, adjacent ranges, duplicate match, overlapping ranges, repeated edit, empty old text, empty edits, no-op, missing match after a valid edit, attempted cascading match, BOM/CRLF preservation, lone-CR normalization, Unicode and deletion. Each case asserts the original outcome and full file bytes against a fixed expectation; differential mode additionally asserts Rust success/error and exact full-file byte equality. Errors must leave the original bytes unchanged. Error prose, success prose, rendered diffs and patch details are not compared.

## Instrumentation and scope

The harness uses the unchanged original `createEditToolDefinition(...).execute(...)`, default filesystem operations, original matching/replacement functions in `edit-diff.ts`, BOM handling and line-ending handling. Node strips TypeScript syntax; all imported original files must have clean Git status and recorded SHA-256 hashes. Built-in filesystem modules are real.

Explicit shims: TypeBox constructors are identities (schema validation excluded); renderer object is empty; wrapper and cross-spawn throw if used. `diff.diffLines` returns an empty array and `diff.createTwoFilesPatch` returns an empty string, with invocation counts recorded. These are display-only results generated **after** file writing. The core matching and applying algorithm is neither stubbed nor reimplemented. Rendered diff correctness and failures after writing are outside this profile.

The harness separately **executes** original smart-quote fuzzy matching, legacy top-level `oldText`/`newText` preparation, and stringified `edits` preparation. Pi succeeds on these, while the proposed Rust profile intentionally only accepts array arguments and exact text after newline normalization. These exclusions are evidence of a narrower profile, not full compatibility. They are not silently dropped failure cases. Fuzzy matching, preparation, cancellation, queue concurrency, permissions, malformed UTF-8, path normalization and complete loader/provider/session behavior remain outside the sixteen-case claim.

No model inference occurs. Node experimental VM/TypeScript warnings are expected.

## Independent adversarial extension and corrected defect

The original sixteen fixtures remain unchanged. Four additional frozen cases are in `edit-adversarial-cases.json`: exact straight-quote text with a smart-quote duplicate; NFKC full-width duplicate; overlapping self-match (`aaa`, replace `aa`); and whitespace-only matching (`  `, replace ` ` with `x`). These were first executed against the original and saved in `edit-adversarial-original.json` before comparison.

**Tested failure, now superseded by a verified repair:** the first Rust comparison passed the first three but rejected the whitespace case. Original Pi produced `x `: it chooses the first exact match and checks duplicate count in fuzzy-normalized space, where these spaces normalize to empty. Rust additionally rejected multiple literal matches. The verifier reported this concrete counterexample to the implementation worker; the worker removed that extra rejection and added its own regression. The fixed input and expected bytes were not changed. A repeated run after a quota interruption still failed before the repair; that interruption itself was a partial agent run, not a code-test failure.

After the worker reported the fix, an explicit rebuild and both differential commands passed **16 + 4 cases** on the working integration. `edit-results.json` and `edit-adversarial-results.json` are the final outputs. Three excluded behaviors (fuzzy-only text, legacy preparation, stringified edits preparation) were also actually submitted to Rust: Pi succeeded, Rust explicitly returned errors and left its file unchanged. This establishes the narrower scope with observed differences.

```sh
cargo build --locked
node --experimental-vm-modules experiments/edit-differential.mjs
EDIT_CASES=experiments/edit-adversarial-cases.json node --experimental-vm-modules experiments/edit-differential.mjs
```

Clean integrated candidate verification is still pending. No live inference occurred.

## Final clean M3 candidate — verified 2026-09-07

Exact candidate **`29727771e457e6cbbb8cebef18c02907ac9255b5`** was checked out into a new detached worktree `/tmp/pi-rs-m3-final` (canonical `/private/tmp/pi-rs-m3-final`) and built with a fresh target directory. This supersedes the pending-clean status above. Executed commands:

```sh
git worktree add --detach /tmp/pi-rs-m3-final 2972777
cd /tmp/pi-rs-m3-final
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
python3 scripts/demo-coding.py --edit
python3 experiments/round2-coding.py
sh scripts/bootstrap-upstream.sh
node --experimental-vm-modules experiments/edit-differential.mjs > /tmp/pi-rs-m3-edit-main.json
EDIT_CASES=experiments/edit-adversarial-cases.json node --experimental-vm-modules experiments/edit-differential.mjs > /tmp/pi-rs-m3-edit-extra.json
cmp experiments/edit-results.json /tmp/pi-rs-m3-edit-main.json
cmp experiments/edit-adversarial-results.json /tmp/pi-rs-m3-edit-extra.json
git status --short
git rev-parse HEAD
```

All commands passed: **25 Rust tests** (5 coding tools, 6 exact edit, 2 edit runtime, 6 legacy runtime, 6 session), strict clippy, real edit demo, **28 M2 regression checks**, **16 + 4 original/Rust edit cases** and the **3 observed exclusion cases** in each differential run. Fresh upstream bootstrap obtained the pinned commit. The regenerated JSON reports matched tracked evidence byte-for-byte. Git status was empty and HEAD matched the exact candidate. No code was changed during clean verification.

The demo printed `Verified actual failure -> edit -> passing test -> process exit -> follow-up -> passing tests.` Its retained session is `/private/tmp/pi-rs-m3-final/.runs/coding-zxto8zl5/session.json`. It uses scripted model decisions but real repository edits/tests and separate CLI processes. Node emitted the documented experimental VM/TypeScript warnings only. No new mismatch was observed. Live model inference and excluded compatibility profiles remain unverified/unsupported as described above; unrelated write/truncation probes were not redundantly rerun in this M3 final check.

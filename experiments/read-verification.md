# M4 text read validation

Original reference: Pi 9767ba275f3e9a5ee0f5c5342249b629ab1b2282. Worker-created original fixtures and black-box scripts were retained when account quota interrupted the worker. Coordinator completed integration and executed them; final checks are coordinator-run, not a newly completed independent agent review.

Commands from repository root (Cargo PATH required):

```
cargo build --locked
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
node --experimental-vm-modules experiments/read-differential.mjs
python3 experiments/read-resume.py
python3 experiments/round2-coding.py
cargo build --locked --manifest-path compatibility/Cargo.toml
node experiments/compare-truncate.mjs
```

Observed: all existing Rust tests plus new pagination/raw-edit regression tests passed (32 total after rounding regression); 19 original/Rust read cases matched exact text/errors; 9 read-resume HTTP-double checks; 28 coding regressions; 36 shared truncation cases. No live inference.

Original read.ts text branch executes with real filesystem operations and unchanged slicing/truncation. Schema/render/image-related dependencies are instrumented; image detection is forced to text. See harness and recorded source hashes. No image, loader, schema-validation or cancellation compatibility claim. Original zero offset, zero limit and source >8MiB succeed where Rust rejects: these three exclusions are executed and recorded, not counted as parity cases. Unsafe fallback paths are shell-quoted instead of upstream raw interpolation. Rust rejects invalid UTF-8/binary content and restricts workspace paths.

Coordinator corrections: removed false-positive BMP-prefix rejection (ordinary text starting BMR must read); source cap/positive usize checks keep allocation/indexing bounded. Size hint now rounds positive binary-unit ties upward like JS toFixed, instead of Rust ties-even; 52480-byte line regression expects 51.3KB. Raw edit input remains separate to prevent writing truncated content/notices back to disk.

Clean-checkout confirmation is appended after candidate verification. No full Pi compatibility or real-model claim.

## Clean candidate execution

Coordinator created fresh detached `/tmp/pi-rs-m4-final` at `bf37af7`, built from a new target directory, and ran build, all 32 Rust tests, strict clippy, 9 read-resume checks and 28 M2 checks successfully. No live model.

Unresolved reproduction failure: after bootstrap to the pinned upstream, `node --experimental-vm-modules experiments/read-differential.mjs` in that clean checkout terminated with exit 139, no useful output. One identical retry failed; explicitly selecting the documented Node 22.18 binary also failed. Stop identical retries. The working-checkout 19-case comparison passed earlier, but clean-checkout original-read comparison is NOT verified. Next investigation should isolate Node VM/TypeScript loader behavior by module and avoid assuming this is Rust failure or waving away the harness crash. This limitation does not erase successful Rust and HTTP tests.

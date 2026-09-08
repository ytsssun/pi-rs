# Async plugin execution boundary — starting dc3393c

Status: tested subset, not full compatibility or a selected transport.

The independent source-derived harness loads actual pinned Pi extension factories,
runner and registered-tool wrapper. It exposes the original private
`executePreparedToolCall` by appending an export to its unmodified source body;
unused model dependencies fail explicitly. It compares the same scenarios against
a new Rust acknowledgment ledger. No model/credentials or vendor source edits.

Rust owns update acceptance and completion readiness in `examples/async_kernel.rs`.
JS retains closures, the original AbortSignal, event sinks and maps their completion
to ledger acknowledgments in `prototype/architecture/async-executor.mjs`. Per-call
Unix server/helper spawning remains an experiment, not a performance design.

Initial three scenarios pass exact normalized comparison: success, tool throwing a
string, cooperative abort with a string reason. Assertions cover two updates, raw
versus validated argument placement, delayed sink completion, ignoring callbacks
after tool settlement (including during drain), and error-result conversion.
An update after abort but before tool settlement is accepted by pinned upstream;
rejecting every update as soon as cancellation is requested would be incompatible.

The `--fire-and-forget-counterexample` substitutes an adapter that discards sink
Promises. It fails exit1 at `executor must await pre-settlement asynchronous update
sinks`, actual true versus expected false. This verifies the harness rejects that
specific missing barrier. It is an intentionally flawed adapter, not an upstream
bug. No performance conclusion follows from the elapsed experiment time.

Reproduce:
```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example async_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/async-tool-parity.mjs
```
Append `--fire-and-forget-counterexample` for expected exit1. Dependencies/runtime
caveats: docs/real-plugin-host.md. Source hashes and normalized trace are in
experiments/async-tool-parity-results.json; independent review in
async-tool-contract-review.md.

Still required: Rust-originated cancellation and opaque reason identity,
cancellation while blocked in sync RPC, host death/drain cleanup, admission,
concurrency, native binding alternative, UI factory identity, real Pi session
persistence and end-to-end integration. Original JS signal reuse is explicitly not
proof of a Rust cancellation protocol. Current results cannot establish full
plugin compatibility. The core/host boundary must preserve both synchronous calls
and asynchronous sink completion, not only serializable tool inputs/outputs.

## Independently discovered error-path failures and repair

Initial three-case pass was insufficient. Reviewer extended the source-derived
suite and reproduced two failures before correction:

- A sink rejects with `undefined`: upstream rejects execution, while the initial
  bridge tested error truthiness and returned tool success.
- One sink rejects while another remains pending: upstream's Promise.all rejects
  after tool settlement without waiting for the peer; Rust incorrectly waited for
  every acknowledgment. The bounded test observed `still-waiting`, then released
  the peer to clean up.

The bridge now tracks rejection separately from its value and preserves its first observed
rejection. Multiple pre-settlement rejections may differ from upstream Promise.all
attachment ordering; that case is unverified (see independent review). Rust distinguishes a rejecting sink acknowledgment from successful
completion: tool settlement plus either all acknowledgments or a sink failure
permits termination. JS rethrows the original reason; later peer completions skip
RPC after adapter termination. All five scenarios now compare equal. No arbitrary
multi-rejection ordering, synchronous sink-throw or death-during-drain claim.

The failures and independently executed commands remain in the review document.
This strengthens the architecture requirement: Rust must distinguish tool failure
from event-consumer failure, while JS must retain error identity rather than
serializing every thrown value through JSON. Current result data is JSON-valued;
full arbitrary extension result identity remains an unresolved seam.

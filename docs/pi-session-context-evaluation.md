# Actual Pi session + context editing — starting c90c0e4

Status: tested TS-host persistence seam, not a Rust session implementation.
Reference Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains unchanged.

## Executed acceptance

Original SessionManager writes real Pi session files into temporary directories;
original loader/runner/wrapRegisteredTool runs unchanged examples/extensions/todo.ts.
The host gained only optional extensionPaths/sessionManager injection; existing
Kimi/default guard behavior is unchanged, and the previous combined architecture
result was rerun and byte-compared equal.

Both TS and Rust context projection pass the same sequence:

1. Persist actual Todo add(alpha) result including details, policy2 custom entry,
   add(beta), then policy reset on that branch.
2. Branch back to policy2; emit session_tree so Todo reconstructs its JS state;
   append an experiment marker as a child, making the selected leaf durable.
3. Verify Todo list is alpha, policy is2, projected text truncates but canonical
   message contents and plugin details remain unchanged.
4. Spawn another Node process. Load the same real session file and unchanged plugin;
   emit session_start. Restore alpha and policy2; add gamma with ID2, not ID3;
   append policy reset and verify full canonical tool text returns to context.
5. Reopen again with a new plugin host: alpha/gamma and nextId3 restore, policy
   reset is null and tool text remains full. All3policy history records remain.
   Original file bytes are still
   an exact prefix, retaining abandoned beta branch and original canonical results.

The policy uses experiment-specific custom entries (`pi-rs.context-policy.v1`),
which upstream SessionManager excludes from model context. This is an extension
strategy being tested, not an upstream built-in policy contract. Projection uses
actual Rust Session.context through a fixture executable, with only one-text-block
Pi tool results mapped across. Other message fields/details are kept intact.

Negative `--all-entries-counterexample` reads policy from global getEntries rather
than getBranch. It exits1, `policy must follow current branch, not latest entry on
abandoned branch`, null versus2. The test stops at the first TS case; shared adapter
risk applies to the Rust path but the negative did not separately run that path.
Source review independently reproduced additional upstream behaviors: branch()
alone is not durable, and a fresh session with no assistant may not yet write a
file. Neither is an upstream bug; adapters must preserve the actual contract.

## Architecture implications

Session trees and plugin reconstruction are core compatibility work, not a storage
format detail. Native JSON sessions in the current pi-rs CLI are insufficient for
this contract. Keeping original SessionManager made these tests possible, but does
**not** prove Rust owns canonical state. That claim remains false for this probe.

Next integration milestone: implement a Rust Pi session index over the pinned
format, exposing current branch and model context with differential fixtures, then
connect unchanged Todo restoration to that Rust authority. Begin read-only to
isolate tree/context correctness; follow with append/branch/reopen parity before
calling it a session replacement. Existing TS manager remains the oracle, not a
second authoritative core. Include missing parents, selected leaf, custom records,
compaction and version handling as explicit obligations; do not silently normalize
or discard unknown entries to make fixtures pass.

This is required work for the user's Rust-core/full-plugin goal. Node-API remains
the primary integration candidate from native-seam-evaluation.md; this cycle did
not benchmark transport or exercise native binding session methods. Actual UI
factory host/disposal and async lifetime checks remain alongside session ownership.

## Reproduction and limits

```
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked --example context_projection
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-session-context.mjs
```

Append `--all-entries-counterexample` for expected failure. Results/plugin hash:
experiments/pi-session-context-results.json. Independent evidence:
docs/pi-session-review.md. Setup/version caveat: docs/real-plugin-host.md.
Temporary directories removed; child has PATH+TSX config only, no API credentials.

No live model, AgentSession orchestration, full message schema, compaction, damaged
files, concurrency, crash recovery, UI lifecycle, Rust session parser or full
compatibility proof. Tool calls and lifecycle events are manually driven by the
harness. Successful reads do not imply the upstream app accepted every possible
session nor prove that all plugins restore. No performance conclusion.

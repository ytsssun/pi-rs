# Native JS/Rust seam evaluation

Starting commit68f5369; Pi9767ba275f3e9a5ee0f5c5342249b629ab1b2282 remains the
reference. Status: tested prototype; architecture recommendation proposed.

## What actually ran

A Rust cdylib registers four synchronous Node-API methods: dispatch a JS closure,
read/write a Rust-owned scalar registry, and invoke an AbortController's abort
method. The experiment uses no new dependencies and does not change production
packaging. Darwin arm64 / Node22.18.0 is the executed platform; Linux build branch
exists but has not run. Native handles are never retained beyond the callback and
no Rust background thread calls JS. This avoids testing unimplemented handle/async
lifetime machinery while making those limits explicit.

The original Kimi extension is loaded unchanged through the original loader,
runner and registered-tool wrapper. TS control and native state compare equal:
search activates Calculator, wrapper emits addedToolNames, Calculator returns42.
Separate nested dispatch proves Rust state can be read/written synchronously from
inside a JS callback without an outstanding Rust borrow/lock.

Same-reference assertions cover a cyclic object, Symbol/method result, Promise,
thrown undefined/null/Symbol/object/Error, and a throwing property getter. Native
abort invokes the real JS AbortController with its receiver intact: listener runs,
sees identical object reason, and synchronously reenters native state. This is
native-invoked cancellation triggered by the test, not an autonomous Rust scheduler
or cancellation from another thread.

Actual upstream Text and Theme objects survive callback passage by identity. Text
mutation/render and a captured background function still work. This is not an
interactive UI run: actual widget/custom host mounting, focus, disposal and event
ordering remain untested. Naive JSON cannot encode the cyclic object and removes
Text methods. That counterexample rejects copying those objects as JSON; an IPC
host retaining them behind identifiers is still an alternative, not disproven.

Independent review found raw UTF8 scalar state replaced a lone JS surrogate. The
JSON registry envelope escaped it, but the exported scalar method was not lossless.
Changed storage/interface to UTF16 and added lone-surrogate, embedded NUL/emoji and
empty-string tests. Reviewer then caught an incorrectly typed create-string FFI
pointer (same observed ABI, wrong Rust declaration); corrected to *const u16 and
removed casts. Both historical findings remain in native-seam-review.md.

## Architectural judgment from the combined evidence

**Use Node-API with the upstream JS host as the primary integration candidate.**
This is a reversible development choice, not a declaration that the final design
or full compatibility is established. Keep the current process IPC experiments as
comparison fixtures. Do not turn the hand-written FFI prototype into the production
binding layer without lifecycle/type/error review and target-platform tests.

| Candidate | Evidence | Remaining cost or risk |
| --- | --- | --- |
| TS fork | Same context-editing projection and hook ordering already tested against Rust | Lowest semantic distance for existing plugins; does not satisfy Rust-owned core objective by itself |
| JS host + helper-based IPC | Persistent Rust state/dispatch supports sync plugin reentry; five async prepared-tool cases pass | Requires framing/correlation/ack/recovery machinery; raw copies lose JS identities; helper overhead not measured; multiple rejection ordering remains unresolved |
| JS host + Node-API | Same unchanged plugin behavior, same-process identity, nested callback and native-invoked abort demonstrated | Native crash shares host process; handles, environment lifetime and thread dispatch need explicit ownership; distribution matrix untested |

TS is natural for the plugin host, but the tests contradict the stronger claim that
plugin execution requires *all* runtime state and decisions to remain TS. Context
editing alone is not a technical justification for rewriting: the TS control already
performs the demonstrated policy. The reason to continue Rust is the user's stated
ownership/evolution objective, not an inferred speed benefit or impossibility in TS.

Proposed ownership: Rust owns canonical runtime state, scheduling decisions, context
policy and recovery state; JS owns upstream module loading, closures/objects,
UI/provider adapters and local event-loop execution. Typed commands/notifications
cross the seam; opaque JS values stay in JS or validated native references. The
current prototypes have not yet implemented all those responsibilities. Do not let
compatibility adapters silently grow into a second authoritative TS core.

Next decisive integration: real upstream SessionManager + context policy roundtrip
and plugin restore lifecycle, plus an actual UI factory host invocation. Then audit
the inventory and write the architecture decision with remaining implementation
obligations. Full ecosystem compatibility remains the target; no untested plugin
category is removed by this provisional transport choice.

## Reproduction and sources

```
scripts/build-native-seam.sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-seam.mjs
```

Results: experiments/native-seam-results.json (source hash included); independent
review: docs/native-seam-review.md. Dependency setup: docs/real-plugin-host.md.
Node22.18.0 runs these probes but remains below upstream's declared22.19 minimum.
Pinned Node-API interface documentation:
https://nodejs.org/download/release/v22.18.0/docs/api/n-api.html
Local matching headers were inspected under Node's22.18.0 node-gyp cache. Node-API
callback handles are scoped; this prototype does not prove long-lived reference or
cross-thread safety. No performance, isolation or full-compatibility claim.

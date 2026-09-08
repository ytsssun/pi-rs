# Independent native Pi store review

Status: **seven frozen writer cases and native lifecycle checks independently verified**.

Starting commit: `123dc3f` (coordinator's integration starts after this writer checkpoint).
Pinned Pi upstream: `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.

## Requirements frozen before integration

Reuse all seven independently authored `experiments/pi-write-cases.mjs` cases unchanged. Reuse the unchanged Todo plugin recovery driver through a native adapter; inspect that each restore uses a fresh Node process and that source/disk preservation assertions remain intact. These are deterministic compatibility fixtures, not live model tests.

Additional binding requirements: independent session handles must not share mutable state; closed handles must fail even after new instances open; handles from another Node worker environment must fail; bounded repeated create/close must restore the registry count. An initial review proposal to require a maximum registry capacity was withdrawn: neither upstream nor the user requires an arbitrary per-environment session maximum, and introducing one would itself restrict compatibility. Environment shutdown must not crash when handles remain open. Successful shutdown alone does not demonstrate that each Rust allocation was freed.

## Node lifetime contract

Local Node version is v22.18.0. Headers in `~/.nvm/versions/node/v22.18.0/include/node/js_native_api.h:579` declare `napi_set_instance_data(env, data, finalize_cb, hint)` and `napi_get_instance_data(env, &data)` under Node-API >= 6. `js_native_api_types.h:146` declares `napi_finalize` as a callback with three pointer parameters returning void.

The [versioned Node documentation](https://nodejs.org/download/release/v22.18.0/docs/api/n-api.html#napi_set_instance_data) specifies that the finalizer receives instance data during environment teardown. Calling set-instance-data again overwrites the old pointer without running its finalizer. Registration must therefore avoid losing an existing allocation.

[Environment finalization](https://nodejs.org/download/release/v22.18.0/docs/api/n-api.html#finalization-on-the-exit-of-the-nodejs-environment) can occur with JavaScript execution disallowed, including worker termination. The finalizer should only drop independently owned Rust data, without JS callbacks or assumptions about other finalizers' order. Source review and worker exit tests will be distinguished from direct allocation-drop evidence.

## Verification results

Independent commands, all exit 0:

```sh
python3 scripts/build-native-session.py
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-write-cases.mjs "$PWD/prototype/architecture/native-store-backend.mjs"
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-store-todo.mjs --native
node experiments/native-store-lifecycle.mjs
```

The frozen writer differential reports seven passing scenarios. Todo verifies three distinct Node processes, alpha restored without abandoned beta, gamma persisted, nextId 3, policy reset persisted, and append-only canonical prefix. The reviewer inspected the native switch forwarding to all child processes and the driver’s unchanged assertions. Fixture assistant/tool messages are explicitly persisted by the driver; this is not an autonomous model loop.

The independently authored lifecycle script exercises malformed JSON and wrong argument types, failed open without registry allocation, two simultaneous isolated stores, stale handles after replacement allocation, foreign worker handles rejected in both environments, natural worker exit while retaining an open store, and 64 bounded creates followed by closes restoring count to zero. It uses no credentials.

Source inspection found registration initially unconditionally replacing instance data. The reviewer supplied the documented overwrite hazard; the coordinator added rejection of existing instance data before allocation. This is a source-derived preventive fix, not a reproduced memory leak. The checked environment-ID increment also avoids wrapping identifiers. No Rust borrow crosses a JS callback; current request dispatch contains no JS callbacks at all.

After inspecting the coordinator's diagnostic implementation, the reviewer extended the lifecycle script to assert exact deltas after both natural worker exit and explicit `worker.terminate()`. Both workers retain one unclosed store. The result is two Registry Drop calls and two retained stores recorded at Drop, with the main environment's two stores still present and usable. Natural worker exit is 0; requested termination is 1 as expected. After the final explicit closes the main count is zero.

The diagnostic counters execute inside `Registry::drop`, before Rust automatically drops the HashMap fields. This directly confirms teardown enters the Rust destructor with the expected retained stores; together with source inspection it supports this ownership path. It is not allocator instrumentation, a proof that every nested allocation is reclaimed, GC-triggered per-wrapper cleanup, or a memory benchmark. There is no persistent JS reference in this adapter.

Collaboration: the verifier reused seven earlier source-derived writer scenarios and the coordinator's Todo driver after checking its scope. The coordinator used the review's Node teardown constraint, and the reviewer used the coordinator's pure-Rust Drop diagnostics to independently test both shutdown paths. No user intervention was needed. No live model or provider calls were made. Full Pi API compatibility, object-reference liveness of JSON-shaped session getters, packaging on other platforms, concurrent writes and crash guarantees remain unverified.

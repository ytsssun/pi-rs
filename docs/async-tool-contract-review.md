# Prepared-tool async contract review

Status: **tested**, 2026-09-07. Independent worker `async_contract`; coordinator owns Rust implementation. This review derives acceptance from the pinned upstream source before comparing the Rust adapter. It does not establish complete Pi compatibility.

Reference: upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`, `packages/agent/src/agent-loop.ts:677` (`executePreparedToolCall`) and `:767` (`createErrorToolResult`). `experiments/upstream-async-tool.mjs` records the source SHA-256 at execution. It strips TypeScript and appends a private-function export without changing the function body. Unused imports throw if called. The synthetic plugin is registered through the actual upstream loader/runner and invoked through actual `wrapRegisteredTool` and `wrapToolDefinition`; its extension context comes from the real runner. No network, provider or credential is involved.

## Frozen assertions and results

- **Success, tested:** two partial updates reach the sink in call order, original raw tool-call arguments appear in events while validated arguments reach execution, and executor completion waits for deliberately withheld asynchronous sink completion. A retained update callback invoked after wrapped-tool settlement, both during sink drain and after final completion, is ignored.
- **Thrown string, tested:** the same update barrier and late-update rules hold when the tool throws. The exact result is `{result:{content:[{type:"text",text:"deliberate thrown string"}],details:{}},isError:true}`. This checks the non-`Error` conversion branch independently of a Rust implementation.
- **Cooperative abort, tested:** tool execution receives a usable JS `AbortSignal`. Abort after start preserves the string reason `user-stop`; the tool emits one final partial update and throws `Error("cancelled: user-stop")`, which becomes an error result. An update after signal abort but before tool settlement remains accepted in upstream. Suppressing every update on abort would change this behavior.

Original upstream and coordinator's initial `executePreparedRust` both independently executed those three cases with exit status 0. The Rust run occurred after `examples/async_kernel.rs` had been built by the coordinator. These are deterministic contract tests, not live-model verification. Expanded rejection cases then disproved broader parity; initial success must not be read as coverage of event-sink failures.

### Preserved pre-fix failures

Both were discovered by extending the same source-derived fixture, without accepting implementation behavior as the contract. The combined command `TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/async-tool-parity.mjs` completed its upstream branch and failed its Rust branch:

1. **Tested, exit 1:** a sink returns `Promise.reject(undefined)` and the tool succeeds. Upstream rejects execution with `undefined`; Rust returned tool success. Exact assertion: `a sink rejection with undefined must reject executor, not return tool success`, actual `false`, expected `true`. Cause in initial JS adapter: truthiness check `if (deliveryError)` conflated rejection with presence of a truthy error value.
2. **Tested, exit 1:** first sink rejects `undefined`, second sink remains pending, and the tool succeeds. Upstream rejects without waiting for the pending peer. Rust stayed pending beyond a bounded 1000 ms observation, until test cleanup released the second sink. Exact assertion: `sink rejection must short-circuit another pending sink after tool settlement`, actual `still-waiting`, expected `rejected`. Cause: initial Rust completion barrier demanded all acknowledgements even after sink rejection. The fixture releases the peer in `finally` and awaits cleanup; this is not an intentionally leaked or unbounded process.

The observation timeout is only a bounded liveness counterexample, not a performance comparison. The original source uses `Promise.all(updateEvents)` in success and catch paths, so it short-circuits on rejection after execution settles. A fix must still wait for the tool itself to settle and preserve the first rejection reason, including a falsy value.

Fix verification: **tested**, independent rerun of the combined command exited 0 after the coordinator added a distinct JS rejection flag and Rust `reject` transition. All five case outputs compared equal with upstream. The two initial implementation defects are now **superseded by the tested fix**; their failed assertions remain above as historical evidence. Rust waits for tool settlement but may end with another sink still pending once a sink has rejected. JS skips further transport writes after completion. This is evidence for these five cases only.

Negative control, **tested**: a deliberately incorrect executor that calls the async sink without awaiting its returned promises fails exit 1 with `executor must await pre-settlement asynchronous update sinks` (`actual true`, `expected false`). The suite therefore detects a plausible result-ordering regression instead of merely accepting returned tool text.

## Reproduction

From repository root with pinned upstream dependencies already installed:

```sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/upstream-async-tool.mjs
cargo build --locked --example async_kernel
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs --input-type=module -e 'import { exercise } from "./experiments/upstream-async-tool.mjs"; import {executePreparedRust} from "./prototype/architecture/async-executor.mjs"; const deadline = setTimeout(()=>process.exit(2),20000); try {console.log(JSON.stringify(await exercise(executePreparedRust),null,2));} finally {clearTimeout(deadline);}'
```

Negative control (expected exit 1):

```sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --experimental-vm-modules --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs --input-type=module -e 'import {exercise} from "./experiments/upstream-async-tool.mjs"; await exercise(async(p,s,emit)=>({result:await p.tool.execute(p.toolCall.id,p.args,s,partialResult=>{void emit({type:"tool_execution_update",toolCallId:p.toolCall.id,toolName:p.toolCall.name,args:p.toolCall.arguments,partialResult});}),isError:false}));'
```

Environment: Node v22.18.0; upstream runtime declaration requires a later patch version as already recorded in `real-plugin-host.md`. Successful execution on this environment is evidence for these experiments only.

## Limits and next evidence

`executePreparedToolCall` does **not** decide whether to admit an already-aborted call. Source `prepareToolCall` checks the signal at lines 637/655; the parallel scheduler also has admission checks. Calling this private function with pre-aborted input and inferring normal agent scheduling would be invalid.

The coordinator adapter retains the caller's JS signal. These tests do not prove Rust-originated cancellation transport, arbitrary object-valued reason identity, cancellation of a non-cooperative plugin, scheduling multiple active tools, persisted pending updates, or an integrated Rust agent loop. The local prototype must not be called a process sandbox.

Asynchronous sink rejection with an `undefined` reason and a held peer is now exercised and initially **failed** Rust comparison, then passed after correction, as preserved above. Multiple rejecting sinks and synchronous sink exceptions have distinct paths not yet covered. In particular, upstream installs `Promise.all` handlers after tool settlement whereas this adapter handles rejections eagerly: when multiple sinks have already rejected, array-order versus chronological-order error selection may differ. That is a source-based **unverified hypothesis**, not a passing claim. These cases must be tested before claiming complete sink-error parity. Progress/result object identity, UI closures and provider streams also remain outside this JSON-valued experiment.

The initial callback tests are not superseded; their synchronous reentry results remain useful. This experiment adds a distinct asynchronous completion obligation. The coordinator consumed the exported fixture unchanged for its independent Rust comparison, avoiding separately implemented acceptance criteria.

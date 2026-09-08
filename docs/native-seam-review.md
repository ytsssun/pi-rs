# Independent native seam review

Status: **tested**, 2026-09-07. Worker `native_review` owns only this review; coordinator owns implementation and combined harness. Starting repository commit `68f5369705a03cf5cea31e3906a15331c52d36df`; pinned Pi upstream `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`. These are deterministic architecture experiments, with no provider/model request or credential access.

## Acceptance derived from sources

Upstream `packages/coding-agent/src/core/extensions/types.ts:174` passes live TUI and Theme objects to widget/header factories; `:198` permits a custom factory returning a Component or Promise of Component with disposal callbacks. Theme setters accept actual Theme objects (`:280`). Therefore a bridge cannot substitute arbitrary JSON snapshots for all plugin-facing objects. Keeping those objects and closures in the existing JS host is compatible with either a native core or a suitably routed IPC core; native is not automatically required by this observation.

The concrete UI probe proposed before implementation uses unchanged upstream `Text` (`packages/tui/src/components/text.ts`) and `loadThemeFromPath` (`packages/coding-agent/src/modes/interactive/theme/theme.ts:555`), passing Theme and returning Text through the callback seam. Strict equality, `instanceof`, rendering after `setText`, and a retained background-render callback expose identity/prototype/closure loss without requiring a real terminal. This does not cover interactive focus, overlays, keyboard routing, disposal or actual UI lifecycle.

Local ABI declarations inspected: `/Users/stevensun/Library/Caches/node-gyp/22.18.0/include/node/js_native_api.h`, especially `napi_call_function`, `napi_get_cb_info`, pending-exception and handle-scope functions. [Official Node-API lifetime and exception documentation](https://nodejs.org/api/n-api.html#object-lifetime-management) establishes that callback-local handles must not be retained after return without references; pending exceptions require appropriate propagation. Background Rust work cannot directly operate on these JS-thread handles.

## Raw FFI inspection

`prototype/native-seam.rs` confines handles to each native callback; it retains only Rust UTF-16 code units, not JS handles. No Rust borrow or mutex survives the call to JS, allowing nested reentry. Abort uses the controller as receiver, preserving the method's `this`. Failed calls inspect pending exceptions rather than converting all exceptions into new errors. Current fallible value calls check statuses; failure-path error reporting itself has no further recovery. No extra handle scope is needed for these short synchronous callbacks, which already have a callback scope.

These findings apply to this probe only. Thread-local state is not isolated by Node environment or Pi session. Rust allocation failure/panic and native process crashes lack a recovery boundary. There are no persistent JS references, garbage-collection lifetime tests, worker-thread dispatch, native async scheduling or platform packaging tests. A production binding would need ownership and environment cleanup design; copying this raw FFI file into runtime would not satisfy that obligation.

## Independent execution

Node v22.18.0, macOS. After coordinator built `target/native-seam.node`, this independently authored input exited **0**, checking 12 cases: falsy and object/Symbol thrown-value identity, throwing getter identity, invalid callback rejection, nested reentry, controller reason identity and listener reentry, and escaped-string state roundtrip.

```sh
node --input-type=module <<'JS'
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const n=createRequire(import.meta.url)('./target/native-seam.node');
let cases=0;
for (const reason of [undefined,null,false,0,'',Symbol('reason'),{custom:'reason'}]) {
 let caught=false;try {n.dispatch(()=>{throw reason},{});} catch(e) {caught=true;assert.equal(e,reason);}
 assert.equal(caught,true);cases++;
}
const sentinel={sentinel:1};
assert.throws(()=>n.abort({get abort(){throw sentinel;}},{}),e=>e===sentinel);cases++;
assert.throws(()=>n.dispatch(3,{}));cases++;
n.setState('before');
const object={};
assert.equal(n.dispatch(value=>{assert.equal(value,object);n.setState('nested');return n.dispatch(()=>value,0)},object),object);
assert.equal(n.getState(),'nested');cases++;
const controller=new AbortController();let called=0;
controller.signal.addEventListener('abort',()=>{called++;n.setState('aborted');});
n.abort(controller,sentinel);assert.equal(controller.signal.reason,sentinel);assert.equal(called,1);assert.equal(n.getState(),'aborted');cases++;
n.setState('\ud800');const rawSurrogatePreserved=n.getState()==='\ud800';
n.setState(JSON.stringify({value:'\ud800'}));assert.equal(JSON.parse(n.getState()).value,'\ud800');cases++;
console.log(JSON.stringify({independent_cases:cases,rawSurrogatePreserved,jsonEnvelopeSurrogatePreserved:true,node:process.version}));
JS
```

Observed pre-fix output:

```json
{"independent_cases":12,"rawSurrogatePreserved":false,"jsonEnvelopeSurrogatePreserved":true,"node":"v22.18.0"}
```

**Tested counterexample, subsequently fixed:** raw JS strings containing an unpaired surrogate did not roundtrip through the initial UTF-8 state helper. JSON.stringify escaped that value before transfer, so encoded JSON happened to preserve it. The broader initial assumption that this helper transparently stored every JS string was disproved. Coordinator changed the state helper to UTF-16 code units rather than narrowing acceptance to JSON-encoded inputs. The same independent command then exited 0 with `rawSurrogatePreserved:true`; this supersedes the implementation defect while retaining the failed observation above.


## Combined rerun and recommendation

Independent build and combined run both exited **0**:

```sh
bash scripts/build-native-seam.sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/native-seam.mjs
```

The combined run uses the original Pi loader/runner/wrapper and unchanged Kimi deferred-tool plugin. Its TS and native state-backed paths produce equal results, including newly activated Calculator visibility. The original sample intentionally returns 42 for the chosen expression; this is plugin compatibility evidence, not math correctness. Actual upstream Text/Theme objects retain identity and mutable rendering behavior. A Promise passed through Rust retains identity, but Rust does not drive its settlement. Native abort preserves object-valued reason and synchronous listener reentry, but the test invokes native abort from JS; this is **not** evidence for autonomous Rust cancellation scheduling.

UTF-16 follow-up review found one declaration still used `*const c_char` for `napi_create_string_utf16` where the header specifies `const char16_t*`. The pointer ABI and aligned u16 allocation made the observed call work on this machine, but reviewer requested `*const u16` and removal of the cast so the source matches the actual ABI contract. Coordinator made this correction; reviewer rebuilt and reran the combined script with exit 0, source SHA-256 `98f5f529914825b9fa921d91a5ae1e635489eb28d7d13a82f4378a0f06cc07f4`. Buffer lengths are measured in code units with one spare terminator unit, and returned written count truncates the terminator.

The evidence supports a **proposed** JS host plus Rust native core direction because synchronous calls can preserve JS values directly while reentering Rust state. It does not by itself reject IPC: JS-local UI/reference objects can stay outside serialization, with explicit handles only when needed. Nor does it prove a Rust core must use a native addon. IPC provides a process failure boundary; this native probe does not. Both still require a precise ownership model, actual Pi session integration and a full Rust-owned loop. There is no measured startup, memory or task performance comparison, and no complete-plugin-compatibility claim.

# Independent Pi session seam review

Status: tested source counterexamples and independently verified integrated
experiment within the limited scope below.
Reviewer: session_review. Starting pi-rs commit
`c90c0e4d5c38839ce5d8dcf34330861e308d14a9`; upstream
`9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.
This review starts from upstream persistence and plugin behavior, rather than
accepting a prior completion claim. No credentials or model calls are used.

## Independently reproduced counterexamples

The following assertions ran against the actual upstream SessionManager, exit 0.
They constrain the experiment and any future Rust session implementation:

1. A new session containing only a custom entry has no disk file yet. `_persist`
   delays first creation until an assistant message exists (session-manager.ts
   1028–1055). Custom entry append is not by itself a durability guarantee.
2. After policy 2, then policy 100, then branching back to policy 2,
   `getEntries()` still ends with policy 100 while `getBranch()` resolves policy
   2. Whole-history last-write restoration leaks an abandoned branch's policy.
3. `branch()` changes only the in-memory leaf (1374–1379). Opening the file again
   restores the last appended entry through `_buildIndex` (976–990). Appending
   a child on the selected branch makes that branch the reopened path.
4. Custom policy entries are not LLM messages. In the branch containing only
   custom entries, `buildSessionContext().messages` is empty.

Reproduce from the repository root:

```sh
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager } from './vendor/pi-mono/packages/coding-agent/src/core/session-manager.ts';
const d = mkdtempSync(join(tmpdir(), 'pi-review-'));
try {
  const s = SessionManager.create(d, d);
  const root = s.appendCustomEntry('policy', { limit: 2 });
  assert.equal(existsSync(s.getSessionFile()), false);
  s.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'fixture' }], api: 'openai-completions', provider: 'fixture', model: 'fixture', usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'stop', timestamp: 1 });
  const abandoned = s.appendCustomEntry('policy', { limit: 100 });
  s.branch(root);
  assert.equal(s.getBranch().filter(e => e.customType === 'policy').at(-1).data.limit, 2);
  assert.equal(s.getEntries().filter(e => e.customType === 'policy').at(-1).data.limit, 100);
  assert.equal(SessionManager.open(s.getSessionFile(), d).getLeafId(), abandoned);
  const child = s.appendCustomEntry('review-marker', {});
  const reopened = SessionManager.open(s.getSessionFile(), d);
  assert.equal(reopened.getLeafId(), child);
  assert.equal(reopened.getBranch().filter(e => e.customType === 'policy').at(-1).data.limit, 2);
  assert.equal(reopened.buildSessionContext().messages.length, 0);
  console.log('session counterexamples verified');
} finally { rmSync(d, { recursive: true, force: true }); }
JS
```

## Source-derived plugin acceptance

Unchanged `examples/extensions/todo.ts` reconstructs state by scanning the current
branch's `toolResult` messages with `toolName === 'todo'`, using `details.todos`
and `details.nextId` (123–146). It subscribes to `session_start` and `session_tree`
(149–151). The real agent emits the tree event after changing the leaf and
rebuilding context (agent-session.ts 3259–3295). An experiment must emit after
branch selection, not rely on SessionManager automatically emitting events.

Todo returns shallow copies of its array; toggling mutates a shared Todo object.
This upstream aliasing is not evidence that context projection corrupted history.
Canonical immutability checks must isolate projection from tool execution and
compare actual file bytes as well as in-memory entries where appropriate.

This seam keeps the upstream TypeScript SessionManager. Passing these cases
would establish integration behavior, not a Rust session-manager rewrite,
arbitrary Pi session compatibility, UI lifecycle correctness, or live model E2E.

## Integrated experiment execution

Reviewed `experiments/pi-session-context.mjs` initial SHA256
`4a76b4dbc9b93c8dd733ea6df540be1ccd7407a9f201da4b80929d9c2cec7d5c`.
Upstream SessionManager SHA256
`57bc70a751567b96c057535766240ae52d9b76d9013ea78049d74dc3b654e915`;
unchanged todo SHA256
`e46824d00217e25242c186d41837cc84ca81b23f978500323448502a9a424ee2`.

Commands and observed results:

```sh
# Bare cargo was not on this review shell's PATH (exit 127).
$HOME/.cargo/bin/cargo build --locked --example context_projection
# exit 0
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-session-context.mjs
# exit 0
TSX_TSCONFIG_PATH=vendor/pi-mono/tsconfig.json node --import ./vendor/pi-mono/node_modules/tsx/dist/loader.mjs experiments/pi-session-context.mjs --all-entries-counterexample
# expected exit 1: policy must follow current branch...
# actual null, expected 2; fails first TS case, does not reach Rust negative case.
```

Positive output independently confirmed both implementations project `Added todo
#1: alpha` to `Ad` plus marker; fresh Node process restores only alpha, nextId 2,
and policy 2; adding gamma yields ID 2; resetting policy restores full tool text.
The parent checks old session file prefix byte-for-byte after the child writes.
Source inspection confirms real loader, runner, wrapper and SessionManager, with
manual tool invocations and manually emitted session events. Optional host inputs
preserve old default plugin/guard behavior.

The source-derived abandoned-branch failure is covered explicitly. No defect
requiring an implementation correction was found in this version. Suggested
strengthening: reopen after continuation/reset, restore todo again, and assert
alpha + gamma / nextId 3 / null policy. The initial script only counts policy
entries on that second open. Coordinator applied this coverage improvement before
integration; it was not a runtime defect. Final reviewed script SHA256
`e5dd590f142e98818655aefd771e94f0563bca7ac2964ce284957eee3dbf4d99`
independently reran exit 0. Both TS and Rust now explicitly reopen after the child
exits, create another actual extension host, emit session_start, restore alpha +
gamma with nextId 3, restore null policy, and check full canonical tool texts.
The second reopen is in the original parent process with a fresh manager/host;
the first reopen and continuation occur in a distinct child process.

// Reusable source-derived async-tool contract; no model or credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { createHost, tsBackend } from '../prototype/real-plugin-host.mjs';
import { wrapRegisteredTool } from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/wrapper.ts';

const sourcePath = 'vendor/pi-mono/packages/agent/src/agent-loop.ts';
const source = readFileSync(sourcePath, 'utf8');
export const provenance = {
  commit: '9767ba275f3e9a5ee0f5c5342249b629ab1b2282', sourcePath,
  sha256: createHash('sha256').update(source).digest('hex'),
};
export async function loadUpstreamExecutor() {
  const mod = new vm.SourceTextModule(stripTypeScriptTypes(source + '\nexport { executePreparedToolCall };'), { identifier: sourcePath });
  const unused = () => { throw Error('unexercised upstream dependency'); };
  await mod.link(async (specifier) => {
    const names = specifier === '@earendil-works/pi-ai' ? ['EventStream', 'validateToolArguments']
      : specifier === './stream-fn.ts' ? ['getDefaultStreamFn'] : null;
    assert.ok(names, `unexpected import ${specifier}`);
    return new vm.SyntheticModule(names, function () { for (const name of names) this.setExport(name, unused); });
  });
  await mod.evaluate();
  return mod.namespace.executePreparedToolCall;
}

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
const result = (text) => ({ content: [{ type: 'text', text }], details: {} });
async function prepared(execute, label) {
  const name = `async_${label}`;
  const backend = tsBackend([name]);
  const host = await createHost(backend, { factories: [(pi) => pi.registerTool({
    name, label: name, description: 'Deterministic async contract probe',
    parameters: { type: 'object', properties: {} },
    execute: (id, args, signal, update, ctx) => {
      assert.equal(ctx.cwd, process.cwd(), 'real wrapper must supply live runner context');
      return execute(id, args, signal, update);
    },
  })] });
  const registered = host.runner.getAllRegisteredTools().find((entry) => entry.definition.name === name);
  return { kind: 'prepared', tool: wrapRegisteredTool(registered, host.runner),
    toolCall: { type: 'toolCall', id: `call-${label}`, name, arguments: { raw: true } }, args: { validated: true } };
}

// executePrepared(prepared, signal, emit) must return Promise<{result,isError}>.
// Each run owns a real synthetic extension; assertions do not inspect Rust internals.
export async function exercise(executePrepared) {
  const reports = [];
  for (const fail of [false, true]) {
    const label = fail ? 'throw' : 'success';
    const entered = deferred();
    const release = deferred();
    const received = [];
    const order = [];
    let retained;
    const tool = await prepared(async (id, args, _signal, update) => {
      assert.equal(id, `call-${label}`);
      assert.deepEqual(args, { validated: true });
      retained = update;
      update(result('partial-1'));
      update(result('partial-2'));
      order.push('tool-settled');
      if (fail) throw 'deliberate thrown string';
      return result('done');
    }, label);
    let finished = false;
    const pending = executePrepared(tool, new AbortController().signal, async (event) => {
      received.push(structuredClone(event));
      if (received.length === 2) entered.resolve();
      await release.promise;
      order.push(`sink-complete-${event.partialResult.content[0].text}`);
    }).then((value) => { finished = true; order.push('executor-settled'); return value; });
    await entered.promise;
    // Let the wrapped execute promise settle while sink completions are withheld.
    // A fire-and-forget sink implementation must fail the assertion below.
    await tick();
    await tick();
    assert.equal(finished, false, 'executor must await pre-settlement asynchronous update sinks');
    retained(result('late-during-drain'));
    await tick();
    assert.equal(received.length, 2, 'updates after tool settlement must be ignored while sinks drain');
    release.resolve();
    const actual = await pending;
    retained(result('late-after-final'));
    await tick();
    assert.equal(received.length, 2, 'retained callback must not emit after executor completion');
    assert.deepEqual(actual, { result: result(fail ? 'deliberate thrown string' : 'done'), isError: fail });
    assert.deepEqual(received.map((event) => event.partialResult.content[0].text), ['partial-1', 'partial-2']);
    for (const event of received) {
      assert.equal(event.type, 'tool_execution_update');
      assert.equal(event.toolCallId, `call-${label}`);
      assert.equal(event.toolName, tool.toolCall.name);
      assert.deepEqual(event.args, { raw: true }, 'update args come from original tool call, not validated args');
    }
    assert.equal(order.at(-1), 'executor-settled');
    reports.push({ scenario: label, outcome: actual, updates: received, order, lateUpdatesIgnored: true, awaitedSinks: true });
  }

  const controller = new AbortController();
  const started = deferred();
  const updates = [];
  let observedReason;
  const tool = await prepared(async (_id, _args, signal, update) => {
    assert.ok(signal instanceof AbortSignal, 'extension must receive a usable local AbortSignal');
    const aborted = new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
    started.resolve();
    await aborted;
    assert.equal(signal.aborted, true);
    observedReason = signal.reason;
    update(result('observed-abort'));
    throw new Error(`cancelled: ${signal.reason}`);
  }, 'abort');
  const pending = executePrepared(tool, controller.signal, (event) => updates.push(structuredClone(event)));
  await started.promise;
  controller.abort('user-stop');
  const actual = await pending;
  assert.equal(observedReason, 'user-stop');
  assert.deepEqual(actual, { result: result('cancelled: user-stop'), isError: true });
  assert.equal(updates.length, 1, 'an update emitted cooperatively after abort but before tool settlement is accepted');
  reports.push({ scenario: 'cooperative-abort', outcome: actual, updates, observedReason });

  const blockedSink = deferred();
  const bothSinksEntered = deferred();
  let sinkCount = 0;
  const rejectingAndPending = await prepared(async (_id, _args, _signal, update) => {
    update(result('rejected'));
    update(result('pending'));
    return result('tool-succeeded');
  }, 'sink_reject_pending');
  const settlement = executePrepared(rejectingAndPending, new AbortController().signal, () => {
    sinkCount++;
    if (sinkCount === 1) return Promise.reject(undefined);
    bothSinksEntered.resolve();
    return blockedSink.promise;
  }).then(() => ({ status: 'resolved' }), reason => ({ status: 'rejected', reason }));
  await bothSinksEntered.promise;
  let observed;
  let timer;
  try {
    observed = await Promise.race([settlement, new Promise(resolve => {
      timer = setTimeout(() => resolve({ status: 'still-waiting' }), 1000);
    })]);
  } finally {
    clearTimeout(timer);
    blockedSink.resolve();
    await settlement;
  }
  assert.equal(observed.status, 'rejected', 'sink rejection must short-circuit another pending sink after tool settlement');
  assert.equal(observed.reason, undefined);
  reports.push({ scenario: 'sink-rejection-with-pending-peer', executorRejectedWithoutPeer: true, rejectionReasonType: typeof observed.reason });

  // Promise rejection is distinct from a truthy error value. Upstream re-awaits
  // the rejected update promise in catch, so even `undefined` rejects execution.
  const rejectedSinkTool = await prepared(async (_id, _args, _signal, update) => {
    update(result('before-sink-rejection'));
    return result('tool-succeeded');
  }, 'sink_reject');
  let rejected = false;
  let rejectionReason = 'not observed';
  try {
    await executePrepared(rejectedSinkTool, new AbortController().signal, () => Promise.reject(undefined));
  } catch (reason) {
    rejected = true;
    rejectionReason = reason;
  }
  assert.equal(rejected, true, 'a sink rejection with undefined must reject executor, not return tool success');
  assert.equal(rejectionReason, undefined);
  reports.push({ scenario: 'sink-rejection-undefined', executorRejected: rejected, rejectionReasonType: typeof rejectionReason });
  return reports;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const timer = setTimeout(() => { console.error('async tool contract deadline exceeded'); process.exit(1); }, 15000);
  try { console.log(JSON.stringify({ provenance, cases: await exercise(await loadUpstreamExecutor()),
    scope: 'Prepared execution only, actual extension loader/runner/wrapper. No admission, scheduler, provider, persistence, UI, arbitrary abort-reason identity or performance claims.' }, null, 2)); }
  finally { clearTimeout(timer); }
}

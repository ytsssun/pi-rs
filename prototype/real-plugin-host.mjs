// Actual pinned Pi loader/runner host. See docs/real-plugin-host.md for scope.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createEventBus } from '../vendor/pi-mono/packages/coding-agent/src/core/event-bus.ts';
import { loadExtensions, loadExtensionFromFactory } from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/loader.ts';
import { ExtensionRunner } from '../vendor/pi-mono/packages/coding-agent/src/core/extensions/runner.ts';

export const pluginPath = fileURLToPath(new URL('../vendor/pi-mono/packages/coding-agent/examples/extensions/kimi-deferred-tools.ts', import.meta.url));
export const pluginSha256 = createHash('sha256').update(readFileSync(pluginPath)).digest('hex');

// Unexercised bindings fail explicitly instead of silently pretending to work.
const unsupported = (name) => () => { throw new Error(`Unexercised host binding: ${name}`); };
const guardedObject = (name) => new Proxy({}, { get: (_, key) => unsupported(`${name}.${String(key)}`) });

export function tsBackend(initial = []) {
  let active = [...initial];
  return {
    getActiveTools: () => [...active],
    setActiveTools: (names) => { active = [...names]; },
  };
}

export async function createHost(backend, { factories = [], cwd = process.cwd(), extensionPaths = [pluginPath], sessionManager = guardedObject('sessionManager') } = {}) {
  const eventBus = createEventBus();
  const loaded = await loadExtensions(extensionPaths, cwd, eventBus);
  assert.deepEqual(loaded.errors, [], 'unchanged upstream extension must load');
  for (let i = 0; i < factories.length; i++) {
    loaded.extensions.push(await loadExtensionFromFactory(factories[i], cwd, eventBus, loaded.runtime, `<probe-${i}>`));
  }
  const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, cwd, sessionManager, guardedObject('modelRegistry'));
  const errors = [];
  runner.onError(({ event, error }) => errors.push({ event, error }));
  let sessionName;
  const labels = new Map();
  const actions = Object.fromEntries([
    'sendMessage', 'sendUserMessage', 'setModel',
  ].map((name) => [name, unsupported(name)]));
  Object.assign(actions, {
    appendEntry: async (entry) => {
      assert.ok(sessionManager && typeof sessionManager.appendCustomEntry === 'function', 'sessionManager.appendCustomEntry required');
      return sessionManager.appendCustomEntry('pi-rs.extension.entry.v1', entry);
    },
    setSessionName: async (name) => {
      sessionName = String(name);
      if (typeof sessionManager.appendCustomEntry === 'function') await sessionManager.appendCustomEntry('session_name', {name: sessionName});
    },
    getSessionName: () => sessionName,
    setLabel: async (key, value) => {
      labels.set(String(key), String(value));
      if (typeof sessionManager.appendCustomEntry === 'function') await sessionManager.appendCustomEntry('session_label', {key: String(key), value: String(value)});
    },
  });
  let thinkingLevel = 'off';
  Object.assign(actions, { getCommands: () => runner.getRegisteredCommands().map(command => ({name: command.invocationName, description: command.description, source: 'extension', sourceInfo: command.sourceInfo})), getThinkingLevel: () => thinkingLevel, setThinkingLevel: level => { thinkingLevel = level; }, refreshTools: () => undefined });
  Object.assign(actions, {
    getActiveTools: () => {
      const names = backend.getActiveTools();
      assert.ok(Array.isArray(names), 'getActiveTools must be synchronous');
      return names;
    },
    setActiveTools: (names) => {
      const result = backend.setActiveTools(names);
      assert.ok(!result || typeof result.then !== 'function', 'setActiveTools must be synchronous');
    },
    getAllTools: () => runner.getAllRegisteredTools().map(({ definition }) => definition),
  });
  const contextActions = Object.fromEntries([
    'getScopedModels', 'getSignal', 'abort', 'shutdown', 'getContextUsage', 'compact', 'getSystemPrompt',
  ].map((name) => [name, unsupported(name)]));
  Object.assign(contextActions, { getModel: () => undefined, isIdle: () => true, isProjectTrusted: () => true, hasPendingMessages: () => false });
  runner.bindCore(actions, contextActions);
  const execute = async (name, params) => {
    assert.ok(backend.getActiveTools().includes(name), `inactive tool: ${name}`);
    const definition = runner.getToolDefinition(name);
    assert.ok(definition, `unregistered tool: ${name}`);
    return definition.execute(`probe-${name}`, params, new AbortController().signal, undefined, runner.createContext());
  };
  // Request snapshot is the next boundary input, not an actual provider request.
  const requestTools = () => backend.getActiveTools().map((name) => {
    const definition = runner.getToolDefinition(name);
    assert.ok(definition, `unregistered tool: ${name}`);
    return { name, description: definition.description, parameters: definition.parameters };
  });
  return { runner, eventBus, errors, execute, requestTools, runtime: loaded.runtime, actions };
}

export async function exercise(backend = tsBackend()) {
  const host = await createHost(backend);
  await host.runner.emit({ type: 'session_start' });
  const initial = host.requestTools().map(({ name }) => name);
  const noMatch = await host.execute('tool_search', { query: 'weather' });
  const afterNoMatch = host.requestTools().map(({ name }) => name);
  const search = await host.execute('tool_search', { query: 'CALC' });
  const nextRequest = host.requestTools().map(({ name }) => name);
  const repeatedSearch = await host.execute('tool_search', { query: 'calc' });
  const calculator = await host.execute('Calculator', { expr: '100 + 500' });
  assert.deepEqual(initial, ['tool_search']);
  assert.deepEqual(afterNoMatch, initial);
  assert.deepEqual(noMatch.details, { matches: [], added: [] });
  assert.deepEqual(search.details, { matches: ['Calculator'], added: ['Calculator'] });
  assert.deepEqual(nextRequest, ['tool_search', 'Calculator']);
  assert.deepEqual(repeatedSearch.details, { matches: ['Calculator'], added: [] });
  assert.equal(calculator.content[0].text, '42', 'upstream demonstration intentionally returns42');
  assert.deepEqual(host.errors, []);
  const staleContext = host.runner.createContext();
  host.runner.invalidate('probe invalidated');
  assert.throws(() => staleContext.cwd, /probe invalidated/);
  await assert.rejects(() => host.execute('tool_search', { query: 'calc' }), /probe invalidated/);
  return { pluginSha256, initial, noMatch, afterNoMatch, search, nextRequest, repeatedSearch, calculator, staleApiRejected: true, errors: host.errors };
}

export async function exerciseContext(project = (messages) => messages) {
  const seen = [];
  const factories = [
    (pi) => pi.on('context', (event) => {
      seen.push('mutate');
      event.messages[0].content[0].text += ':mutated';
    }),
    (pi) => pi.on('context', (event) => {
      seen.push('project');
      return { messages: project(event.messages) };
    }),
    (pi) => pi.on('context', (event) => {
      seen.push('throw');
      event.messages[0].content[0].text += ':before-error';
      throw new Error('deliberate context failure');
    }),
    (pi) => pi.on('context', (event) => {
      seen.push('after-error');
      return { messages: [...event.messages, { role: 'user', content: [{ type: 'text', text: 'continued' }], timestamp: 2 }] };
    }),
  ];
  const host = await createHost(tsBackend(), { factories });
  const canonical = [{ role: 'user', content: [{ type: 'text', text: 'canonical' }], timestamp: 1 }];
  const before = JSON.stringify(canonical);
  const output = await host.runner.emitContext(canonical);
  assert.equal(JSON.stringify(canonical), before);
  assert.deepEqual(seen, ['mutate', 'project', 'throw', 'after-error']);
  assert.deepEqual(host.errors, [{ event: 'context', error: 'deliberate context failure' }]);
  assert.equal(output.at(-1).content[0].text, 'continued');
  assert.ok(output[0].content[0].text.endsWith(':before-error'), 'mutation before throw must remain visible');
  return { canonical, output, seen, errors: host.errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify({ tools: await exercise(), context: await exerciseContext() }, null, 2));
}

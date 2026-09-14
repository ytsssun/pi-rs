import {dirname, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createBackend} from './native-store-backend.mjs';

// Owns the replaceable host/store pair. Replacement is deliberately idle-only;
// upstream can abort active work, which this headless owner does not yet support.
export async function createSessionOwner({path, cwd, mode, makeHost}) {
  let current, replacing = false, started = false, terminal = false, closed = false;
  const errors = [];
  const bind = host => host.runner.bindCommandContext({
    waitForIdle: host.waitForIdle,
    newSession,
    ...Object.fromEntries(['fork','navigateTree','switchSession','reload'].map(name => [name, () => {throw Error(`Unexercised host binding: ${name}`);}]))
  });
  const prepare = async (path, parentSession) => {
    const manager = await createBackend({path,cwd,mode:'create',parentSession});
    return {path,manager};
  };
  function replacedContext(session) {
    // Preserve upstream runner's lazy stale guards; spreading captures old values.
    const context = Object.defineProperties({}, Object.getOwnPropertyDescriptors(session.host.runner.createCommandContext()));
    context.sendMessage = async (message, options) => {
      context.isIdle(); // Also validates this context's lifetime before mutation.
      if (options?.deliverAs === 'nextTurn') {
        session.host.actions.sendMessage(message, options);
        return;
      }
      if (options?.triggerTurn || !context.isIdle())
        throw Error('replacement sendMessage requires an idle non-triggering message; scheduling unsupported');
      session.manager.appendCustomMessageEntry(message.customType, message.content ?? [], message.display, message.details);
    };
    context.sendUserMessage = async () => {
      context.isIdle();
      throw Error('replacement sendUserMessage requires a scheduling consumer; unsupported');
    };
    return context;
  }
  async function newSession(options = {}) {
    if (terminal) throw Error('session owner is terminal');
    if (options === null || typeof options !== 'object' || Array.isArray(options)) throw Error('newSession options must be an object');
    if (options.parentSession !== undefined && typeof options.parentSession !== 'string')
      throw Error('newSession parentSession must be a string');
    if (options.withSession !== undefined && typeof options.withSession !== 'function') throw Error('newSession withSession must be a function');
    if (options.setup !== undefined && typeof options.setup !== 'function') throw Error('newSession setup must be a function');
    if (replacing || !current.host.contextActions.isIdle()) throw Error('newSession requires an idle owner');
    replacing = true;
    let next;
    try {
      const before = await current.host.runner.emit({type:'session_before_switch',reason:'new'});
      if (before?.cancel === true) return {cancelled:true};
      next = await prepare(join(dirname(current.path), `${randomUUID()}.jsonl`), options.parentSession);
      const previousSessionFile = current.path;
      const old = current;
      terminal = true; // After teardown starts, failure cannot roll back old contexts.
      await old.host.runner.emit({type:'session_shutdown',reason:'new',targetSessionFile:next.path});
      old.host.runner.invalidate();
      errors.push(...old.host.errors);
      await old.manager.close();
      current = next;
      started = false;
      next.host = await makeHost(next.manager);
      bind(next.host);
      started = true;
      await next.host.runner.emit({type:'session_start',reason:'new',previousSessionFile});
      if (options.setup) await options.setup(next.manager);
      terminal = false;
      // Replacement is committed before user callback execution, as upstream's
      // finishSessionReplacement. Callback failure must not poison the new owner.
      replacing = false;
      if (options.withSession) await options.withSession(replacedContext(next));
      return {cancelled:false};
    } finally {
      if (next && current !== next) await next.manager.close();
      replacing = false;
    }
  }
  const manager = await createBackend({path,cwd,mode});
  current = {path,manager};
  try { current.host = await makeHost(manager); bind(current.host); }
  catch(error) { await manager.close(); throw error; }
  return {
    get current() {if (terminal) throw Error('session owner is terminal'); return current;},
    get errors() {return [...errors,...(current.host?.errors ?? [])];},
    async start() {started = true; await current.host.runner.emit({type:'session_start',reason:'startup'});},
    async close() {
      if (closed) return; closed = true;
      try { if (started) {started=false; await current.host?.runner.emit({type:'session_shutdown',reason:'quit'});} }
      finally {current.host?.runner.invalidate(); await current.manager.close();}
    }
  };
}

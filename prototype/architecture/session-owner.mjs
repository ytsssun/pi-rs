import {dirname, join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createBackend} from './native-store-backend.mjs';

// Owns the replaceable host/store pair. Replacement is deliberately idle-only;
// upstream can abort active work, which this headless owner does not yet support.
export async function createSessionOwner({path, cwd, mode, makeHost}) {
  let current, replacing = false, started = false, terminal = false, closed = false;
  const errors = [];
  const bind = host => host.runner.bindCommandContext({
    waitForIdle: host.waitForIdle,
    newSession, switchSession, fork,
    ...Object.fromEntries(['navigateTree','reload'].map(name => [name, () => {throw Error(`Unexercised host binding: ${name}`);}]))
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
      if (options?.deliverAs !== undefined && options.deliverAs !== 'nextTurn')
        throw Error('replacement sendMessage deliverAs unsupported; use nextTurn or omit');
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
  async function fork(entryId, options = {}) {
    if (terminal) throw Error('session owner is terminal');
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw Error('fork options must be an object');
    const position = options.position ?? 'before';
    if (!['before','at'].includes(position)) throw Error('fork position must be before or at');
    if (options.withSession !== undefined && typeof options.withSession !== 'function') throw Error('fork withSession must be a function');
    if (replacing || !current.host.contextActions.isIdle()) throw Error('fork requires an idle owner');
    replacing = true;
    let next;
    try {
      const before = await current.host.runner.emit({type:'session_before_fork',entryId,position});
      if (before?.cancel === true) return {cancelled:true};
      const entries = current.manager.getEntries();
      const byId = new Map(entries.map(entry => [entry.id,entry]));
      const selected = byId.get(entryId);
      if (!selected || (position === 'before' && (selected.type !== 'message' || selected.message.role !== 'user')))
        throw Error('Invalid entry ID for forking');
      const selectedText = position === 'before'
        ? (typeof selected.message.content === 'string' ? selected.message.content : selected.message.content.filter(c=>c.type==='text').map(c=>c.text).join(''))
        : undefined;
      const path = [];
      for (let entry = position === 'at' ? selected : byId.get(selected.parentId); entry; entry = byId.get(entry.parentId)) path.unshift(entry);
      const previousSessionFile = current.path;
      next = await prepare(join(dirname(current.path), `${randomUUID()}.jsonl`), previousSessionFile);
      // Match upstream's label removal/rechaining and compaction target remap.
      // Rust append remains authoritative for parent links, index and persistence.
      const remap = new Map(), pending = [], kept = new Set();
      for (const entry of path) {
        if (entry.type === 'label') {pending.push(entry.id); continue;}
        for (const id of pending) remap.set(id,entry.id);
        pending.length = 0;
        next.manager.appendPreserved(entry.type === 'compaction' ? {...entry,firstKeptEntryId:remap.get(entry.firstKeptEntryId) ?? entry.firstKeptEntryId} : entry);
        kept.add(entry.id);
      }
      const labels = new Map();
      for (const entry of entries) if (entry.type === 'label') {
        if (entry.label) labels.set(entry.targetId,entry); else labels.delete(entry.targetId);
      }
      for (const [targetId,entry] of labels) if (kept.has(targetId))
        next.manager.appendPreserved({...entry,id:randomUUID()});
      const old = current;
      terminal = true;
      await old.host.runner.emit({type:'session_shutdown',reason:'fork',targetSessionFile:next.path});
      old.host.runner.invalidate(); errors.push(...old.host.errors);
      await old.manager.close();
      current = next; started = false;
      next.host = await makeHost(next.manager); bind(next.host); started = true;
      await next.host.runner.emit({type:'session_start',reason:'fork',previousSessionFile});
      terminal = false; replacing = false;
      if (options.withSession) await options.withSession(replacedContext(next));
      return {cancelled:false,selectedText};
    } finally {
      if (next && current !== next) await next.manager.close();
      replacing = false;
    }
  }
  async function switchSession(sessionPath, options = {}) {
    if (terminal) throw Error('session owner is terminal');
    if (typeof sessionPath !== 'string' || !sessionPath) throw Error('switchSession path must be a nonempty string');
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw Error('switchSession options must be an object');
    if (options.withSession !== undefined && typeof options.withSession !== 'function') throw Error('switchSession withSession must be a function');
    if (options.cwdOverride !== undefined || options.projectTrustContextFactory !== undefined) throw Error('switchSession cwdOverride/trust factory unsupported');
    if (replacing || !current.host.contextActions.isIdle()) throw Error('switchSession requires an idle owner');
    replacing = true;
    let next;
    try {
      const before = await current.host.runner.emit({type:'session_before_switch',reason:'resume',targetSessionFile:sessionPath});
      if (before?.cancel === true) return {cancelled:true};
      const target = resolve(sessionPath);
      const manager = await createBackend({path:target,cwd,mode:'open'});
      next = {path:target,manager};
      const header = manager.snapshot().header;
      if (!header?.cwd || resolve(header.cwd) !== resolve(cwd)) throw Error('switchSession different workspace unsupported');
      const old = current, previousSessionFile = old.path;
      terminal = true;
      await old.host.runner.emit({type:'session_shutdown',reason:'resume',targetSessionFile:target});
      old.host.runner.invalidate();
      errors.push(...old.host.errors);
      await old.manager.close();
      current = next; started = false;
      next.host = await makeHost(manager); bind(next.host);
      started = true;
      await next.host.runner.emit({type:'session_start',reason:'resume',previousSessionFile});
      terminal = false; replacing = false;
      if (options.withSession) await options.withSession(replacedContext(next));
      return {cancelled:false};
    } finally {
      if (next && current !== next) await next.manager.close();
      replacing = false;
    }
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

# Scoped original write differential

Status: **verified** for the four explicit cases only. Reference Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.

Reproduce from repository root:

```sh
export PATH="$HOME/.cargo/bin:$PATH"
sh scripts/bootstrap-upstream.sh
cargo build --locked
node --experimental-vm-modules experiments/write-differential.mjs
```

`write-results.json` records the executed upstream module paths, SHA-256 hashes, clean Git status checks, runtime version and results. Four cases passed: nested directory creation, overwrite, UTF-8 content, empty content. The harness compares real file bytes between original Pi and Rust and compares the original first text result to the Rust persisted tool result. Rust runs through its real CLI using scripted model fixtures; **no real model is involved**.

## Instrumentation boundary

Node's `stripTypeScriptTypes` removes TypeScript syntax and VM modules link the **unchanged original source** of `write.ts`, `file-mutation-queue.ts`, `path-utils.ts`, `utils/paths.ts`, and `utils/child-process.ts`. Built-in imports use actual Node built-ins; filesystem operations are not mocked or replaced. Each source must be clean against the pinned checkout before evaluation; hashes are recorded. Calls use original `createWriteToolDefinition(...).execute(...)` with default operations.

Four dependencies are explicitly instrumented:

- `typebox`: `Type.Object` / `Type.String` identity shims permit definition construction; schema validation is **not** tested.
- `renderers/write.ts`: empty renderer object; UI rendering is **not** tested.
- `tool-definition-wrapper.ts`: throws if called. Direct definition execution avoids the wrapper; wrapper behavior is **not** tested.
- `cross-spawn`: unavailable transitive dependency of original `utils/child-process.ts`; throw-on-use stub. The selected filesystem write path never calls process helpers. No cross-spawn or wrapper calls occurred.

This is an instrumented tool-body differential, not proof the full Pi package installs or the upstream extension loader works. No npm packages were installed. Node emits experimental warnings for VM modules and TypeScript stripping.

## Explicit limits

The four cases do not cover concurrency/queue ordering, cancellation, remote operations, symlinks, `~`/`@`/file URL/unicode-space path normalization, permissions, crash durability or errors. Rust intentionally rejects paths outside its workspace, symlink targets, traversal and writes larger than 1 MiB. Upstream permits broader path operations. Bash is outside this differential. No full Pi compatibility claim follows from these results.

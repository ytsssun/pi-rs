import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Deliberately one reviewed upstream extension, not arbitrary plugin loading.
const extensionPath = resolve(import.meta.dirname,
  '../vendor/pi-mono/packages/coding-agent/examples/extensions/protected-paths.ts');
const handlers = [];
const { default: extension } = await import(pathToFileURL(extensionPath).href);
extension({
  on(name, handler) {
    if (name !== 'tool_call') throw new Error(`Unsupported hook: ${name}`);
    handlers.push(handler);
  },
});

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  let request;
  try {
    request = JSON.parse(line);
    if (!Number.isSafeInteger(request.id) || request.method !== 'tool_call' ||
        typeof request.params?.toolName !== 'string' ||
        typeof request.params?.input?.path !== 'string') {
      throw new Error('Expected integer id, method tool_call, toolName and input.path strings');
    }
    const event = { ...request.params, type: 'tool_call' };
    let result = null;
    for (const handler of handlers) {
      const value = await handler(event, { hasUI: false });
      if (value !== undefined) result = value;
    }
    process.stdout.write(`${JSON.stringify({ id: request.id, result })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ id: request?.id ?? null, error: error.message })}\n`);
  }
}

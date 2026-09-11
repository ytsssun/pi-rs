// Mirrors pinned AgentSession._tryExecuteExtensionCommand. Unknown slash input
// falls through to the normal prompt path; handler failures remain handled.
export async function trySlashCommand(text, runner) {
  if (!text?.startsWith('/')) return false;
  const space = text.indexOf(' ');
  const name = space === -1 ? text.slice(1) : text.slice(1, space);
  const args = space === -1 ? '' : text.slice(space + 1);
  const command = runner.getCommand(name);
  if (!command) return false;
  try {
    await command.handler(args, runner.createCommandContext());
  } catch (error) {
    runner.emitError({extensionPath: `command:${name}`, event: 'command',
      error: error instanceof Error ? error.message : String(error)});
  }
  return true;
}

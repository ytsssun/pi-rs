// Bounded counterpart of pinned DefaultResourceLoader.discover{Append,}SystemPromptFile.
// Full loader reload also resolves packages; do not expand CLI discovery to execute them.
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
export function loadPromptResources({cwd, agentDir, projectTrusted = true}) {
  const load = name => {
    const project = join(cwd, '.pi', name);
    const global = join(agentDir, name);
    const path = projectTrusted && existsSync(project) ? project : existsSync(global) ? global : undefined;
    if (!path) return undefined;
    // Preserve an empty selected file: it shadows the lower-priority global file.
    return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  };
  return {customPrompt: load('SYSTEM.md'), appendSystemPrompt: load('APPEND_SYSTEM.md')};
}

import {readFileSync,writeFileSync} from 'node:fs';
const upstream=readFileSync('vendor/pi-mono/packages/coding-agent/src/core/extensions/runner.ts','utf8');
const host=readFileSync('prototype/real-plugin-host.mjs','utf8');
const actionNames=[...upstream.matchAll(/this\.runtime\.(\w+)\s*=\s*actions\./g)].map(m=>m[1]);
const contextNames=[...upstream.matchAll(/this\.(?:getModel|getScopedModels|isIdleFn|isProjectTrustedFn|getSignalFn|abortFn|hasPendingMessagesFn|shutdownHandler|getContextUsageFn|compactFn|getSystemPromptFn|getSystemPromptOptionsFn)/g)].length;
const unique=[...new Set(actionNames)];const implemented=unique.filter(n=>host.includes(`${n}:`)||host.includes(`${n} =`)||host.includes(`{ ${n}`));
const report={upstreamCommit:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',actions:{total:unique.length,implemented:implemented.length,names:unique,missing:unique.filter(n=>!implemented.includes(n))},contextAssignments:contextNames,method:'static signature inventory; implementation requires runtime execution'};
writeFileSync('experiments/extension-binding-inventory.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

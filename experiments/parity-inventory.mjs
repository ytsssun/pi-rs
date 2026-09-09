import {readFileSync,writeFileSync} from 'node:fs';
const upstream=readFileSync('vendor/pi-mono/packages/coding-agent/src/core/extensions/runner.ts','utf8');
const host=readFileSync('prototype/real-plugin-host.mjs','utf8');
const methods=[...upstream.matchAll(/^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]).filter(n=>!['constructor','if','for','while','switch','catch'].includes(n));
const unique=[...new Set(methods)];
const lifecycle=[...upstream.matchAll(/emit([A-Z][A-Za-z]+)/g)].map(m=>'emit'+m[1]);
const report={upstreamCommit:'9767ba275f3e9a5ee0f5c5342249b629ab1b2282',generatedAt:'static source inventory',runnerPublicMethods:{total:unique.length,names:unique},eventEmitters:{total:[...new Set(lifecycle)].length,names:[...new Set(lifecycle)]},hostSurface:{implemented:['createHost','requestTools','execute','actions','contextActions','providers','drainMessages'],limitations:'static inventory does not infer runtime semantics'},parityPolicy:'Do not publish percentage until each capability is classified tested, verified, partial, or missing.'};
writeFileSync('experiments/parity-inventory.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({methods:unique.length,events:report.eventEmitters.total}));

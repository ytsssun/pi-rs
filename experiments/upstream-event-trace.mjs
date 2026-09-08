/** Deterministic lifecycle fixture derived from pinned pi-mono AgentSession/agent-loop. */
import { writeFileSync } from 'node:fs';
const trace=[]; const emit=(type, data={})=>trace.push({type,...data});
// AgentSession subscribes to agent events, runs tool hooks, then persists tool result.
emit('turn_start'); emit('model_start'); emit('model_result',{stopReason:'toolUse'});
for (const [tool, callId, isError] of [['todo','a',false],['long_output','long',false],['explode','fail',true]]) {
  emit('tool_start',{tool,callId});
  emit('tool_result',{tool,callId,isError});
}
emit('model_start'); emit('model_result',{stopReason:'stop'});
emit('turn_end');
const out={source:'vendor/pi-mono/packages/coding-agent/src/core/agent-session.ts',trace};
writeFileSync('experiments/upstream-event-trace.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));

// Original Pi agent loop with actual plugin definitions and deterministic stream.
// This proves next-request visibility, not that the loop itself is Rust-owned.
import assert from 'node:assert/strict';
import {runAgentLoop} from '../../vendor/pi-mono/packages/agent/src/agent-loop.ts';
import {createHost} from '../real-plugin-host.mjs';

export async function exerciseOriginalLoop(backend) {
  const host=await createHost(backend);
  await host.runner.emit({type:'session_start'});
  const snapshots=[];
  const events=[];
  const definitions=()=>backend.getActiveTools().map(name=>{
    const definition=host.runner.getToolDefinition(name);
    return {...definition,execute:async (_id,args)=>host.execute(name,args)};
  });
  const responses=[
    {role:'assistant',content:[{type:'toolCall',id:'search',name:'tool_search',arguments:{query:'calc'}}],stopReason:'toolUse',timestamp:2},
    {role:'assistant',content:[{type:'toolCall',id:'calculate',name:'Calculator',arguments:{expr:'100 + 500'}}],stopReason:'toolUse',timestamp:3},
    {role:'assistant',content:[{type:'text',text:'fixture complete'}],stopReason:'stop',timestamp:4},
  ];
  const stream=async (_model,context)=>{
    snapshots.push(context.tools.map(t=>t.name));
    const response=responses.shift();
    assert.ok(response,'unexpected extra request');
    return {async *[Symbol.asyncIterator](){yield {type:'done'};},async result(){return response;}};
  };
  const messages=await runAgentLoop(
    [{role:'user',content:'use calculator',timestamp:1}],
    {systemPrompt:'architecture probe',messages:[],tools:definitions()},
    {model:{provider:'fixture'},apiKey:'not-a-key',convertToLlm:m=>m,
      prepareNextTurn:({context})=>({context:{...context,tools:definitions()}})},
    event=>events.push(event.type),undefined,stream);
  assert.deepEqual(snapshots,[['tool_search'],['tool_search','Calculator'],['tool_search','Calculator']]);
  const results=messages.filter(m=>m.role==='toolResult').map(({toolCallId,toolName,content,isError})=>({toolCallId,toolName,content,isError}));
  assert.equal(results.length,2);
  assert.ok(results.every(m=>m.isError===false));
  assert.equal(results[1].content[0].text,'42');
  assert.deepEqual(host.errors,[]);
  return {snapshots,results,events,source:'upstream runAgentLoop unchanged; fixture stream; host supplies next-turn snapshot'};
}

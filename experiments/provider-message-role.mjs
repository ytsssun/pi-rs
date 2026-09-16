import assert from 'node:assert/strict';
import {nativeContextMessages} from '../prototype/architecture/native-provider-stream.mjs';
import {convertMessages} from '../vendor/pi-mono/packages/ai/src/api/openai-completions.ts';
for(const reasoning of [false,true])for(const supportsDeveloperRole of [false,true]){
 const model={id:'fixture',provider:'openai',api:'openai-completions',input:['text'],reasoning,compat:{supportsDeveloperRole}};
 const context={systemPrompt:'Never modify protected files.',messages:[]};
 const upstream=convertMessages(model,context,{supportsDeveloperRole});
 assert.deepEqual(nativeContextMessages(model,context),upstream);
}
assert.equal(nativeContextMessages({provider:'openai',reasoning:true},{systemPrompt:'policy',messages:[]})[0].role,'developer');
console.log('PASS native policy role matches original converter across reasoning and explicit compatibility flags');

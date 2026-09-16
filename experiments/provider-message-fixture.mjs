import {writeFileSync} from 'node:fs';
import {convertMessages} from '../vendor/pi-mono/packages/ai/src/api/openai-completions.ts';
const model={id:'fixture',provider:'openai',api:'openai-completions',input:['text'],reasoning:false};
const inputs=[
 [{role:'assistant',content:[{type:'text',text:'I will inspect the code.'},{type:'toolCall',id:'call_1',name:'read',arguments:{path:'maths.py'}}],stopReason:'toolUse',model:model.id,provider:model.provider,api:model.api,timestamp:1},{role:'toolResult',toolCallId:'call_1',toolName:'read',content:[{type:'text',text:'file contents'}],isError:false,timestamp:2}],
 [{role:'assistant',content:[{type:'text',text:'Done.'}],stopReason:'stop',model:model.id,provider:model.provider,api:model.api,timestamp:1}]
];
writeFileSync(new URL('../tests/fixtures/provider-assistant-content.json',import.meta.url),JSON.stringify(inputs.map(messages=>({input:messages,expected:convertMessages(model,{messages},{supportsDeveloperRole:false})})),null,2)+'\n');

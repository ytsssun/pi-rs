import {request} from '../prototype/architecture/native-store-backend.mjs';
const model=process.env.PI_RS_MODEL||'gpt-5.6-luna';
const result=request({op:'provider_chat',model,messages:[{role:'user',content:'Reply with exactly LIVE_NATIVE_OK.'}],tools:[],reasoning_effort:'none'});
const text=result?.content;
if(!/^LIVE_NATIVE_OK\.?$/.test(text??'')) throw Error(`unexpected provider response: ${JSON.stringify(result)}`);
console.log(JSON.stringify({verified:true,model,content:text}));

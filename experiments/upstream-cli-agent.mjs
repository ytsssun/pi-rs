// Experimental package facade: preserve SDK stream/provider/context callbacks.
export * from '../vendor/pi-mono/packages/agent/dist/index.js';
import {RustAgentAdapter} from './agent-shaped-adapter.mjs';
import {writeFileSync} from 'node:fs';
let count=0;
export class Agent extends RustAgentAdapter {
  constructor(options) {
    const base=process.env.PI_RS_PROBE_SCRATCH;
    if(!base)throw Error('Experimental adapter requires PI_RS_PROBE_SCRATCH');
    const index=count++;
    super({...options,cwd:process.cwd(),scratchPath:index?`${base}.${index}`:base});
    process.on('exit',()=>{
      const trace=process.env.PI_RS_PROBE_TRACE;
      if(trace)writeFileSync(index?`${trace}.${index}`:trace,JSON.stringify(this.trace));
      this.store.close();
    });
  }
}

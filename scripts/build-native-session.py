#!/usr/bin/env python3
"""Build an isolated Node-API addon linked to the existing locked Rust modules."""
import json, os, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parent.parent
os.chdir(root)
env={**os.environ,'PATH':str(pathlib.Path.home()/'.cargo/bin')+os.pathsep+os.environ.get('PATH','')}
build=subprocess.run(['cargo','build','--locked','--lib','--message-format=json'],env=env,text=True,stdout=subprocess.PIPE,check=True)
artifacts={}
for line in build.stdout.splitlines():
    record=json.loads(line)
    if record.get('reason')=='compiler-artifact':
        for filename in record['filenames']:
            if filename.endswith('.rlib'): artifacts[record['target']['name']]=filename
args=['rustc','--edition','2021','--crate-type','cdylib','-C','panic=abort','-L','dependency='+str(root/'target/debug/deps')]
for name in ['pi_rs','serde_json']: args+=['--extern',name+'='+artifacts[name]]
if sys.platform=='darwin': args+=['-C','link-arg=-undefined','-C','link-arg=dynamic_lookup']
elif sys.platform!='linux': raise SystemExit('Only Darwin/Linux build paths configured; platform unverified')
args+=['prototype/native-session.rs','-o','target/native-session.node']
subprocess.run(args,env=env,check=True)

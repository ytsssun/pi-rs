#!/usr/bin/env python3
"""Bounded live smoke using formal CLI; external tests and evidence outside agent workspace."""
import argparse,json,os,pathlib,subprocess,time
from live_transport import Relay
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--env-file',type=pathlib.Path,default=ROOT/'.env');p.add_argument('--model',default='gpt-5.4-mini');p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
keys=[line.partition('=')[2].strip().strip('\"\'') for line in a.env_file.read_text().splitlines() if line.strip().startswith('OPENAI_API_KEY=')]
assert len(keys)==1 and keys[0], 'need one OPENAI_API_KEY'
out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);work=out/'repo';work.mkdir();home=out/'home';home.mkdir()
(work/'maths.py').write_text('def add(a, b):\n    return a - b\n')
(work/'test_maths.py').write_text('from maths import add\nassert add(2, 3) == 5\n')
subprocess.run(['git','init','-q',str(work)],check=True)
subprocess.run(['git','-C',str(work),'add','.'],check=True)
subprocess.run(['git','-C',str(work),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline'],check=True)
base={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'model':a.model,'fixture':False,'contextEditing':False,'manualInterventions':0,'runs':[]}
with Relay('https://api.openai.com/v1',a.model,keys[0],out/'transport',max_requests=24) as relay:
 env={'PATH':os.environ['PATH'],'HOME':str(home),'OPENAI_API_KEY':relay.capability,'OPENAI_BASE_URL':relay.base_url}
 for i,prompt in enumerate(['Fix the bug in maths.py so add performs addition. Run python3 test_maths.py to verify. Do not change test_maths.py.', 'Continue the prior task: add subtract(a,b) in maths.py, preserving add. Run a Python command checking both functions. Do not change test_maths.py.']):
  args=[str(ROOT/'target/debug/pi-rs'),'--workspace',str(work),'--session',str(out/'session.jsonl'),'--input',prompt,'--model',a.model]
  if i:args+=['--resume']
  start=time.monotonic()
  try:
   run=subprocess.run(args,cwd=work,env=env,text=True,capture_output=True,timeout=240)
   (out/f'{i}.stdout').write_text(run.stdout);(out/f'{i}.stderr').write_text(run.stderr)
   code=run.returncode
  except subprocess.TimeoutExpired:
   code=124
  check='import maths; assert maths.add(2,3)==5; assert maths.add(-2,3)==1'
  if i:check+='; assert maths.subtract(7,3)==4; assert maths.subtract(-2,3)==-5'
  external=subprocess.run(['python3','-c',check],cwd=work,text=True,capture_output=True)
  immutable=(work/'test_maths.py').read_text()=='from maths import add\nassert add(2, 3) == 5\n'
  base['runs'].append(dict(prompt=prompt,exit=code,elapsed=time.monotonic()-start,externalExit=external.returncode,testsUnchanged=immutable,passed=code==0 and external.returncode==0 and immutable))
  (out/f'{i}.diff').write_text(subprocess.check_output(['git','diff','HEAD'],cwd=work,text=True))
  (out/'summary.json').write_text(json.dumps(base,indent=2))
  if not base['runs'][-1]['passed']:break
print(json.dumps(base))

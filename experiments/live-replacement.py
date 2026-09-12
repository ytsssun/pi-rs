#!/usr/bin/env python3
"""Real-model owner replacement followed by formal CLI fresh-process resume.
Not a sandbox: tools retain host filesystem permissions. Raw evidence stays local.
"""
import argparse,json,os,pathlib,subprocess,time,hashlib,shutil
from live_transport import Relay
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--env-file',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--model',default='gpt-5.4-mini');a=p.parse_args()
key=[x.partition('=')[2].strip().strip('\"\'') for x in a.env_file.read_text().splitlines() if x.strip().startswith('OPENAI_API_KEY=')]
assert len(key)==1 and key[0], 'need one API key'
out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);work=out/'repo';work.mkdir();home=out/'home';home.mkdir()
test='from maths import add\nassert add(2,3)==5\n'
(work/'maths.py').write_text('def add(a,b):\n    return a-b\n');(work/'test_maths.py').write_text(test)
subprocess.run(['git','init','-q',str(work)],check=True);subprocess.run(['git','-C',str(work),'add','.'],check=True);subprocess.run(['git','-C',str(work),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline'],check=True)
prompts=['OLD_SESSION_CANARY: Fix add in maths.py to add numbers. Run python3 test_maths.py. Never modify test_maths.py.', 'Add subtract(a,b) to maths.py, preserving add. Run checks for both. Never modify test_maths.py.', 'Continue: add multiply(a,b) to maths.py, preserving existing functions. Run checks for all three. Never modify test_maths.py.']
(out/'prompts.json').write_text(json.dumps(prompts))
summary={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'model':a.model,'provider':'openai','fixture':False,'contextEditing':False,'switch':'harness-driven registered extension command','manualSteering':0,'scope':'internal native owner two turns + formal CLI new-process resume','status':'failed','processes':[]}
try:
 with Relay('https://api.openai.com/v1',a.model,key[0],out/'transport',max_requests=30) as relay:
  env={'PATH':os.environ['PATH'],'HOME':str(home),'OPENAI_API_KEY':relay.capability,'OPENAI_BASE_URL':relay.base_url}
  def run(args,label):
   start=time.monotonic()
   try:r=subprocess.run(args,cwd=work,env=env,text=True,capture_output=True,timeout=360);code=r.returncode;(out/(label+'.stdout')).write_text(r.stdout);(out/(label+'.stderr')).write_text(r.stderr)
   except subprocess.TimeoutExpired:code=124
   summary['processes'].append({'label':label,'exit':code,'elapsed':time.monotonic()-start})
   (out/(label+'.diff')).write_text(subprocess.check_output(['git','diff','HEAD'],cwd=work,text=True))
   assert code==0,label+' failed'
  run([shutil.which('node'),'--experimental-strip-types',str(ROOT/'experiments/live-replacement.mjs'),str(out),a.model],'owner')
  old=(out/'old.jsonl').read_bytes();assert old==(out/'old-frozen.jsonl').read_bytes()
  new=pathlib.Path((out/'new-path.txt').read_text());prefix=new.read_bytes()
  rows=lambda data:[json.loads(x) for x in data.splitlines()]
  assert rows(old)[0]['id']!=rows(prefix)[0]['id'];assert b'OLD_SESSION_CANARY' not in prefix
  # External assertions cannot be relaxed by editing the repository tests.
  def check(multiply=False):
   code='import maths; assert maths.add(2,3)==5; assert maths.add(-2,3)==1; assert maths.subtract(7,3)==4; assert maths.subtract(-2,3)==-5'
   if multiply:code+='; assert maths.multiply(3,4)==12; assert maths.multiply(-2,3)==-6'
   r=subprocess.run([shutil.which('python3'),'-c',code],cwd=work,env=env,text=True,capture_output=True)
   assert r.returncode==0,'external behavior assertion';assert (work/'test_maths.py').read_text()==test
  check()
  run([str(ROOT/'target/debug/pi-rs'),'--workspace',str(work),'--session',str(new),'--resume','--input',prompts[2]],'resume')
  check(True);assert new.read_bytes().startswith(prefix);assert (out/'old.jsonl').read_bytes()==old
  summary.update(status='tested',codingTurnsPassed=3,externalAcceptance=True,oldBytesFrozen=True,distinctIds=True,newHistoryIsolated=True,resumePrefixPreserved=True,testsUnchanged=True)
except Exception as error:summary['failure']=str(error)
finally:
 summary['transport']=[json.loads(f.read_text()) for f in sorted((out/'transport').glob('*.meta.json'))]
 summary['artifactHashes']={str(f.relative_to(out)):hashlib.sha256(f.read_bytes()).hexdigest() for f in out.rglob('*') if f.is_file() and f.name!='summary.json'}
 (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ('artifactHashes','transport')}))
raise SystemExit(0 if summary['status']=='tested' else 1)

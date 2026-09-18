#!/usr/bin/env python3
"""Serial live formal-CLI dogfood; parent-held acceptance, disposable workspaces.
Not an OS sandbox: tools still run as the host user. No fixture fallback.
"""
import argparse, difflib, hashlib, json, os, pathlib, subprocess, time
from live_transport import Relay
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(); p.add_argument('--engine',choices=['native','upstream','rust-core'],default='native'); p.add_argument('--binary',type=pathlib.Path); p.add_argument('--env-file',type=pathlib.Path,required=True); p.add_argument('--output',type=pathlib.Path,required=True); p.add_argument('--model',default='gpt-5.4-mini'); p.add_argument('--repetitions',type=int,default=3); a=p.parse_args()
assert 1 <= a.repetitions <= 3
assert not a.binary or a.engine=='rust-core', '--binary requires rust-core engine'
key=[x.partition('=')[2].strip().strip('\"\'') for x in a.env_file.read_text().splitlines() if x.startswith('OPENAI_API_KEY=')]; assert len(key)==1 and key[0], 'OPENAI_API_KEY unavailable'
out=a.output.resolve(); out.mkdir(parents=True,exist_ok=False)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
summary={'engine':a.engine,'installedBinary':str(a.binary.resolve()) if a.binary else None,'installedBinarySha256':sha(a.binary) if a.binary else None,'upstreamCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT/'vendor/pi-mono',text=True).strip(),'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'model':a.model,'provider':'OpenAI chat completions via parent-held loopback relay','contextEditing':False,'fixture':False,'manualSteering':0,'binarySha256':sha(ROOT/'target/debug/pi-rs'),'addonSha256':sha(ROOT/'target/native-session.node'),'harnessSha256':sha(pathlib.Path(__file__)),'sourceDirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),'adapterSha256':sha(ROOT/'experiments/agent-shaped-adapter.mjs'),'runs':[],'limits':['Host-user tools, not security sandbox','Two small tasks per repetition; no fork/switch claim','Acceptance owned by parent and not exposed in workspace; malicious host access not prevented']}
for repeat in range(a.repetitions):
 d=out/str(repeat); d.mkdir(); work=d/'repo'; work.mkdir(); home=d/'home'; home.mkdir()
 instructions='Implement arithmetic in maths.py. Never modify test_maths.py or this file. Before finishing, run python3 test_maths.py. For every added public function include a docstring.\n'
 test='from maths import add\nassert add(2, 3) == 5\nassert add(-2, 3) == 1\n'
 (work/'AGENTS.md').write_text(instructions); (work/'test_maths.py').write_text(test); (work/'maths.py').write_text('def add(a, b):\n    return a - b\n')
 subprocess.run(['git','init','-q',str(work)],check=True); subprocess.run(['git','-C',str(work),'add','.'],check=True); subprocess.run(['git','-C',str(work),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','baseline'],check=True)
 with Relay('https://api.openai.com/v1',a.model,key[0],d/'transport',max_requests=24) as relay:
  env={'PATH':os.environ['PATH'],'HOME':str(home),'OPENAI_API_KEY':relay.capability,'OPENAI_BASE_URL':relay.base_url}
  if a.engine in ('upstream','rust-core'):
   agent_home=home/'.pi/agent'; agent_home.mkdir(parents=True)
   (agent_home/'models.json').write_text(json.dumps({'providers':{'openai':{'baseUrl':relay.base_url,'api':'openai-completions','apiKey':'$OPENAI_API_KEY','models':[{'id':a.model,'name':a.model,'reasoning':True,'input':['text'],'contextWindow':128000,'maxTokens':8192}]}}}))
  for stage,prompt in enumerate(['Fix the arithmetic bug in this repository and verify the result. Follow the repository instructions.', 'Continue the prior task. Add subtract(a,b), preserving addition, and verify subtraction with positive and negative arguments. Follow the repository instructions.']):
   pre_files={p.name:p.read_text() for p in work.iterdir() if p.is_file()}; session=d/'session.jsonl'; before=session.read_bytes() if session.exists() else b''
   args=[str(ROOT/'target/debug/pi-rs'),'--workspace',str(work),'--session',str(session),'--input',prompt,'--model',a.model]+(['--resume'] if stage else [])
   if a.engine in ('upstream','rust-core'): args=['node',str(ROOT/'vendor/pi-mono/packages/coding-agent/dist/cli.js'),'--print','--mode','json','--provider','openai','--model',a.model,'--thinking','off','--session',str(session),prompt]
   if a.engine=='rust-core':
    args[1:1]=['--experimental-strip-types','--import',str(ROOT/'experiments/upstream-cli-preload.mjs')]
    env.update(PI_RS_PROBE_SCRATCH=str(d/f'{stage}.scratch.jsonl'),PI_RS_PROBE_TRACE=str(d/f'{stage}.native-trace.json'))
   if a.binary:
    cli=str(ROOT/'vendor/pi-mono/packages/coding-agent/dist/cli.js')
    args=[str(a.binary.resolve()),'--experimental-upstream-core',*args[args.index(cli)+1:]]
    env['PI_RS_CORE_TRACE']=str(d/f'{stage}.native-trace.json')
   started=time.monotonic()
   try:
    r=subprocess.run(args,cwd=work,env=env,text=True,capture_output=True,input='',timeout=240); code=r.returncode
    for kind,value in [('stdout',r.stdout),('stderr',r.stderr)]: (d/f'{stage}.{kind}').write_text(value.replace(key[0],'[REDACTED]').replace(relay.capability,'[CAPABILITY]'))
   except subprocess.TimeoutExpired: code=124
   elapsed=time.monotonic()-started
   # Acceptance is fixed here, outside the model's working directory, and evaluated by coordinator.
   check='import maths; assert maths.add(2,3)==5; assert maths.add(-2,3)==1; assert maths.add(0,0)==0'
   if stage: check+='; assert maths.subtract(7,3)==4; assert maths.subtract(-2,3)==-5; assert maths.subtract.__doc__'
   accepted=subprocess.run(['python3','-I','-c','import sys; sys.path.insert(0,'+repr(str(work))+');'+check],text=True,capture_output=True)
   (d/f'{stage}.acceptance.stderr').write_text(accepted.stderr)
   integrity={name:(work/name).exists() and (work/name).read_text()==content for name,content in [('AGENTS.md',instructions),('test_maths.py',test)]}; frozen=all(integrity.values())
   history=session.read_bytes() if session.exists() else b''; prefix=history.startswith(before)
   entries=[json.loads(x) for x in (history[len(before):] if prefix else history).splitlines()]; messages=[x.get('message',{}) for x in entries]
   calls=[c for m in messages for c in m.get('content',[]) if isinstance(c,dict) and c.get('type')=='toolCall']
   ran_test=any(c.get('name')=='bash' and 'python3 test_maths.py' in c.get('arguments',{}).get('command','') for c in calls)
   record={'repeat':repeat,'stage':stage,'prompt':prompt,'exit':code,'elapsedSeconds':elapsed,'externalExit':accepted.returncode,'testsAndInstructionsUnchanged':frozen,'integrity':integrity,'historyPrefixPreserved':prefix,'ranRepositoryTests':ran_test,'toolCalls':calls,'usage':[m.get('usage') for m in messages if m.get('role')=='assistant'],'passed':code==0 and accepted.returncode==0 and frozen and prefix and ran_test}
   incremental=''.join(''.join(difflib.unified_diff(pre_files.get(name,'').splitlines(True),((work/name).read_text() if (work/name).exists() else '').splitlines(True),fromfile='before/'+name,tofile='after/'+name)) for name in sorted(set(pre_files)|{p.name for p in work.iterdir() if p.is_file()})); (d/f'{stage}.incremental.diff').write_text(incremental)
   summary['runs'].append(record); (d/f'{stage}.diff').write_text(subprocess.check_output(['git','diff','HEAD'],cwd=work,text=True)); (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
   if not record['passed']: break
print(json.dumps({'output':str(out),'passed':sum(x['passed'] for x in summary['runs']),'failed':sum(not x['passed'] for x in summary['runs'])}))

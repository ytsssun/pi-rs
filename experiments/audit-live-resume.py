#!/usr/bin/env python3
"""Audit saved live requests; no network or credentials. Scope is explicit assertions."""
import argparse, json, pathlib, re
p=argparse.ArgumentParser();p.add_argument('upstream',type=pathlib.Path);p.add_argument('rust',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
def normalize(v,root):
 if isinstance(v,str):return v.replace(str(root.resolve()),'<RUN>')
 if isinstance(v,list):return [normalize(x,root) for x in v]
 if isinstance(v,dict):return {k:normalize(x,root) for k,x in v.items()}
 return v
def text(m):
 c=m.get('content');return c if isinstance(c,str) else ''.join(x.get('text','') for x in c or [] if x.get('type')=='text')
out={'scope':'Recorded request structure and restored prefix, not full behavioral parity','runs':[]};references=[]
for engine,base in [('upstream',a.upstream),('rust',a.rust)]:
 summary=json.loads((base/'summary.json').read_text());prompts=[r['prompt'] for r in summary['runs'] if r['repeat']==0]
 for repeat in range(3):
  root=base/str(repeat);requests=[json.loads(f.read_text()) for f in sorted((root/'transport').glob('request-*.json')) if re.fullmatch(r'request-\d+\.json',f.name)]
  first_resume=next(i for i,r in enumerate(requests) if any(text(m)==prompts[1] for m in r['messages'] if m['role']=='user'))
  initial=requests[0];references.append(normalize({k:v for k,v in initial.items() if k!='messages'},root))
  for i,r in enumerate(requests):
   assert normalize(r['tools'],root)==normalize(initial['tools'],root)
   assert [text(m) for m in r['messages'] if m['role']=='user']==prompts[:(2 if i>=first_resume else 1)]
   assert [m for m in r['messages'] if m['role'] in ['system','developer']]==[initial['messages'][0]]
   pending=set();seen=set()
   for m in r['messages']:
    if m['role']=='tool':
     assert m['tool_call_id'] in pending;pending.remove(m['tool_call_id'])
    else:
     assert not pending,'Unresolved calls before next message'
     for c in m.get('tool_calls',[]):
      assert c['id'] not in seen;seen.add(c['id']);pending.add(c['id'])
   assert not pending
  previous=requests[first_resume-1]['messages'];resumed=requests[first_resume]['messages']
  assert resumed[:len(previous)]==previous,'Restored request prefix changed'
  assert len(resumed)==len(previous)+2 and resumed[-2]['role']=='assistant' and text(resumed[-1])==prompts[1]
  out['runs'].append({'engine':engine,'repeat':repeat,'requests':len(requests),'firstResumeRequest':first_resume+1,'unchangedInstructionsAndTools':True,'userOrdering':True,'toolPairing':True,'restoredPrefix':True})
assert all(r==references[0] for r in references),'Wire options or tool schemas differ between runs'
out['normalizedWireOptionsAndToolSchemasEqual']=True
out['status']='PASS';a.output.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))

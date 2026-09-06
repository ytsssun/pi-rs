#!/usr/bin/env python3
"""Append-only project ledger. Local POSIX lock serializes claims and updates."""
import argparse, datetime, fcntl, json, os
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('action', choices=['list','append','claim'])
p.add_argument('--id'); p.add_argument('--owner'); p.add_argument('--record')
a=p.parse_args()
path=Path(__file__).resolve().parent.parent/'docs/board.jsonl'
with path.open('a+') as f:
 fcntl.flock(f, fcntl.LOCK_EX)
 f.seek(0); records=[json.loads(x) for x in f if x.strip()]
 latest={r['id']:r for r in records}
 if a.action=='list':
  for r in latest.values():
   if (not a.id or r['id']==a.id) and (not a.owner or r.get('owner')==a.owner): print(json.dumps(r,ensure_ascii=False))
 else:
  if a.action=='claim':
   if not a.id or not a.owner: p.error('claim requires --id and --owner')
   old=latest[a.id]
   if old.get('status')!='proposed': p.error('only proposed tasks may be claimed; append an explicit recovery record first')
   r={**old,'owner':a.owner,'status':'in_progress'}
  else:
   r=json.loads(a.record)
   if not all(k in r for k in ['id','type','status','owner']): p.error('record requires id/type/status/owner')
  r['recorded_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
  f.write(json.dumps(r,ensure_ascii=False)+'\n'); f.flush(); os.fsync(f.fileno())

#!/usr/bin/env python3
"""Read pagination across process exit. Loopback HTTP double, real file reads."""
import http.server,json,os,pathlib,subprocess,tempfile,threading
ROOT=pathlib.Path(__file__).resolve().parent.parent
BIN=pathlib.Path(os.environ.get('PI_RS_BIN',ROOT/'target/debug/pi-rs'))
requests=[];checks=[]
def check(name,value):
    if not value: raise AssertionError(name)
    checks.append(name)
def call(i,offset):return {'role':'assistant','content':None,'tool_calls':[{'id':i,'type':'function','function':{'name':'read','arguments':json.dumps({'path':'pages.txt','offset':offset,'limit':2})}}]}
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a):pass
    def do_POST(self):
        q=json.loads(self.rfile.read(int(self.headers['Content-Length'])));requests.append(q)
        i=len(requests)
        msg=call('page1',1) if i==1 else call('page2',3) if i==2 else {'role':'assistant','content':'done'}
        body=json.dumps({'choices':[{'finish_reason':'tool_calls' if i<3 else 'stop','message':msg}]}).encode()
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with tempfile.TemporaryDirectory(prefix='pi-read-resume-') as tmp:
    wd=pathlib.Path(tmp);(wd/'pages.txt').write_text('a\nb\nc\nd');session=wd/'session.json'
    env={**os.environ,'OPENAI_API_KEY':'local-test-only','OPENAI_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1'}
    def cli(*args):return subprocess.run([str(BIN),*map(str,args)],env=env,cwd=ROOT,capture_output=True,text=True,timeout=15)
    first=cli('--input','Read all pages','--workspace',wd,'--session',session,'--model','local','--max-rounds',1)
    check('first process round-bound exit checkpoints page',first.returncode!=0 and 'round limit' in first.stderr)
    saved=json.loads(session.read_text());page1=saved['messages'][-1]
    check('first actual page with continuation persisted',page1['content']=='a\nb\n\n[2 more lines in file. Use offset=3 to continue.]')
    second=cli('--resume','--session',session,'--model','local')
    check('second process completes reading',second.returncode==0)
    check('provider receives persisted first page after resume',requests[1]['messages'][-1]==page1)
    final=json.loads(session.read_text());results=[m for m in final['messages'] if m['role']=='tool']
    check('second page exact and correlated',len(results)==2 and results[1]['tool_call_id']=='page2' and results[1]['content']=='c\nd')
    check('provider sees both canonical pages',requests[2]['messages']==final['messages'][:-1])
    check('original canonical prefix unchanged',final['messages'][:len(saved['messages'])]==saved['messages'])
    check('read does not mutate source',(wd/'pages.txt').read_text()=='a\nb\nc\nd')
    before=session.read_bytes();r=cli('--resume','--session',session,'--model','local')
    check('completed resume no provider or state change',r.returncode==0 and len(requests)==3 and session.read_bytes()==before)
finally:server.shutdown()
print(json.dumps({'status':'verified','provider':'loopback HTTP double; no live model','checks':checks,'passed':len(checks)},indent=2))

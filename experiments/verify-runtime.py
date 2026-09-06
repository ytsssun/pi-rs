#!/usr/bin/env python3
"""Black-box acceptance, ephemeral workspace and local HTTP provider double."""
import hashlib, http.server, json, os, pathlib, subprocess, tempfile, threading
ROOT=pathlib.Path(__file__).resolve().parent.parent
BIN=ROOT/'target/debug/pi-rs'
checks=[]
def check(name, condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
with tempfile.TemporaryDirectory(prefix='pi-rs-verify-') as d:
    wd=pathlib.Path(d); (wd/'fact.txt').write_text('unique tool evidence: 73921\n')
    requests=[]
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*a): pass
        def do_POST(self):
            data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            requests.append(data)
            if len(requests)==1:
                msg={'role':'assistant','content':None,'tool_calls':[{'id':'independent-1','type':'function','function':{'name':'read','arguments':json.dumps({'path':'fact.txt'})}}]}
            else:
                results=[m for m in data['messages'] if m['role']=='tool']
                msg={'role':'assistant','content':results[-1]['content'] if results else 'MISSING TOOL EVIDENCE'}
            body=json.dumps({'choices':[{'finish_reason':'length' if data['model']=='incomplete' else ('tool_calls' if len(requests)==1 else 'stop'),'message':msg}],'usage':{'prompt_tokens':1,'completion_tokens':1,'total_tokens':2}}).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    env={**os.environ,'OPENAI_API_KEY':'local-test-token','OPENAI_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1'}
    def cli(*args): return subprocess.run([str(BIN),*map(str,args)],cwd=ROOT,env=env,capture_output=True,text=True,timeout=10)
    session=wd/'session.json'
    p=cli('--input','Read fact.txt','--workspace',wd,'--session',session,'--model','local-double','--max-rounds',1)
    check('explicit round bound returns failure',p.returncode!=0 and 'round limit' in p.stderr)
    saved=json.loads(session.read_text())
    check('round-bound checkpoint includes tool result',saved['messages'][-1]['role']=='tool' and '73921' in saved['messages'][-1]['content'])
    p=cli('--resume','--session',session,'--model','local-double')
    check('resume carries actual tool result to HTTP model',p.returncode==0 and '73921' in p.stdout and len(requests)==2)
    check('correlated tool call retained',requests[1]['messages'][-1]['tool_call_id']=='independent-1')
    saved=json.loads(session.read_text()); check('provider usage saved',len(saved['usage'])==2)
    before=digest(session)
    p=cli('--resume','--session',session,'--model','local-double')
    check('completed resume makes no new model request',p.returncode==0 and len(requests)==2 and digest(session)==before)
    p=cli('--input','overwrite','--session',session,'--model','local-double')
    check('existing session cannot be overwritten',p.returncode!=0 and digest(session)==before)
    broken=wd/'broken.json';broken.write_text('{broken');before=digest(broken)
    p=cli('--resume','--session',broken,'--model','local-double')
    check('corrupted session remains unchanged',p.returncode!=0 and digest(broken)==before)
    unknown=wd/'unknown.json'; saved['version']=900;unknown.write_text(json.dumps(saved));before=digest(unknown)
    p=cli('--resume','--session',unknown,'--model','local-double')
    check('unknown schema version rejected without overwrite',p.returncode!=0 and digest(unknown)==before)
    fixture=wd/'fixture.json';fixture.write_text(json.dumps([{'role':'assistant','tool_calls':[{'id':'bad','type':'function','function':{'name':'nonexistent','arguments':'{}'}}]},{'role':'assistant','content':'done'}]))
    errors=wd/'errors.json';p=cli('--input','test','--workspace',wd,'--session',errors,'--fixture',fixture)
    check('unknown tool produces correlated error result',p.returncode==0 and json.loads(errors.read_text())['messages'][2]['content'].startswith('ERROR:'))
    incomplete=wd/'incomplete.json'
    p=cli('--input','incomplete','--workspace',wd,'--session',incomplete,'--model','incomplete')
    check('incomplete provider finish rejected without assistant save',p.returncode!=0 and len(json.loads(incomplete.read_text())['messages'])==1)
    context=wd/'context.json'
    context.write_text(json.dumps({'version':1,'workspace':str(wd),'messages':requests[1]['messages'],'usage':[]}))
    p=cli('--resume','--session',context,'--model','local-double','--context-tool-chars',3)
    check('context view trims provider-visible tool result',p.returncode==0 and requests[-1]['messages'][-1]['content'].startswith('uni\n[context view truncated'))
    check('context edit retains canonical tool result',json.loads(context.read_text())['messages'][2]['content']=='unique tool evidence: 73921\n')
    server.shutdown()
print(json.dumps({'status':'verified','provider':'local HTTP test double; no live model','checks':checks,'passed':len(checks)},indent=2))

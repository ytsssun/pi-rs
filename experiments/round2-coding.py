#!/usr/bin/env python3
"""Independent coding acceptance. Local HTTP model double; real files/processes.
Build first. PI_RS_BIN may select a binary built from a clean checkout.
"""
import hashlib, http.server, json, os, pathlib, subprocess, tempfile, threading, time
ROOT=pathlib.Path(__file__).resolve().parent.parent
BIN=pathlib.Path(os.environ.get('PI_RS_BIN',ROOT/'target/debug/pi-rs-legacy')).resolve()
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
def call(name,args,ident):
    return {'role':'assistant','content':None,'tool_calls':[{'id':ident,'type':'function','function':{'name':name,'arguments':json.dumps(args)}}]}
def final(text): return {'role':'assistant','content':text}
with tempfile.TemporaryDirectory(prefix='pi-rs-round2-') as tmp:
    wd=pathlib.Path(tmp)
    (wd/'calc.py').write_text('def add(a, b):\n    return a - b\n')
    (wd/'test_calc.py').write_text('from calc import add\nassert add(2, 3) == 5\nprint("INITIAL_TEST_PASS")\n')
    script=[call('read',{'path':'calc.py'},'read-1'),
            call('bash',{'command':'python3 test_calc.py'},'test-fail'),
            call('write',{'path':'calc.py','content':'def add(a, b):\n    return a + b\n'},'write-fix'),
            call('bash',{'command':'python3 test_calc.py'},'test-pass'),final('first turn complete'),
            call('write',{'path':'test_calc.py','content':'from calc import add\nassert add(2, 3) == 5\nassert add(-2, 3) == 1\nprint("FOLLOWUP_TEST_PASS")\n'},'write-followup'),
            call('bash',{'command':'python3 test_calc.py'},'followup-pass'),final('followup complete')]
    requests=[]
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*a): pass
        def do_POST(self):
            data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            requests.append(data)
            index=len(requests)-1
            msg=script[index] if index<len(script) else final('unexpected additional request')
            response={'choices':[{'finish_reason':'tool_calls' if 'tool_calls' in msg else 'stop','message':msg}],'usage':{'prompt_tokens':1,'completion_tokens':1,'total_tokens':2}}
            payload=json.dumps(response).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(payload)
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    env={**os.environ,'OPENAI_API_KEY':'round2-local-double','OPENAI_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1','PYTHONDONTWRITEBYTECODE':'1'}
    def cli(*args): return subprocess.run([str(BIN),*map(str,args)],cwd=ROOT,env=env,text=True,capture_output=True,timeout=30)
    s=wd/'session.json'
    r=cli('--input','Fix add and run tests','--workspace',wd,'--session',s,'--model','local-double','--allow-mutations','--context-tool-chars',40)
    check('first process succeeds',r.returncode==0)
    check('actual source repaired',(wd/'calc.py').read_text()=='def add(a, b):\n    return a + b\n')
    first=json.loads(s.read_text()); messages=first['messages']; results={m['tool_call_id']:m['content'] for m in messages if m['role']=='tool'}
    check('real initial test failure retained','AssertionError' in results['test-fail'])
    check('real fixed test success retained','INITIAL_TEST_PASS' in results['test-pass'])
    check('actual fixed test independently passes',subprocess.run(['python3','test_calc.py'],cwd=wd,env=env,capture_output=True).returncode==0)
    check('tool evidence reaches next HTTP request',any('INITIAL_TEST_PASS' in str(q['messages']) for q in requests))
    r=cli('--resume','--input','Add negative number coverage and run tests','--session',s,'--model','local-double','--allow-mutations')
    check('separate followup process succeeds',r.returncode==0)
    saved=json.loads(s.read_text()); check('first turn preserved exactly',saved['messages'][:len(messages)]==messages)
    check('context policy survives resume',saved['context_tool_chars']==40)
    check('provider receives trimmed projection while canonical failure survives',any('context view truncated' in str(q['messages']) for q in requests) and 'AssertionError' in results['test-fail'])
    check('second user input persists',sum(m['role']=='user' for m in saved['messages'])==2)
    check('followup changed actual tests','assert add(-2, 3) == 1' in (wd/'test_calc.py').read_text())
    check('followup actual test success retained',any(m['role']=='tool' and 'FOLLOWUP_TEST_PASS' in m['content'] for m in saved['messages']))
    calls=[c['id'] for m in saved['messages'] for c in m.get('tool_calls',[])]
    results=[m['tool_call_id'] for m in saved['messages'] if m['role']=='tool']
    check('all canonical tool calls correlated once',calls==results and len(set(calls))==len(calls))
    check('usage survives both turns',len(saved['usage'])==8)
    before=s.read_bytes(); count=len(requests)
    r=cli('--resume','--session',s,'--model','local-double')
    check('completed resume neither calls provider nor changes session',r.returncode==0 and len(requests)==count and s.read_bytes()==before)
    # A deterministic fixture is intentional here: final text cannot prove mutation happened.
    denied=wd/'denied.json';fixture=wd/'denied-fixture.json';fixture.write_text(json.dumps([call('write',{'path':'denied.txt','content':'must not exist'},'denied-write'),call('bash',{'command':'touch denied-shell'},'denied-bash'),final('denied calls processed')]))
    r=cli('--input','deny effects','--workspace',wd,'--session',denied,'--fixture',fixture)
    check('mutation opt-in required for write and bash',not (wd/'denied.txt').exists() and not (wd/'denied-shell').exists())
    d=json.loads(denied.read_text());check('denied effects visible as tool errors',len([m for m in d['messages'] if m['role']=='tool' and 'ERROR:' in m['content']])==2)
    edges=wd/'edges.json';ef=wd/'edges-fixture.json'
    ef.write_text(json.dumps([
        call('bash',{'command':'sleep 5','timeout':1},'timeout'),
        call('bash',{'command':'sleep 20 & echo BACKGROUND_RETURN'},'background'),
        call('bash',{'command':'yes x | head -c 100000'},'bounded'),
        call('write',{'path':'../round2-escaped-file','content':'forbidden'},'escape'),
        final('edge cases complete')]))
    start=time.monotonic();r=cli('--input','edge cases','--workspace',wd,'--session',edges,'--fixture',ef,'--allow-mutations')
    elapsed=time.monotonic()-start
    check('timeout and background descendants do not hang CLI',r.returncode==0 and elapsed<10)
    er={m['tool_call_id']:m['content'] for m in json.loads(edges.read_text())['messages'] if m['role']=='tool'}
    check('timeout is a correlated error','ERROR:' in er['timeout'] and 'timed out' in er['timeout'])
    check('background command returns observed output','BACKGROUND_RETURN' in er['background'])
    check('large bash output bounded with explicit notice',len(er['bounded'])<70000 and 'truncated' in er['bounded'])
    check('file path escape rejected','ERROR:' in er['escape'] and not (wd.parent/'round2-escaped-file').exists())
    # Kill the runtime only after observing a real effect. A surviving shell is
    # allowed to finish; resume must not silently execute the pending call again.
    uncertain=wd/'uncertain.json'; uf=wd/'uncertain-fixture.json'
    uf.write_text(json.dumps([call('bash',{'command':'echo once >> effect-count; sleep 2'},'uncertain-call'),final('resolved')]))
    proc=subprocess.Popen([str(BIN),'--input','effect','--workspace',str(wd),'--session',str(uncertain),'--fixture',str(uf),'--allow-mutations'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    deadline=time.monotonic()+10
    while not (wd/'effect-count').exists() and proc.poll() is None and time.monotonic()<deadline: time.sleep(.02)
    check('effect actually starts before injected crash',(wd/'effect-count').exists())
    proc.kill();proc.wait(timeout=5)
    check('uncertain call marker persisted before effect',json.loads(uncertain.read_text())['in_flight']=='uncertain-call')
    time.sleep(2.5)
    before=uncertain.read_bytes()
    r=cli('--resume','--session',uncertain,'--fixture',uf,'--allow-mutations')
    check('uncertain resume refuses replay',r.returncode!=0 and uncertain.read_bytes()==before and (wd/'effect-count').read_text()=='once\n')
    r=cli('--resume','--session',uncertain,'--fixture',uf,'--allow-mutations','--resolve-in-flight','Observed exactly one append; shell has exited')
    check('explicit uncertain resolution completes without replay',r.returncode==0 and (wd/'effect-count').read_text()=='once\n')
    resolved=json.loads(uncertain.read_text())
    check('operator resolution remains in canonical history',any(m['role']=='tool' and 'Observed exactly one append' in m['content'] for m in resolved['messages']))
    server.shutdown()
print(json.dumps({'status':'verified','provider':'local HTTP double + fixture; NO live inference','binary':str(BIN),'checks':checks,'passed':len(checks)},indent=2))

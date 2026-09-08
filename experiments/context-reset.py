#!/usr/bin/env python3
"""CLI policy reset with real HTTP requests; no model inference."""
import http.server, json, os, pathlib, subprocess, tempfile, threading
root = pathlib.Path(__file__).resolve().parent.parent
requests = []
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_POST(self):
        q = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        requests.append(q)
        msg = ({'role':'assistant', 'tool_calls':[{'id':'read1','type':'function','function':{'name':'read','arguments':'{"path":"data"}'}}]} if len(requests)==1 else {'role':'assistant','content':'done'})
        body = json.dumps({'choices':[{'finish_reason':'tool_calls' if 'tool_calls' in msg else 'stop','message':msg}]}).encode()
        self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(body)
server = http.server.ThreadingHTTPServer(('127.0.0.1',0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix='pi-context-reset-') as tmp:
        wd=pathlib.Path(tmp); (wd/'data').write_text('abcdef')
        session=wd/'session.json'
        env={**os.environ, 'OPENAI_API_KEY':'local-test-only','OPENAI_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1'}
        def cli(*args):
            return subprocess.run([str(root/'target/debug/pi-rs'),'--session',str(session),'--model','local',*map(str,args)],env=env,capture_output=True,text=True,timeout=10)
        first=cli('--input','read','--workspace',wd,'--context-tool-chars','2')
        assert first.returncode==0,first.stderr
        before=json.loads(session.read_text())
        assert requests[1]['messages'][2]['content'].startswith('ab\n[context')
        assert before['messages'][2]['content']=='abcdef'
        invalid=cli('--resume','--context-tool-chars','invalid')
        assert invalid.returncode!=0 and json.loads(session.read_text())==before
        second=cli('--resume','--input','look again','--context-tool-chars','none')
        assert second.returncode==0,second.stderr
        after=json.loads(session.read_text())
        assert after['context_tool_chars'] is None
        assert len(after['context_policy_changes']) == 2
        assert after['context_policy_changes'][0]['tool_chars'] == 2
        assert after['context_policy_changes'][1]['previous_tool_chars'] == 2
        assert after['context_policy_changes'][1]['tool_chars'] is None
        assert after['messages'][:len(before['messages'])]==before['messages']
        assert requests[2]['messages'][2]['content']=='abcdef'
        third=cli('--resume','--input','still full')
        assert third.returncode==0,third.stderr
        assert requests[3]['messages'][2]['content']=='abcdef'
        assert json.loads(session.read_text())['context_tool_chars'] is None
        uncertain=json.loads(session.read_text())
        uncertain['messages'] += [{'role':'user','content':'pending effect'}, {'role':'assistant','tool_calls':[{'id':'write-pending','type':'function','function':{'name':'write','arguments':'{"path":"data","content":"changed"}'}}]}]
        uncertain['in_flight']='write-pending'
        session.write_text(json.dumps(uncertain))
        snapshot=session.read_bytes()
        denied=cli('--resume','--context-tool-chars','none')
        assert denied.returncode!=0 and 'uncertain' in denied.stderr
        assert session.read_bytes()==snapshot and (wd/'data').read_text()=='abcdef'
        print('PASS: trimmed view, canonical preservation, invalid-input no change, explicit reset, full view and persisted reset across processes. Local HTTP double only.')
finally: server.shutdown(); server.server_close()

#!/usr/bin/env python3
"""Local HTTP oracle for the actual Node-API -> shared Rust provider path. No live model."""
import json
import os
from pathlib import Path
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

os.chdir(Path(__file__).resolve().parent.parent)
requests = []
status = 200
body = {}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        requests.append((self.path, self.headers.get('Authorization'),
                         json.loads(self.rfile.read(int(self.headers['Content-Length'])))))
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Location', '/redirect-target')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
script = """
import {request} from './prototype/architecture/native-store-backend.mjs';
try {
  console.log(JSON.stringify({value:request({op:'provider_chat',model:'fixture-model',
    messages:[{role:'user',content:'fixture prompt'}],tools:[],reasoning_effort:'none'})}));
} catch (e) { console.log(JSON.stringify({error:e.message})); }
"""
try:
    for name, status, body in [
        ('success', 200, {'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':'ok'}}], 'usage':{'total_tokens':7}}),
        ('incomplete', 200, {'choices':[{'finish_reason':'length','message':{'role':'assistant','content':'partial'}}]}),
        ('http-error', 429, {'error':{'message':'fixture rate limit'}}),
        ('redirect', 307, {}),
    ]:
        before = len(requests)
        result = subprocess.run(['node','--input-type=module','-e',script], check=True,
            capture_output=True, text=True, timeout=15, env={
                'PATH':os.environ['PATH'], 'OPENAI_API_KEY':'fixture-only-key',
                'OPENAI_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1', 'FIXTURE_BASE_URL':f'http://127.0.0.1:{server.server_port}/v1'})
        observed = json.loads(result.stdout)
        assert len(requests) == before + 1, 'redirect/retry unexpectedly performed'
        path, auth, payload = requests[-1]
        assert path == '/v1/chat/completions'
        assert auth == 'Bearer fixture-only-key'
        assert payload == {'model':'fixture-model','messages':[{'role':'user','content':'fixture prompt'}], 'tools':[], 'reasoning_effort':'none'}
        if name == 'success':
            assert observed['value'] == {'role':'assistant','content':'ok','_provider_usage':{'total_tokens':7}}
        else:
            assert 'error' in observed
            assert 'fixture-only-key' not in observed['error']
        print(f'{name}: passed (local HTTP fixture)')
finally:
    server.shutdown()
    server.server_close()
    thread.join()

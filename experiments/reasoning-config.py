#!/usr/bin/env python3
"""Real CLI/loopback requests, scripted responses: no live inference."""
import http.server
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading

root = Path(__file__).resolve().parent.parent
requests = []
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def do_POST(self):
        requests.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
        data = json.dumps({'choices': [{'finish_reason': 'stop', 'message': {'role': 'assistant', 'content': 'done'}}]}).encode()
        self.send_response(200)
        self.end_headers()
        self.wfile.write(data)
server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix='pi-reasoning-config-') as tmp:
        wd = Path(tmp)
        env = {'PATH': os.defpath, 'OPENAI_API_KEY': 'local-test-only', 'OPENAI_BASE_URL': 'http://127.0.0.1:%d/v1' % server.server_port}
        def cli(name, *args):
            return subprocess.run([str(root/'target/debug/pi-rs-legacy'), '--input', 'test', '--workspace', tmp, '--session', str(wd/name), '--model', 'test', *args], env=env, capture_output=True, text=True, timeout=10)
        assert cli('default.json').returncode == 0
        assert 'reasoning_effort' not in requests[-1]
        assert cli('none.json', '--reasoning-effort', 'none').returncode == 0
        assert requests[-1]['reasoning_effort'] == 'none'
        assert cli('invalid.json', '--reasoning-effort', 'bogus').returncode != 0
        assert not (wd/'invalid.json').exists() and len(requests) == 2
        print('PASS: omitted preserved, explicit none transmitted, invalid rejected before session/API. Local HTTP only.')
finally:
    server.shutdown()
    server.server_close()

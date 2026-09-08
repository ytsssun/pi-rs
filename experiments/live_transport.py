#!/usr/bin/env python3
"""Recording relay for live validation, not a provider implementation or sandbox.

The real key stays in this parent process. pi-rs and its bash children receive
only a random, per-run loopback capability. Never log request auth headers.
"""
import hashlib
import http.server
import json
import pathlib
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


class Relay:
    def __init__(self, endpoint, model, key, directory, max_requests=100):
        parsed = urllib.parse.urlsplit(endpoint)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('live endpoint must be HTTPS without credentials, query or fragment')
        self.endpoint = endpoint.rstrip('/') + '/chat/completions'
        self.model, self.key = model, key
        self.directory = pathlib.Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.capability = secrets.token_urlsafe(32)
        self.max_requests, self.count = max_requests, 0
        relay = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass

            def do_POST(self):
                if self.path != '/v1/chat/completions' or self.headers.get('Authorization') != 'Bearer ' + relay.capability:
                    self.send_error(403)
                    return
                if relay.count >= relay.max_requests:
                    self.send_error(429, 'experiment request cap reached')
                    return
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16 * 1024 * 1024:
                    self.send_error(413)
                    return
                body = self.rfile.read(length)
                try:
                    request = json.loads(body)
                    if request.get('model') != relay.model:
                        raise ValueError('model changed')
                except (ValueError, TypeError):
                    self.send_error(400)
                    return
                relay.count += 1
                number = relay.count
                start = time.monotonic()
                prefix = relay.directory / ('request-%03d' % number)
                prefix.with_suffix('.json').write_text(json.dumps(request, indent=2) + '\n')
                req = urllib.request.Request(relay.endpoint, data=body, headers={
                    'Authorization': 'Bearer ' + relay.key, 'Content-Type': 'application/json'})
                # No redirects: do not forward credentials to another origin.
                class NoRedirect(urllib.request.HTTPRedirectHandler):
                    def redirect_request(self, *args):
                        return None
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
                try:
                    with opener.open(req, timeout=110) as response:
                        status, data = response.status, response.read()
                except urllib.error.HTTPError as error:
                    status, data = error.code, error.read()
                except Exception as error:
                    status = 502
                    data = json.dumps({'relay_error_type': type(error).__name__}).encode()
                # Defensive redaction before persisting or forwarding any provider response.
                data = data.replace(relay.key.encode(), b'[REDACTED]')
                prefix.with_suffix('.response.json').write_bytes(data)
                try:
                    usage = json.loads(data).get('usage')
                except (ValueError, AttributeError):
                    usage = None
                prefix.with_suffix('.meta.json').write_text(json.dumps({
                    'status': status, 'elapsed_seconds': time.monotonic() - start,
                    'usage': usage, 'request_sha256': hashlib.sha256(body).hexdigest(),
                    'kind': 'live_provider_request'}, indent=2) + '\n')
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                try:
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        self.server = http.server.HTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    @property
    def base_url(self):
        return 'http://127.0.0.1:%d/v1' % self.server.server_port

    def __exit__(self, *args):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=1)

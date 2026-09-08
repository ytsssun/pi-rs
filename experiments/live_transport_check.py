#!/usr/bin/env python3
"""Relay-only self-check: fake upstream, real loopback; ZERO live model calls."""
import json
from pathlib import Path
import tempfile
import urllib.error
import urllib.request
from unittest.mock import patch

from live_transport import Relay


class Response:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def read(self):
        return b'{"choices":[],"echo":"fake-secret-for-test","usage":{"total_tokens":1}}'


class FakeUpstream:
    def open(self, request, timeout):
        assert request.full_url == 'https://example.invalid/v1/chat/completions'
        assert request.get_header('Authorization') == 'Bearer fake-secret-for-test'
        return Response()


def main():
    # Construct the real localhost client before replacing upstream construction.
    local = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with tempfile.TemporaryDirectory(prefix='pi-relay-selfcheck-') as tmp:
        with patch('live_transport.urllib.request.build_opener', return_value=FakeUpstream()):
            with Relay('https://example.invalid/v1', 'model', 'fake-secret-for-test', tmp, max_requests=1) as relay:
                def request():
                    req = urllib.request.Request(
                        relay.base_url + '/chat/completions',
                        data=json.dumps({'model': 'model'}).encode(),
                        headers={'Authorization': 'Bearer ' + relay.capability})
                    return local.open(req, timeout=5).read()

                assert b'fake-secret-for-test' not in request()
                try:
                    request()
                except urllib.error.HTTPError as error:
                    assert error.code == 429
                else:
                    raise AssertionError('request cap not enforced')
        assert 'fake-secret-for-test' not in ''.join(p.read_text() for p in Path(tmp).iterdir())
        meta = json.loads((Path(tmp) / 'request-001.meta.json').read_text())
        assert meta['usage'] == {'total_tokens': 1}
    print(json.dumps({'status': 'passed', 'checks': ['fake response secret redacted', 'usage recorded', 'request cap enforced'], 'live_model_calls': 0}))


if __name__ == '__main__':
    main()

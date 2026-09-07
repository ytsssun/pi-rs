#!/usr/bin/env python3
"""Deterministic coding demo. Real writes/tests; scripted model, no inference."""
import argparse, json, pathlib, subprocess, tempfile
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--edit", action="store_true", help="Use targeted edit instead of full-file write")
options = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parent.parent
runs = ROOT / '.runs'
runs.mkdir(exist_ok=True)
base = pathlib.Path(tempfile.mkdtemp(prefix='coding-', dir=str(runs)))
repo = base / 'repo'
repo.mkdir()
(repo / 'calc.py').write_text('def add(a, b):\n    return a - b\n')
(repo / 'test_calc.py').write_text('from calc import add\nassert add(2, 3) == 5\nprint("addition test passed")\n')
subprocess.run(['git', 'init', '-q', str(repo)], check=True)

def call(i, name, args):
    return {'role': 'assistant', 'content': None, 'tool_calls': [{'id': str(i), 'type': 'function', 'function': {'name': name, 'arguments': json.dumps(args)}}]}

fixed = 'def add(a, b):\n    return a + b\n'
fixture = [
    call(1, 'bash', {'command': 'python3 -B test_calc.py'}),
    call(2, 'read', {'path': 'calc.py'}),
    call(3, 'write', {'path': 'calc.py', 'content': fixed}),
    call(4, 'bash', {'command': 'python3 -B test_calc.py'}),
    {'role': 'assistant', 'content': 'Scripted first turn finished; inspect saved test evidence.'},
    call(6, 'write', {'path': 'calc.py', 'content': fixed + '\ndef multiply(a, b):\n    return a * b\n'}),
    call(7, 'bash', {'command': 'python3 -B test_calc.py && python3 -B -c "from calc import multiply; assert multiply(3,4) == 12; print(\'multiplication test passed\')"'}),
    {'role': 'assistant', 'content': 'Scripted follow-up finished; both real tests passed.'},
]
if options.edit:
    fixture[2] = call(3, 'edit', {'path': 'calc.py', 'edits': [{'oldText': 'return a - b', 'newText': 'return a + b'}]})
    fixture[5] = call(6, 'edit', {'path': 'calc.py', 'edits': [{'oldText': 'return a + b', 'newText': 'return a + b\n\ndef multiply(a, b):\n    return a * b'}]})
fixture_path = base / 'fixture.json'
fixture_path.write_text(json.dumps(fixture, indent=2))
session = base / 'session.json'
cmd = [str(ROOT / 'target/debug/pi-rs'), '--session', str(session), '--fixture', str(fixture_path), '--allow-mutations']
subprocess.run(cmd + ['--workspace', str(repo), '--input', 'Fix addition and run its test'], check=True)
subprocess.run(cmd + ['--resume', '--input', 'Add multiplication and test both operations'], check=True)
history = json.loads(session.read_text())['messages']
results = [m['content'] for m in history if m['role'] == 'tool']
assert 'ERROR:' in results[0] and 'AssertionError' in results[0]
assert 'addition test passed' in results[3]
assert 'multiplication test passed' in results[-1]
assert sum(m['role'] == 'user' for m in history) == 2
print('Verified actual failure -> ' + ('edit' if options.edit else 'write') + ' -> passing test -> process exit -> follow-up -> passing tests.')
print('Model: scripted fixture; no real inference.')
print('Artifacts retained:', base)
print('Session:', session)

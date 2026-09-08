#!/usr/bin/env python3
"""Independent, deterministic acceptance for live runs. Never calls a model."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

INITIAL = '''def total(items):
    """Sum integer prices times positive integer quantities; empty input is zero."""
    return sum(price + quantity for price, quantity in items)
'''
FIXED = INITIAL.replace('price + quantity', 'price * quantity')
FEATURE = '''
def discount(amount, percent):
    """Integer percentage discount rounded down; percent must be in [0, 100]."""
    if not 0 <= percent <= 100:
        raise ValueError("percent out of range")
    return amount * (100 - percent) // 100
'''
FOLLOWUP = '''
def invoice(items, percent):
    return discount(total(items), percent)
'''
VISIBLE = '''from billing import total
assert total([]) == 0
assert total([(7, 3)]) == 21
assert total([(7, 3), (2, 4)]) == 29
print("visible tests passed")
'''
PROMPTS = {
    'bug': ['Fix billing.total: each pair is (integer price, positive integer quantity); return the sum of price times quantity, and zero for empty input. Run the existing tests. Preserve existing tests and edit only billing.py; do not create other files.'],
    'behavior': ['Add billing.discount(amount, percent), for nonnegative integer amount and integer percent. Return amount * (100 - percent) // 100 (integer floor division). Percent outside 0 through 100 inclusive must raise ValueError. Preserve total. Run tests including your new behavior. Preserve existing tests and edit only billing.py; do not create other files.'],
    'resume': ['Fix billing.total: each pair is (integer price, positive integer quantity); return the sum of price times quantity, and zero for empty input. Also add billing.discount(amount, percent): return amount * (100 - percent) // 100 for nonnegative integer amounts; percent outside 0 through 100 must raise ValueError. Run tests. Preserve existing tests and edit only billing.py; do not create other files.',
               'Continue the previous billing task. Add invoice(items, percent) that applies our existing discount rule to the total of the line items. Preserve the previous functionality and run tests for all three functions. Preserve existing tests and edit only billing.py; do not create other files.'],
}
CHECKER = '''import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("candidate", sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
checks = 0
def equal(actual, expected):
    global checks
    assert actual == expected, (actual, expected)
    checks += 1
for items in [[], [(0, 3)], [(7, 3)], [(11, 2), (3, 7)], [(-4, 2), (5, 1)]]:
    equal(m.total(items), sum(p*q for p,q in items))
if sys.argv[2] != "bug":
    for amount in [0, 1, 7, 101, 1234567]:
        for percent in [0, 1, 17, 50, 99, 100]:
            equal(m.discount(amount, percent), amount * (100-percent)//100)
    for percent in [-100, -1, 101, 500]:
        try: m.discount(100, percent)
        except ValueError: checks += 1
        else: raise AssertionError("invalid percent accepted")
if sys.argv[2] == "resume" and sys.argv[3] == "2":
    for items in [[], [(7,3)], [(11,2),(3,7)]]:
        for percent in [0,17,100]:
            equal(m.invoice(items,percent), sum(p*q for p,q in items)*(100-percent)//100)
if sys.argv[4] == "long":
    equal(m.AUDIT_MARKER, "checked-700")
print(json.dumps({"checks": checks}))
'''

def digest(data):
    return hashlib.sha256(data).hexdigest()

def setup(base, scenario, repetition=1, long_output=False):
    """base is coordinator-owned; give agent only base/workspace as workspace."""
    base = Path(base).resolve()
    base.mkdir(parents=True, exist_ok=False)
    workspace = base / 'workspace'
    workspace.mkdir()
    (workspace / 'billing.py').write_text(INITIAL if scenario != 'behavior' else FIXED)
    (workspace / 'test_billing.py').write_text(VISIBLE)
    prompts = list(PROMPTS[scenario])
    if long_output:
        (workspace / 'diagnostics.txt').write_text(''.join(f'{i:04}: routine billing diagnostic sample with repeated informational output\n' for i in range(1, 701)) + 'FINAL REQUIREMENT: add AUDIT_MARKER = "checked-700" to billing.py.\n')
        prompts[0] = 'First run `cat diagnostics.txt` using bash and inspect its output; the final line adds one requirement. ' + prompts[0]
    manifest = {'version': 1, 'scenario': scenario, 'repetition': repetition, 'long_output': long_output,
                'prompts': prompts, 'initial_files': {p.name: digest(p.read_bytes()) for p in workspace.iterdir()},
                'allowed_changes': ['billing.py'], 'model_access': 'not performed by this harness'}
    (base / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    subprocess.run(['git', 'init', '-q', str(workspace)], check=True)
    subprocess.run(['git', '-C', str(workspace), 'add', '.'], check=True)
    subprocess.run(['git', '-C', str(workspace), '-c', 'user.name=Acceptance Harness', '-c', 'user.email=acceptance@invalid', 'commit', '-qm', 'Frozen task input'], check=True)
    manifest['input_commit'] = subprocess.check_output(['git', '-C', str(workspace), 'rev-parse', 'HEAD'], text=True).strip()
    (base / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest

def evaluate(base, stage=1):
    base = Path(base).resolve()
    manifest = json.loads((base / 'manifest.json').read_text())
    workspace = base / 'workspace'
    errors = []
    for name, expected in manifest['initial_files'].items():
        p = workspace / name
        if name not in manifest['allowed_changes'] and (not p.is_file() or p.is_symlink() or digest(p.read_bytes()) != expected):
            errors.append('protected input changed: ' + name)
    extras = [str(p.relative_to(workspace)) for p in workspace.rglob('*') if '.git' not in p.relative_to(workspace).parts and '__pycache__' not in p.relative_to(workspace).parts and p.is_file() and str(p.relative_to(workspace)) not in manifest['initial_files']]
    if extras:
        errors.append('unexpected files: ' + repr(extras))
    source = workspace / 'billing.py'
    if not source.is_file() or source.is_symlink():
        errors.append('billing.py missing or symbolic link')
    result = {'scenario': manifest['scenario'], 'stage': stage, 'integrity_errors': errors, 'acceptance_exit': None}
    if not errors:
        with tempfile.TemporaryDirectory(prefix='pi-rs-external-acceptance-') as tmp:
            candidate = Path(tmp) / 'candidate.py'
            shutil.copyfile(source, candidate)
            checker = Path(tmp) / 'check.py'
            checker.write_text(CHECKER)
            try:
                proc = subprocess.run([sys.executable, '-I', '-B', str(checker), str(candidate), manifest['scenario'], str(stage), 'long' if manifest['long_output'] else 'plain'], cwd=tmp, env={'PATH': os.defpath}, capture_output=True, text=True, timeout=10)
                result.update(acceptance_exit=proc.returncode, stdout=proc.stdout, stderr=proc.stderr)
            except subprocess.TimeoutExpired:
                result.update(acceptance_exit=124, stderr='external acceptance timed out')
    expected_checks = 5 if manifest['scenario'] == 'bug' else 39
    if manifest['scenario'] == 'resume' and stage == 2:
        expected_checks += 9
    if manifest['long_output']:
        expected_checks += 1
    result['expected_checks'] = expected_checks
    try:
        result['assertions_completed'] = json.loads(result.get('stdout', '')) == {'checks': expected_checks}
    except (ValueError, TypeError):
        result['assertions_completed'] = False
    result['passed'] = not errors and result['acceptance_exit'] == 0 and result['assertions_completed']
    return result

def self_check():
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for scenario in PROMPTS:
            base = Path(tmp) / scenario
            setup(base, scenario)
            assert not evaluate(base)['passed']
            (base / 'workspace/billing.py').write_text(FIXED + (FEATURE if scenario != 'bug' else ''))
            assert evaluate(base)['passed']
            if scenario == 'resume':
                assert not evaluate(base, 2)['passed']
                (base / 'workspace/billing.py').write_text(FIXED + FEATURE + FOLLOWUP)
                assert evaluate(base, 2)['passed']
            (base / 'workspace/test_billing.py').write_text('print("fake pass")\n')
            assert not evaluate(base)['passed']
            results.append(scenario)
        base = Path(tmp) / 'long'
        setup(base, 'bug', long_output=True)
        (base / 'workspace/billing.py').write_text(FIXED + '\n# AUDIT_MARKER = \"checked-700\"\n')
        assert not evaluate(base)['passed']
        (base / 'workspace/billing.py').write_text(FIXED + '\nAUDIT_MARKER = \"checked-700\"\n')
        assert evaluate(base)['passed']
        (base / 'workspace/billing.py').write_text('import os; os._exit(0)\n')
        assert not evaluate(base)['passed']
    return {'self_check': 'passed', 'scenarios': results, 'live_model_calls': 0}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    init = sub.add_parser('setup')
    init.add_argument('base')
    init.add_argument('scenario', choices=PROMPTS)
    init.add_argument('--repetition', type=int, choices=[1,2,3], default=1)
    init.add_argument('--long-output', action='store_true')
    verify = sub.add_parser('evaluate')
    verify.add_argument('base')
    verify.add_argument('--stage', type=int, choices=[1,2], default=1)
    sub.add_parser('self-check')
    args = parser.parse_args()
    if args.command == 'setup':
        output = setup(args.base, args.scenario, args.repetition, args.long_output)
    elif args.command == 'evaluate':
        output = evaluate(args.base, args.stage)
    else:
        output = self_check()
    print(json.dumps(output, indent=2))
    if output.get('passed') is False:
        sys.exit(1)

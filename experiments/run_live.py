#!/usr/bin/env python3
"""Bounded live pilot/matrix/context runner. Raw artifacts remain in ignored .runs.

Does not load Codex login tokens, alter desktop auth, or fall back to fixtures.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import shlex
import subprocess
import sys
import time

from live_acceptance import setup, evaluate
from live_transport import Relay

ROOT = Path(__file__).resolve().parent.parent
START = 'ef2b8e6a11bb54f5600e30880f19c05d5ce229ad'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--phase', choices=['pilot', 'baseline', 'context'], required=True)
    p.add_argument('--output', type=Path, required=True, help='new artifact directory under .runs')
    p.add_argument('--model', required=True)
    p.add_argument('--reasoning-effort', choices=['none', 'low', 'medium', 'high', 'xhigh', 'max'])
    p.add_argument('--endpoint', default='https://api.openai.com/v1')
    p.add_argument('--key-file', type=Path, help='plaintext API key file; otherwise OPENAI_API_KEY')
    p.add_argument('--env-file', type=Path, help='read only OPENAI_API_KEY from dotenv; never execute shell content')
    p.add_argument('--gate', type=Path, help='previous successful summary.json')
    a = p.parse_args()
    os.umask(0o077)
    binary = ROOT / 'target/debug/pi-rs'
    output = a.output.resolve()
    if ROOT / '.runs' not in output.parents:
        p.error('output must be a new directory below project .runs')
    if output.exists():
        p.error('output already exists; preserve previous attempts')
    if not binary.is_file():
        p.error('build first: cargo build --locked')
    # Resolve credentials before producing task state. No login-token fallback.
    if a.key_file and a.env_file:
        p.error('choose --key-file or --env-file')
    key = a.key_file.read_text().strip() if a.key_file else os.environ.get('OPENAI_API_KEY', '')
    if a.env_file:
        matches = []
        for line in a.env_file.read_text().splitlines():
            name, sep, value = line.partition('=')
            if sep and name.strip() in ('OPENAI_API_KEY', 'export OPENAI_API_KEY'):
                parts = shlex.split(value, comments=True)
                if len(parts) != 1:
                    p.error('invalid OPENAI_API_KEY dotenv value')
                matches.append(parts[0])
        if len(matches) != 1:
            p.error('dotenv must contain exactly one OPENAI_API_KEY')
        key = matches[0]
    if not key:
        p.error('live access blocked: provide --key-file or OPENAI_API_KEY; no run attempted')
    config = {'model': a.model, 'reasoning_effort': a.reasoning_effort, 'endpoint': a.endpoint.rstrip('/'), 'binary_sha256': sha(binary),
              'acceptance_sha256': sha(ROOT / 'experiments/live_acceptance.py'),
              'max_rounds': 16, 'process_timeout_seconds': 600}
    if a.phase != 'pilot':
        if not a.gate:
            p.error('baseline requires passed pilot; context requires passed 9-run baseline')
        gate = json.loads(a.gate.read_text())
        expected = 'pilot' if a.phase == 'baseline' else 'baseline'
        expected_count = 1 if expected == 'pilot' else 9
        review = gate.get('independent_review', {})
        if review.get('status') != 'passed' or not review.get('reviewer') or not review.get('evidence'):
            p.error('gate requires independent trace review of actual test execution; automated checks alone are insufficient')
        if gate.get('phase') != expected or gate.get('config') != config or len(gate.get('runs', [])) != expected_count or not all(r['automated_passed'] for r in gate['runs']):
            p.error('gate did not pass with identical binary, acceptance and provider config')
    output.mkdir(parents=True)
    dirty = subprocess.check_output(['git', 'diff', 'HEAD', '--binary'], cwd=ROOT)
    (output / 'runtime-working.diff').write_bytes(dirty)
    summary = {'starting_commit': START,
               'runtime_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
               'config': config, 'phase': a.phase, 'kind': 'live', 'runs': [],
               'human_interventions': [], 'independent_review': {'status': 'pending'}, 'raw_artifacts_publication': 'local only; review before committing',
               'limits': 'host permissions, not sandboxed; usage absent from provider response is unknown'}
    save(output / 'summary.json', summary)
    tasks = [('bug', 1)] if a.phase == 'pilot' else ([(s, n) for s in ['bug', 'behavior', 'resume'] for n in range(1, 4)] if a.phase == 'baseline' else [('resume', 1)])
    consecutive_failures = 0
    for scenario, repetition in tasks:
        if (output / 'STOP').exists():
            summary['stopped_reason'] = 'independent verifier requested stop; preserve completed and unrun cases'
            save(output / 'summary.json', summary)
            break
        stages = []
        base = output / ('%s-%d' % (scenario, repetition))
        try:
            base = output / ('%s-%d' % (scenario, repetition))
            manifest = setup(base, scenario, repetition, long_output=a.phase == 'context')
            manifest_hash = sha(base / 'manifest.json')
            home = base / 'home'
            home.mkdir()
            tmp = base / 'tmp'
            tmp.mkdir()
            session = base / 'session.json'
            stages = []
            old = None
            with Relay(a.endpoint, a.model, key, base / 'transport', max_requests=32) as relay:
                env = {'PATH': '/usr/bin:/bin:/usr/sbin:/sbin', 'HOME': str(home), 'TMPDIR': str(tmp),
                       'LANG': 'C.UTF-8', 'PYTHONDONTWRITEBYTECODE': '1',
                       'OPENAI_API_KEY': relay.capability, 'OPENAI_BASE_URL': relay.base_url}
                for stage, prompt in enumerate(manifest['prompts'], 1):
                    start_request = relay.count
                    trim = '1024' if a.phase == 'context' and stage == 2 else 'none'
                    cmd = [str(binary), '--workspace', str(base / 'workspace'), '--session', str(session),
                           '--model', a.model, '--allow-mutations', '--max-rounds', '16',
                           '--context-tool-chars', trim, '--input', prompt]
                    if a.reasoning_effort is not None:
                        cmd += ['--reasoning-effort', a.reasoning_effort]
                    if stage > 1:
                        cmd.append('--resume')
                    save(base / ('stage-%d.started.json' % stage), {'request': prompt, 'command': cmd, 'status': 'started'})
                    start = time.monotonic()
                    proc = subprocess.Popen(cmd, env=env, cwd=base / 'workspace', stdout=subprocess.PIPE,
                                            stderr=subprocess.PIPE, text=True, start_new_session=True)
                    timed_out = False
                    try:
                        stdout, stderr = proc.communicate(timeout=600)
                    except subprocess.TimeoutExpired:
                        timed_out = True
                        os.killpg(proc.pid, signal.SIGKILL)
                        stdout, stderr = proc.communicate()
                    for name, data in [('stdout', stdout), ('stderr', stderr)]:
                        (base / ('stage-%d.%s' % (stage, name))).write_text(data.replace(key, '[REDACTED]').replace(relay.capability, '[LOCAL_CAPABILITY]'))
                    current = json.loads(session.read_text()) if session.exists() else None
                    if current:
                        save(base / ('stage-%d.session.json' % stage), current)
                    acceptance = evaluate(base, stage)
                    messages = current['messages'] if current else []
                    new_messages = messages[len(old['messages']):] if old else messages
                    bash_calls = [c['function']['arguments'] for m in new_messages for c in m.get('tool_calls', []) if c['function']['name'] == 'bash']
                    # Bash presence is only evidence of execution. Human review of traces must
                    # still establish that test commands were run; never infer from prose.
                    checks = {'process_ok': proc.returncode == 0 and not timed_out,
                              'external_acceptance': acceptance['passed'],
                              'manifest_unchanged': sha(base / 'manifest.json') == manifest_hash,
                              'bash_used': bool(bash_calls),
                              'canonical_prefix_preserved': old is None or messages[:len(old['messages'])] == old['messages'],
                              'context_policy': current is not None and current['context_tool_chars'] == (1024 if trim == '1024' else None),
                              'real_provider_request': relay.count > start_request}
                    if a.phase == 'context' and stage == 2:
                        long_tools = [m for m in old['messages'] if m['role'] == 'tool' and len(m['content']) > 1024]
                        request = json.loads((base / 'transport' / ('request-%03d.json' % (start_request + 1))).read_text()) if relay.count > start_request else {}
                        checks['long_canonical_tool_result'] = bool(long_tools)
                        checks['projected_tool_result'] = bool(long_tools) and all(any(m.get('tool_call_id') == t['tool_call_id'] and m.get('content') == t['content'][:1024] + '\n[context view truncated; canonical result retained]' for m in request.get('messages', [])) for t in long_tools)
                        checks['policy_change_recorded'] = bool(current and current['context_policy_changes'] == old['context_policy_changes'] + [{'after_messages': len(old['messages']) + 1, 'previous_tool_chars': None, 'tool_chars': 1024}])
                    result = {'stage': stage, 'pid': proc.pid, 'request': prompt, 'command': cmd,
                              'exit_status': proc.returncode, 'timed_out': timed_out,
                              'elapsed_seconds': time.monotonic() - start, 'checks': checks,
                              'automated_passed': all(checks.values()), 'acceptance': acceptance,
                              'bash_calls': bash_calls, 'usage_cumulative': current.get('usage') if current else None,
                              'usage_this_stage': current.get('usage', [])[len(old.get('usage', [])) if old else 0:] if current else None,
                              'human_interventions': [], 'test_command_review': 'pending independent trace review'}
                    stages.append(result)
                    save(base / ('stage-%d.result.json' % stage), result)
                    (base / ('stage-%d.diff' % stage)).write_bytes(subprocess.check_output(['git', 'diff', '--binary', manifest['input_commit']], cwd=base / 'workspace'))
                    if not result['automated_passed']:
                        break
                    old = current
            run = {'scenario': scenario, 'repetition': repetition, 'artifact': str(base),
                   'automated_passed': len(stages) == len(manifest['prompts']) and all(s['automated_passed'] for s in stages),
                   'stages': stages, 'failure_attribution': None if all(s['automated_passed'] for s in stages) else 'unclassified; inspect retained evidence before retry'}
        except Exception as error:
            run = {'scenario': scenario, 'repetition': repetition, 'artifact': str(base),
                   'automated_passed': False, 'stages': stages, 'failure_attribution': 'environment or harness; inspect artifacts',
                   'exception_type': type(error).__name__}
        summary['runs'].append(run)
        save(output / 'summary.json', summary)
        print(json.dumps({'scenario': scenario, 'repetition': repetition, 'automated_passed': run['automated_passed']}), flush=True)
        consecutive_failures = 0 if run['automated_passed'] else consecutive_failures + 1
        if consecutive_failures >= 2 or run.get('exception_type') or any(s.get('timed_out') for s in stages):
            summary['stopped_reason'] = 'inspect retained failure evidence and possible surviving tools before more attempts'
            save(output / 'summary.json', summary)
            break
    print('Raw live artifacts: ' + str(output))
    return 0 if len(summary['runs']) == len(tasks) and all(r['automated_passed'] for r in summary['runs']) else 1


if __name__ == '__main__':
    sys.exit(main())

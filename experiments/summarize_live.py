#!/usr/bin/env python3
"""Export reviewed live-run accounting without publishing raw sessions or secrets.

No model calls. Usage is summed from actual response records, never cumulative
session vectors. Missing usage remains explicitly unknown. No invoice estimate.
"""
import argparse
import hashlib
import json
from pathlib import Path


def summarize(base):
    base = Path(base)
    summary = json.loads((base / 'summary.json').read_text())
    requests = sorted(p for p in base.glob('*/transport/request-*.json')
                      if not p.name.endswith(('.meta.json', '.response.json')))
    meta_paths = sorted(base.glob('*/transport/*.meta.json'))
    metas = [json.loads(p.read_text()) for p in meta_paths]
    usages = [m['usage'] for m in metas if isinstance(m.get('usage'), dict)]
    hashes = []
    for p in sorted(base.rglob('*')):
        if p.is_file() and p.suffix in ('.json', '.diff') and 'workspace' not in p.relative_to(base).parts:
            hashes.append({'path': str(p.relative_to(base)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
    return {
        'artifact': '.runs/' + base.name,
        'runtime_commit': summary['runtime_commit'], 'config': summary['config'],
        'phase': summary['phase'], 'independent_review': summary['independent_review'],
        'requests_recorded': len(requests), 'responses_recorded': len(metas),
        'responses_without_usage': sum(not isinstance(m.get('usage'), dict) for m in metas),
        'requests_without_response_metadata': max(0, len(requests) - len(metas)),
        'http_statuses': {str(code): sum(m['status'] == code for m in metas) for code in sorted({m['status'] for m in metas})},
        'reported_prompt_tokens': sum(u.get('prompt_tokens', 0) for u in usages),
        'reported_cached_tokens': sum(u.get('prompt_tokens_details', {}).get('cached_tokens', 0) for u in usages),
        'reported_completion_tokens': sum(u.get('completion_tokens', 0) for u in usages),
        'usage_note': 'Only recorded response usage; missing usage is unknown, not zero. No cost/latency advantage claim.',
        'stopped_reason': summary.get('stopped_reason'),
        'runs': [{
            'scenario': r['scenario'], 'repetition': r['repetition'],
            'automated_passed': r['automated_passed'],
            'stages': [{k: s.get(k) for k in ('stage', 'pid', 'exit_status', 'elapsed_seconds', 'checks', 'human_interventions')}
                       for s in r.get('stages', [])],
        } for r in summary['runs']],
        'artifact_hashes': hashes,
        'caution': 'Automated flags are not independent task success. See reviewer verdicts, including omitted/failed tests.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directories', nargs='+', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps({'groups': [summarize(p) for p in args.directories]}, indent=2) + '\n')

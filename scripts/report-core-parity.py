#!/usr/bin/env python3
"""Regenerate the selected inventory report; --check detects stale output."""
import collections
import json
from pathlib import Path
import sys
root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'docs/core-parity-matrix.json').read_text())
rows = data['rows']
assert len(rows) == 37 and len({r['id'] for r in rows}) == 37
allowed = {'verified-in-defined-scope', 'partial', 'missing', 'unknown'}
assert all(r['status'] in allowed for r in rows)
for row in rows:
    assert (root / row['native']).is_file(), row['native']
    assert all((root / p).is_file() for p in row['evidence']), row['id']
    assert row['upstream']['member'] and row['limitation']
counts = collections.Counter(r['status'] for r in rows)
assert sum(counts.values()) == len(rows)
lines = ['# Selected Pi core capability inventory', '', data['scope'], '', data['method'], '',
         f"Reference: `{data['reference']}`", '',
         'Counts: ' + ', '.join(f'{status}: {counts[status]}' for status in sorted(allowed)) + f'; total: {len(rows)}.', '',
         '**These are evidence-review counts, not compatibility percentages or new passing test results.**', '',
         'Reproduce the report with `python3 scripts/report-core-parity.py`; validate with `python3 scripts/report-core-parity.py --check`.', '',
         '| ID / capability | Upstream source and member | Native / evidence | Status / remaining requirement |',
         '|---|---|---|---|']
commit = data['reference'].split('@ ')[1]
for r in rows:
    u = r['upstream']
    upstream = f"[{u['file']}](https://github.com/badlogic/pi-mono/blob/{commit}/{u['file']}) `{u['member']}`"
    refs = '; '.join(f'[{p}](../{p})' for p in [r['native'], *r['evidence']])
    lines.append(f"| {r['id']} {r['capability']} | {upstream} | {refs} | {r['status']} ({r['priority']}): {r['limitation']} |")
lines += ['', '## Prioritization and limits', '',
          'P1 groups are candidate core substitution blockers: full session/event context for unchanged plugins, resource discovery, and session operations. This priority is a source-backed hypothesis, not measured ecosystem impact. Select representative unchanged extensions and execute them through the formal CLI to rank actual failures before implementation.', '',
          'The former matrix overstated read/withSession completeness and incorrectly labeled parallel execution absent. Corrected to partial: read has explicit exclusions; replacement context rejects user/trigger scheduling; native parallel batching and termination exist. Auth/UI/resources are unknown where this audit cannot establish implementation absence. No runtime tests were rerun for this report.']
text = '\n'.join(lines) + '\n'
out = root / 'docs/core-parity-matrix.md'
if '--check' in sys.argv:
    assert out.read_text() == text, 'stale report; regenerate'
else:
    out.write_text(text)
print(json.dumps({'selectedRequirements': len(rows), 'counts': {k: counts[k] for k in sorted(allowed)}, 'completeDenominator': False}))

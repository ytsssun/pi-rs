#!/usr/bin/env python3
"""Run the real read oracle in a fresh path; catch process crashes and wrong results.
Requires built Rust binary and pinned vendor/pi-mono. No live inference.
"""
import json, pathlib, shutil, subprocess, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='pi-read-loader-') as tmp:
    fresh = pathlib.Path(tmp)
    (fresh/'experiments').mkdir()
    for name in ('read-differential.mjs', 'read-cases.json'):
        shutil.copy2(root/'experiments'/name, fresh/'experiments'/name)
    (fresh/'vendor').mkdir()
    subprocess.run(['git', 'clone', '--quiet', '--shared', '--no-hardlinks', str(root/'vendor/pi-mono'), str(fresh/'vendor/pi-mono')], check=True, capture_output=True)
    (fresh/'target').symlink_to(root/'target', target_is_directory=True)
    result = subprocess.run(['node', '--experimental-vm-modules', 'experiments/read-differential.mjs'], cwd=fresh, capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f'Oracle process failed: {result.returncode}\n{result.stderr}'
    report = json.loads(result.stdout)
    assert len(report['results']) == 19 and all(c['passed'] for c in report['results'])
    assert len(report['exclusions']) == 3 and all(c['rustRejected'] for c in report['exclusions'])
    print('Fresh-path loader: 19 exact comparisons and 3 explicit exclusions passed.')

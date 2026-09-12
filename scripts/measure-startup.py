#!/usr/bin/env python3
"""Measure prebuilt pi-rs --help process latency, never compilation/inference."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
import tempfile
import time


def measure(binary, samples, warmups):
    binary = Path(binary).resolve(strict=True)
    if not binary.is_file() or not os.access(binary, os.X_OK):
        raise ValueError('binary must be an executable file')
    timings = []
    with tempfile.TemporaryDirectory(prefix='pi-startup-') as directory:
        for index in range(warmups + samples):
            start = time.perf_counter_ns()
            child = subprocess.run([str(binary), '--help'], cwd=directory,
                                   capture_output=True, timeout=30)
            elapsed = (time.perf_counter_ns() - start) / 1_000_000
            if child.returncode != 0 or b'--session' not in child.stdout or b'--workspace' not in child.stdout:
                raise RuntimeError('pi-rs help acceptance failed: exit=' + str(child.returncode))
            if index >= warmups:
                timings.append(elapsed)
    return {'schema_version': 1, 'status': 'measured',
            'metric': 'prebuilt_cli_help_process_wall_ms',
            'binary': str(binary), 'binary_sha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
            'platform': platform.platform(), 'python': platform.python_version(),
            'node': subprocess.check_output(['node', '--version'], text=True).strip(),
            'samples': samples, 'warmups': warmups, 'samples_ms': timings,
            'median_ms': statistics.median(timings), 'min_ms': min(timings), 'max_ms': max(timings),
            'scope': 'fresh processes, warm filesystem cache; includes launcher and Node help path',
            'excludes': ['compilation', 'full runtime initialization', 'model calls', 'tool execution', 'RSS', 'upstream comparison']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', required=True)
    parser.add_argument('--samples', type=int, default=10)
    parser.add_argument('--warmups', type=int, default=2)
    parser.add_argument('--json-out', type=Path)
    args = parser.parse_args()
    if args.samples < 1 or args.warmups < 0:
        parser.error('samples must be positive; warmups must be nonnegative')
    try:
        result = measure(args.binary, args.samples, args.warmups)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(json.dumps({'schema_version': 1, 'status': 'failed', 'error': str(error)}))
        return 1
    output = json.dumps(result, indent=2) + '\n'
    if args.json_out:
        args.json_out.write_text(output)
    print(output, end='')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

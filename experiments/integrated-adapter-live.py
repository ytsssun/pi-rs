#!/usr/bin/env python3
"""Compatibility wrapper: use integrated-live.py --engine rust-core directly."""
import pathlib, runpy, sys
if '--engine' in sys.argv:
    index=sys.argv.index('--engine')
    if sys.argv[index+1] != 'rust-core':
        raise SystemExit('Use --engine rust-core; upstream must mean the unchanged upstream Agent.')
else:
    sys.argv.extend(['--engine','rust-core'])
runpy.run_path(str(pathlib.Path(__file__).with_name('integrated-live.py')),run_name='__main__')

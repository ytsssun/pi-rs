#!/usr/bin/env python3
"""Bad local fixture inputs must not mutate durable session state."""
import json, pathlib, subprocess, tempfile
root = pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='pi-fixture-preflight-') as tmp:
    wd=pathlib.Path(tmp); session=wd/'session.json'; good=wd/'good.json'; bad=wd/'bad.json'
    good.write_text('[{"role":"assistant","content":"done"}]');bad.write_text('{')
    def cli(*args):
        return subprocess.run([str(root/'target/debug/pi-rs-legacy'),'--session',str(session),*map(str,args)],capture_output=True,text=True,timeout=10)
    first=cli('--input','start','--workspace',wd,'--fixture',good)
    assert first.returncode==0,first.stderr
    original=session.read_bytes()
    for f in [bad,wd/'missing.json']:
        result=cli('--resume','--input','followup','--fixture',f)
        assert result.returncode!=0
        assert session.read_bytes()==original,'bad fixture appended a user turn before validation'
    session.unlink()
    result=cli('--input','start','--workspace',wd,'--fixture',bad)
    assert result.returncode!=0 and not session.exists(),'bad fixture created a new session'
    print('PASS: malformed/missing fixture leaves completed session unchanged; malformed fixture creates no session.')

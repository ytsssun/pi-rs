#!/usr/bin/env python3
"""External deterministic acceptance of the formal Cargo launcher and Rust/JS runtime."""
import argparse, json, pathlib, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--binary', type=pathlib.Path, default=ROOT / 'target/debug/pi-rs')
BIN = parser.parse_args().binary.expanduser().resolve()
def assistant(content, stop='stop'):
    return dict(role='assistant',content=content,api='openai-completions',provider='fixture',model='fixture',stopReason=stop,timestamp=1,usage=dict(input=0,output=0,cacheRead=0,cacheWrite=0,totalTokens=0,cost=dict(input=0,output=0,cacheRead=0,cacheWrite=0,total=0)))
def call(name, args):
    return assistant([dict(type='toolCall',id='call-1',name=name,arguments=args)], 'toolUse')
with tempfile.TemporaryDirectory(prefix='pi-rs-formal-') as temp:
    base=pathlib.Path(temp); workspace=base/'repo'; workspace.mkdir(); session=base/'session.jsonl'
    def run(messages, resume=False, extension=False):
        fixture=base/'fixture.json'; fixture.write_text(json.dumps(messages))
        args=[str(BIN),'--workspace',str(workspace),'--session',str(session),'--input','Perform requested operation','--fixture',str(fixture)]
        if resume: args+=['--resume']
        if extension: args+=['--extension',str(ROOT/'vendor/pi-mono/packages/coding-agent/examples/extensions/protected-paths.ts')]
        result=subprocess.run(args,cwd=base,text=True,capture_output=True,timeout=30)
        assert result.returncode==0, result.stderr
        report=json.loads(result.stdout)
        usage=[e for e in report['result']['trace'] if e['type']=='context_usage']
        assert usage and all(e['estimator']=='pinned-pi' and e['tokens']==e['usageTokens']+e['trailingTokens'] and e['serializedBytes']>0 for e in usage)
        return report
    done=assistant([dict(type='text',text='done')])
    run([call('write',dict(path='target.txt',content='FIRST')),done])
    assert (workspace/'target.txt').read_bytes()==b'FIRST'
    prefix=session.read_bytes()
    run([call('edit',dict(path='target.txt',edits=[dict(oldText='FIRST',newText='SECOND')])),done],resume=True)
    assert (workspace/'target.txt').read_bytes()==b'SECOND'
    assert session.read_bytes().startswith(prefix), 'resume changed canonical prefix'
    report=run([call('write',dict(path='.env',content='BLOCK_ME')),done],resume=True,extension=True)
    assert not (workspace/'.env').exists()
    entries=[json.loads(line) for line in session.read_text().splitlines()]
    results=[e.get('message',{}) for e in entries if e.get('message',{}).get('role')=='toolResult']
    assert results[-1]['isError'] is True
    assert 'protected' in results[-1]['content'][0]['text']
    print(json.dumps(dict(passed=True,scope='fixture only',checks=['formal executable outside checkout cwd','original write','fresh-process original edit','canonical prefix retained','unchanged extension rejects correlated write'])))

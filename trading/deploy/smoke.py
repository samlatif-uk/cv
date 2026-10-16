"""Run on the VPS as root. Never print the generated credential or session."""
import json
from pathlib import Path
import time
import urllib.request

base='http://127.0.0.1:4181/trading/api/'
password=next(line.removeprefix('Password: ') for line in Path('/root/sam-trading-login.txt').read_text().splitlines() if line.startswith('Password: '))
request=urllib.request.Request(base+'login',data=json.dumps({'password':password}).encode(),headers={'Content-Type':'application/json'})
with urllib.request.urlopen(request,timeout=5) as response:
    cookie=response.headers['Set-Cookie'].split(';')[0]
csrf=''
try:
    for attempt in range(10):
        with urllib.request.urlopen(urllib.request.Request(base+'state',headers={'Cookie':cookie}),timeout=5) as response:
            state=json.load(response)
        csrf=state['csrf']
        assert state['mode']=='paper' and not state['state']['running']
        auto=state['state'].get('autopilot',{})
        if state['fresh'] and (not auto.get('enabled') or auto.get('report')): break
        if attempt==9: raise RuntimeError('Market data did not become fresh; bot remains paused')
        time.sleep(5)
    req=urllib.request.Request(base+'backtest',data=b'{}',headers={'Cookie':cookie,'Content-Type':'application/json','X-CSRF-Token':csrf})
    with urllib.request.urlopen(req,timeout=10) as response: result=json.load(response)
    assert 'return_pct' in result
    auto=state['state']['autopilot']
    if auto['enabled']:
        assert auto['report']['selected']['kind'] in ('cash','sma','breakout','rsi')
        assert state['state']['config']['interval']==60
    with urllib.request.urlopen(urllib.request.Request(base+'intelligence',headers={'Cookie':cookie}),timeout=5) as response:
        intelligence=json.load(response)
    assert isinstance(intelligence['questions'],list)
    print('Verified: authenticated dashboard, fresh Kraken data, paper-only paused state, automatic research report, backtest, intelligence workspace.')
    if auto['enabled']: print('Automatic research decision: '+auto['report']['reason'])
finally:
    if csrf:
        req=urllib.request.Request(base+'logout',data=b'{}',headers={'Cookie':cookie,'Content-Type':'application/json','X-CSRF-Token':csrf})
        with urllib.request.urlopen(req,timeout=5) as response: response.read()


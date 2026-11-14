"""Persistent, isolated forward trials. Only a newly observed live quote can fill."""
import json
import sqlite3
import time
import engine
from autopilot import CANDIDATES, CADENCE

PAIRS=('XBTUSD','ETHUSD','SOLUSD')

def setup(db):
    with db:
        db.execute('CREATE TABLE IF NOT EXISTS shadow_accounts(pair TEXT, name TEXT, data TEXT NOT NULL, PRIMARY KEY(pair,name))')
        db.execute('CREATE TABLE IF NOT EXISTS shadow_fills(id INTEGER PRIMARY KEY, pair TEXT, name TEXT, data TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS shadow_feed(pair TEXT PRIMARY KEY, checked REAL, error TEXT)')

def observe(db,pair,bars,price,now):
    if not bars or not 3600-60 <= now-bars[-1][0] <= 7200+60:
        raise ValueError('No recent closed hourly candle')
    with db:
        for method in CANDIDATES:
            key=(pair,method['name'])
            row=db.execute('SELECT data FROM shadow_accounts WHERE pair=? AND name=?',key).fetchone()
            if row:
                s=json.loads(row[0])
                if int(s['updated']//CADENCE)>=int(now//CADENCE): continue
            else:
                s=engine.initial()
                s['config'].update(pair=pair,interval=60,fast=12,slow=96)
                s.update(method=method,running=True,started=now,closed=0,peak=10000.,drawdown=0.)
            engine.step(s,bars,price,now)
            for trade in s['trades']:
                db.execute('INSERT INTO shadow_fills(pair,name,data) VALUES(?,?,?)',(*key,json.dumps(trade)))
                s['closed']+=int(trade['side']=='sell')
            value=engine.equity(s)
            s['peak']=max(s['peak'],value)
            s['drawdown']=max(s['drawdown'],100*(1-value/s['peak']))
            s.update(trades=[],events=[],equity=[])
            db.execute('INSERT OR REPLACE INTO shadow_accounts VALUES(?,?,?)',(*key,json.dumps(s)))
        db.execute('INSERT OR REPLACE INTO shadow_feed VALUES(?,?,?)',(pair,now,''))

def summary(db):
    rows=[]
    for pair,name,data in db.execute('SELECT pair,name,data FROM shadow_accounts ORDER BY pair,name'):
        s=json.loads(data); c=s['config']
        liquidation=s['cash']+s['quantity']*s['price']*(1-c['slippage_bps']/10000)*(1-c['fee_bps']/10000)
        rows.append(dict(pair=pair,name=name,started=s['started'],updated=s['updated'],closed=s['closed'],
            net=100*(liquidation/10000-1),realized=s['realized'],fees=s['fees'],drawdown=s['drawdown'],
            position=bool(s['quantity']),halted=s['halted']))
    fills=[dict(name=name,**json.loads(data)) for name,data in db.execute('SELECT name,data FROM shadow_fills ORDER BY id DESC LIMIT 36')]
    return dict(accounts=rows,fills=fills,feeds=[dict(pair=p,checked=t,error=e) for p,t,e in db.execute('SELECT * FROM shadow_feed')])

def run(path,fetch):
    db=sqlite3.connect(path,timeout=15)
    while True:
        for pair in PAIRS:
            try:
                bars,price=fetch(dict(pair=pair,interval=60,slow=96))
                observe(db,pair,bars,price,time.time())
            except Exception as exc:
                with db: db.execute('INSERT OR REPLACE INTO shadow_feed VALUES(?,?,?)',(pair,time.time(),type(exc).__name__))
        time.sleep(max(1,CADENCE-time.time()%CADENCE))

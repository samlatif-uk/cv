import hashlib
import http.client
import json
import tempfile
import threading
import time
import unittest
import uuid
from pathlib import Path
import engine
import server

def bars(count=30, start=100, stamp=1700000000):
    return [[stamp+i*300, start+i, start+i+1, start+i-1, start+i] for i in range(count)]

class EngineTests(unittest.TestCase):
    def test_fees_and_cash_conservation(self):
        s=engine.initial()
        engine.fill(s,'buy',100,1,'test')
        self.assertAlmostEqual(s['cash'],9000)
        self.assertAlmostEqual(s['quantity']*s['entry']+s['fees'],1000)
        engine.fill(s,'sell',100,2,'test')
        self.assertEqual(s['quantity'],0)
        self.assertLess(s['cash'],10000)
        self.assertAlmostEqual(s['cash']-10000,s['realized'])
    def test_one_decision_per_candle(self):
        s=engine.initial(); s['running']=True
        history=bars()
        engine.step(s,history,129,history[-1][0]+300)
        self.assertEqual(len(s['trades']),1)
        engine.step(s,history,129,history[-1][0]+310)
        self.assertEqual(len(s['trades']),1)
    def test_stop_and_no_immediate_reentry(self):
        s=engine.initial(); s['running']=True
        history=bars()
        engine.step(s,history,129,history[-1][0]+300)
        engine.step(s,history,120,history[-1][0]+310)
        self.assertEqual(s['quantity'],0)
        engine.step(s,history,120,history[-1][0]+320)
        self.assertEqual(len(s['trades']),2)
    def test_daily_loss_halts_and_closes(self):
        s=engine.initial(); s['running']=True; s['config']['allocation']=100
        history=bars()
        engine.step(s,history,129,history[-1][0]+300)
        engine.step(s,history,100,history[-1][0]+310)
        self.assertTrue(s['halted']); self.assertFalse(s['running'])
        self.assertEqual(s['quantity'],0)
    def test_pause_does_not_trade(self):
        s=engine.initial(); engine.step(s,bars(),129,1700010000)
        self.assertEqual(s['trades'],[])
    def test_invalid_configuration(self):
        for field,value in [('fast',22),('allocation',float('nan')),('interval',2),('pair','EVIL'),('fast',2.5)]:
            c=engine.DEFAULT.copy();c[field]=value
            with self.assertRaises(ValueError): engine.validate(c)
    def test_backtest_isolated_and_next_open(self):
        c=engine.DEFAULT.copy(); before=c.copy(); result=engine.backtest(c,bars(80))
        self.assertEqual(c,before);self.assertGreater(result['fills'],0)
        history=bars(22); history[-1][1]=200
        result=engine.backtest(c,history)
        self.assertLess(result['equity'],10000) # cannot buy at the known lower signal close

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.db_path=Path(tempfile.gettempdir())/('trading-test-'+uuid.uuid4().hex+'.sqlite3')
        server.PASSWORD=hashlib.sha256(b'test-only-password').hexdigest()
        server.LOCAL=True;server.SESSIONS.clear();server.ATTEMPTS.clear()
        server.init_db(str(self.db_path))
        server.MARKET.update(bars=bars(),error='',fetched=time.time())
        self.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        threading.Thread(target=self.http.serve_forever,daemon=True).start()
        self.cookie='';self.csrf=''
    def tearDown(self):
        self.http.shutdown();self.http.server_close();server.DB.close()
        for suffix in ('','-wal','-shm'): Path(str(self.db_path)+suffix).unlink(missing_ok=True)
    def request(self,path,body=None,csrf=True):
        c=http.client.HTTPConnection('127.0.0.1',self.http.server_port)
        headers={'Cookie':self.cookie}
        if body is not None: headers['Content-Type']='application/json'
        if csrf: headers['X-CSRF-Token']=self.csrf
        c.request('POST' if body is not None else 'GET','/trading/api/'+path,
                  json.dumps(body) if body is not None else None,headers)
        r=c.getresponse();raw=r.read();result=(r.status,json.loads(raw),r.getheader('Set-Cookie'));c.close();return result
    def login(self):
        status,_,cookie=self.request('login',{'password':'test-only-password'})
        self.assertEqual(status,200);self.cookie=cookie.split(';')[0]
        status,data,_=self.request('state');self.csrf=data['csrf']
    def test_auth_csrf_and_logout(self):
        self.assertEqual(self.request('state')[0],401)
        self.login()
        self.assertEqual(self.request('control',{'action':'start'},False)[0],403)
        self.assertEqual(self.request('control',{'action':'start'})[0],200)
        self.assertTrue(server.STATE['running'])
        self.request('logout',{})
        self.assertEqual(self.request('state')[0],401)
    def test_stale_data_prevents_start(self):
        self.login();server.MARKET['fetched']=time.time()-100
        self.assertEqual(self.request('control',{'action':'start'})[0],400)
    def test_restart_pauses_preserves_portfolio(self):
        server.STATE['cash']=9876;server.STATE['running']=True;server.save();server.DB.close()
        server.init_db(str(self.db_path))
        self.assertEqual(server.STATE['cash'],9876);self.assertFalse(server.STATE['running'])
    def test_config_rejected_with_position(self):
        self.login();server.STATE['quantity']=1
        self.assertEqual(self.request('config',engine.DEFAULT)[0],400)

if __name__=='__main__': unittest.main()

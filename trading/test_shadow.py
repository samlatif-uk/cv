import sqlite3
import unittest
from unittest.mock import patch
import autopilot, engine, shadow
from test_autopilot import bars,result

class ShadowTests(unittest.TestCase):
    def test_trial_fills_persist_and_same_bucket_never_replays(self):
        db=sqlite3.connect(':memory:')
        shadow.setup(db)
        history=bars(110); now=history[-1][0]+3601
        main=engine.initial()
        for pair in shadow.PAIRS:
            shadow.observe(db,pair,history,120,now)
        first=shadow.summary(db)
        self.assertEqual(len(first['accounts']),18)
        self.assertGreater(len(first['fills']),0)
        self.assertTrue(all(f['time']==now for f in first['fills']))
        shadow.observe(db,'XBTUSD',history,90,now)
        self.assertEqual(shadow.summary(db)['fills'],first['fills'])
        shadow.observe(db,'XBTUSD',history,90,now+300)
        after=shadow.summary(db)
        self.assertGreater(len(after['fills']),len(first['fills']))
        self.assertEqual(main['trades'],[])
        self.assertEqual(main['cash'],10000.)
        with self.assertRaises(ValueError): shadow.observe(db,'XBTUSD',history,90,now+9000)
        db.close()

    def test_five_minute_check_and_forward_gate(self):
        s=engine.initial();autopilot.migrate(s)
        with patch.object(autopilot,'backtest',return_value=result()) as b:
            autopilot.update(s,bars(),601,[])
            self.assertEqual(s['method']['kind'],'cash')
            autopilot.update(s,bars(),899,[])
            self.assertEqual(b.call_count,7)
            trial=dict(pair='XBTUSD',name=autopilot.CANDIDATES[0]['name'],updated=900,closed=3,realized=20,net=.1,drawdown=.2,halted=False)
            autopilot.update(s,bars(),901,[trial])
            self.assertEqual(b.call_count,14)
            self.assertEqual(s['method']['name'],trial['name'])

import copy
import unittest
from unittest.mock import patch
import autopilot as a
import engine as e

def bars(n=720):
    return [[1700002800+i*3600,100+i*.1,101+i*.1,99+i*.1,100+i*.1] for i in range(n)]

def result(good=True):
    return dict(return_pct=10 if good else -1,max_drawdown_pct=.1,closed_trades=4,fees=12,halted=False)

class AutomaticTests(unittest.TestCase):
    def setUp(self):
        self.s=e.initial();a.migrate(self.s);self.c=self.s['config']

    def test_migration_preserves_losses_position_halt_and_costs(self):
        s=e.initial();s.update(cash=9000,realized=-200,quantity=.01,halted=True)
        s['config'].update(allocation=5,daily_loss=1)
        a.migrate(s)
        self.assertEqual((s['cash'],s['realized'],s['quantity']),(9000,-200,.01))
        self.assertTrue(s['halted']);self.assertEqual(s['config']['allocation'],5)
        self.assertEqual(s['config']['fee_bps'],40)
        a.migrate(s);self.assertEqual(s['autopilot']['history'],[])

    def test_insufficient_or_gapped_history_is_cash(self):
        self.assertEqual(a.research(self.c,bars(599),1)['selected']['kind'],'cash')
        history=bars();history[300][0]+=1
        self.assertIn('gaps',a.research(self.c,history,1)['reason'])

    def test_holdout_only_winner_and_no_reselection(self):
        history=bars();split=int(len(history)*.7)
        with patch.object(a,'backtest',side_effect=[result() for _ in a.CANDIDATES]+[result(False)]) as test:
            r=a.research(self.c,history,1)
        self.assertEqual(test.call_count,7)
        for call in test.call_args_list[:6]:
            self.assertEqual(call.args[1],history[:split])
            self.assertEqual(call.kwargs['start_index'],100)
        self.assertEqual(test.call_args_list[-1].kwargs['start_index'],split)
        self.assertEqual(r['selected']['kind'],'cash');self.assertIsNotNone(r['holdout'])

    def test_pass_and_reassessment_cadence_no_risk_override(self):
        self.s['halted']=True
        with patch.object(a,'backtest',return_value=result()) as test:
            a.update(self.s,bars(),100)
            a.update(self.s,bars(),200)
        self.assertEqual(test.call_count,7)
        self.assertNotEqual(self.s['method']['kind'],'cash')
        self.assertFalse(self.s['running']);self.assertTrue(self.s['halted'])
        self.assertEqual(len(self.s['autopilot']['history']),1)
        a.prepare(self.s,100+2*a.CADENCE+1)
        self.assertEqual(self.s['method']['kind'],'cash')

    def test_switch_flattens_before_adopting_and_pause_is_respected(self):
        e.fill(self.s,'buy',100,1,'old position')
        with patch.object(a,'backtest',return_value=result()): a.update(self.s,bars(),100)
        a.prepare(self.s,100)
        self.assertEqual(self.s['method']['kind'],'cash')
        e.step(self.s,bars(),100,1702600000)
        self.assertGreater(self.s['quantity'],0)
        self.s['running']=True;e.step(self.s,bars(),100,1702600010)
        self.assertEqual(self.s['quantity'],0)
        a.prepare(self.s,101);self.assertNotEqual(self.s['method']['kind'],'cash')

    def test_signals_and_closed_candle_breakout(self):
        history=bars(110)
        self.assertEqual(e.signal(history,self.c,a.CANDIDATES[0]),'buy')
        breakout=a.CANDIDATES[2]
        self.assertIsNone(e.signal(history,self.c,breakout))
        history[-1][4]=200
        self.assertEqual(e.signal(history,self.c,breakout),'buy')
        falling=[[b[0],200-i,201-i,199-i,200-i] for i,b in enumerate(bars(40))]
        self.assertEqual(e.signal(falling,self.c,a.CANDIDATES[4]),'buy')
        self.assertEqual(e.signal(bars(40),self.c,a.CANDIDATES[4]),'sell')

    def test_validation_warmup_never_executes_and_final_cost_in_drawdown(self):
        history=bars();original=copy.deepcopy(history)
        r=e.backtest(self.c,history,a.CANDIDATES[0],start_index=504)
        self.assertEqual(r['curve'][0]['time'],history[504][0])
        self.assertEqual(history,original)
        flat=[[b[0],100,100,100,100] for b in history]
        with patch.object(e,'signal',return_value='buy'):
            r=e.backtest(self.c,flat,start_index=719)
        self.assertGreater(r['max_drawdown_pct'],.09)
        self.assertEqual(r['curve'][-1]['value'],r['equity'])

    def test_actual_research_flat_market_does_not_invent_profit(self):
        flat=[[b[0],100,100,100,100] for b in bars()]
        r=a.research(self.c,flat,1)
        self.assertEqual(r['selected']['kind'],'cash')
        self.assertEqual(len(r['candidates']),6)
        self.assertIsNone(r['holdout'])

if __name__=='__main__':unittest.main()

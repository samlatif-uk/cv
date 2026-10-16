"""Bounded statistical research, not an LLM or a promise of future returns."""
import copy
from engine import backtest, initial, fill, equity

CASH = dict(kind='cash', name='Cash — no qualified strategy')
CADENCE = 6*3600
CANDIDATES = [
    dict(kind='sma',name='Trend 12 / 48',fast=12,slow=48,band=.005),
    dict(kind='sma',name='Trend 24 / 96',fast=24,slow=96,band=.01),
    dict(kind='breakout',name='Breakout 24',period=24),
    dict(kind='breakout',name='Breakout 72',period=72),
    dict(kind='rsi',name='RSI 14 / 25',period=14,entry=25),
    dict(kind='rsi',name='RSI 28 / 30',period=28,entry=30),
]

def compact(result):
    return {k:result[k] for k in ('return_pct','max_drawdown_pct','closed_trades','fees','halted')}

def benchmark(config, bars, start):
    s=initial();s['config']=config.copy()
    fill(s,'buy',bars[start][1],bars[start][0],'benchmark')
    fill(s,'sell',bars[-1][4],bars[-1][0],'benchmark')
    return (equity(s)/10000-1)*100

def eligible(result, minimum, baseline):
    return (result['closed_trades'] >= minimum and not result['halted']
            and result['return_pct'] > max(0,baseline)
            and result['max_drawdown_pct'] <= 2)

def research(config, bars, now):
    c=copy.deepcopy(config)
    report=dict(at=now,selected=CASH.copy(),reason='Need at least 600 continuous closed hourly candles.',
                candidates=[],holdout=None,bars=len(bars),train_benchmark=None,holdout_benchmark=None)
    if c['interval'] != 60 or len(bars)<600: return report
    if any(b[0]-a[0]!=3600 for a,b in zip(bars,bars[1:])):
        report['reason']='Hourly history contains gaps; holding cash.';return report
    split=int(len(bars)*.7)
    training=bars[:split]
    train_base=benchmark(c,training,100)
    report.update(from_time=bars[0][0],split_time=bars[split][0],to_time=bars[-1][0],train_benchmark=train_base)
    # All candidates have identical warmup and execution periods. Holdout is untouched here.
    for method in CANDIDATES:
        result=compact(backtest(c,training,method,start_index=100))
        report['candidates'].append(dict(method=method.copy(),training=result,eligible=eligible(result,3,train_base)))
    qualified=[r for r in report['candidates'] if r['eligible']]
    if not qualified:
        report['reason']='No training candidate beat cash and matched-allocation buy-and-hold with 3 closed trades and drawdown ≤ 2%.'
        return report
    winner=max(qualified,key=lambda r:r['training']['return_pct']-r['training']['max_drawdown_pct'])
    report['nominee']=winner['method']
    # Start flat at split; preceding bars warm indicators only. No runner-up rescue on holdout.
    holdout=compact(backtest(c,bars,winner['method'],start_index=split))
    baseline=benchmark(c,bars,split)
    report.update(holdout=holdout,holdout_benchmark=baseline)
    if eligible(holdout,2,baseline):
        report.update(selected=winner['method'],reason='Training winner passed the later-data check. Experimental paper trading only.')
    else:
        report['reason']='Training winner failed the later-data check: require 2 closed trades, return above cash and buy-and-hold, drawdown ≤ 2%, no halt.'
    return report

def migrate(state):
    if 'autopilot' not in state:
        state['autopilot']=dict(enabled=True,report=None,history=[])
        state['method']=CASH.copy()
        state['config'].update(interval=60,fast=12,slow=96,
            allocation=min(10,state['config']['allocation']),daily_loss=min(2,state['config']['daily_loss']))
        state['last_bar']=0

def update(state, bars, now):
    auto=state['autopilot']
    if not auto['enabled']: return
    report=auto['report']
    if report and now-report['at']<CADENCE: return
    report=research(state['config'],bars[-2160:],now)
    auto['report']=report
    auto['history']=(auto['history']+[copy.deepcopy(report)])[-30:]
    # Never relabel an existing position as a different strategy. Flatten first while running.
    if state['quantity'] and state.get('method') != report['selected']:
        state['method']=CASH.copy()
        auto['pending']=report['selected']
    else:
        state['method']=report['selected']
        auto.pop('pending',None)
    from engine import event
    event(state,'Automatic research: '+report['reason'],now)

def prepare(state, now):
    auto=state['autopilot']
    if not auto['enabled']: return
    report=auto['report']
    if not report or now-report['at']>2*CADENCE:
        state['method']=CASH.copy()
        return
    if not state['quantity'] and 'pending' in auto:
        state['method']=auto.pop('pending')

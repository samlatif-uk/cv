"""Paper-only execution. No authenticated exchange endpoints or real order adapter."""
import copy
import datetime as dt
import math

DEFAULT = dict(pair='XBTUSD', interval=5, fast=9, slow=21, allocation=10,
               stop_loss=3, take_profit=6, daily_loss=2, fee_bps=40, slippage_bps=10)

def validate(values):
    if not isinstance(values, dict) or set(values) != set(DEFAULT):
        raise ValueError('Supply exactly the supported settings.')
    if values['pair'] not in ('XBTUSD', 'ETHUSD', 'SOLUSD'):
        raise ValueError('Unsupported pair')
    for key in set(DEFAULT) - {'pair'}:
        value = values[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError('Settings must be finite numbers')
    if values['interval'] not in (1, 5, 15, 60):
        raise ValueError('Invalid interval')
    if not all(isinstance(values[k], int) for k in ('fast', 'slow', 'interval')):
        raise ValueError('Periods must be integers')
    if not 2 <= values['fast'] < values['slow'] <= 200:
        raise ValueError('Require 2 <= fast < slow <= 200')
    for k, lo, hi in [('allocation', 1, 100), ('stop_loss', .1, 50), ('take_profit', .1, 100),
                      ('daily_loss', .1, 25), ('fee_bps', 0, 200), ('slippage_bps', 0, 200)]:
        if not lo <= values[k] <= hi:
            raise ValueError(f'{k} must be between {lo} and {hi}')
    return copy.deepcopy(values)

def initial():
    return dict(config=DEFAULT.copy(), cash=10000., quantity=0., cost=0., entry=0.,
                running=False, halted=False, day='', day_equity=10000., last_bar=0,
                price=0., updated=0., realized=0., fees=0., trades=[], equity=[], events=[])

def equity(s, price=None):
    return s['cash'] + s['quantity'] * (s['price'] if price is None else price)

def event(s, message, now):
    s['events'] = (s['events'] + [dict(time=now, message=message)])[-300:]

def fill(s, side, price, now, reason):
    c = s['config']
    execution = price * (1 + c['slippage_bps']/10000 * (1 if side == 'buy' else -1))
    rate = c['fee_bps']/10000
    pnl = 0.
    if side == 'buy':
        if s['quantity'] or s['halted']: return
        budget = min(s['cash'], equity(s, price)*c['allocation']/100)
        if budget < 1: return
        qty = budget/(execution*(1+rate))
        fee = qty*execution*rate
        s.update(cash=s['cash']-budget, quantity=qty, cost=budget, entry=execution)
    else:
        qty = s['quantity']
        if not qty: return
        fee = qty*execution*rate
        proceeds = qty*execution-fee
        pnl = proceeds-s['cost']
        s.update(cash=s['cash']+proceeds, quantity=0., cost=0., entry=0., realized=s['realized']+pnl)
    s['fees'] += fee
    s['trades'].append(dict(time=now, pair=c['pair'], side=side, quantity=qty,
                            price=execution, fee=fee, pnl=pnl, reason=reason))
    event(s, f'Paper {side}: {reason}', now)

def step(s, bars, price, now):
    if not math.isfinite(price) or price <= 0: raise ValueError('Invalid price')
    s['price'], s['updated'] = price, now
    today = dt.datetime.fromtimestamp(now, dt.timezone.utc).date().isoformat()
    if today != s['day']:
        s['day'], s['day_equity'] = today, equity(s)
    c = s['config']
    if s['running']:
        if equity(s) <= s['day_equity']*(1-c['daily_loss']/100):
            fill(s, 'sell', price, now, 'Daily loss limit')
            s['running'], s['halted'] = False, True
            event(s, 'Daily loss circuit breaker: manual acknowledgement required', now)
        elif s['quantity'] and (price <= s['entry']*(1-c['stop_loss']/100) or
                                price >= s['entry']*(1+c['take_profit']/100)):
            fill(s, 'sell', price, now, 'Stop loss / take profit')
            if bars: s['last_bar'] = bars[-1][0]
        elif len(bars) >= c['slow'] and bars[-1][0] > s['last_bar']:
            s['last_bar'] = bars[-1][0]
            closes = [x[4] for x in bars]
            fast = sum(closes[-c['fast']:])/c['fast']
            slow = sum(closes[-c['slow']:])/c['slow']
            if fast > slow: fill(s, 'buy', price, now, 'Fast SMA above slow SMA')
            elif fast < slow: fill(s, 'sell', price, now, 'Fast SMA below slow SMA')
    s['equity'] = (s['equity'] + [dict(time=now, value=equity(s))])[-3000:]

def backtest(config, bars):
    s = initial()
    s['config'], s['running'] = validate(config), True
    # Signal from closed bars only; fill at following bar OPEN, with costs.
    for i in range(config['slow'], len(bars)):
        step(s, bars[:i], bars[i][1], bars[i][0])
    if bars:
        fill(s, 'sell', bars[-1][4], bars[-1][0]+config['interval']*60, 'End of backtest')
    peak, drawdown = 10000., 0.
    for point in s['equity']:
        peak = max(peak, point['value'])
        drawdown = max(drawdown, (peak-point['value'])/peak*100)
    return dict(equity=equity(s), return_pct=(equity(s)/10000-1)*100,
                max_drawdown_pct=drawdown, fills=len(s['trades']), fees=s['fees'],
                from_time=bars[0][0] if bars else 0, to_time=bars[-1][0] if bars else 0,
                curve=s['equity'], halted=s['halted'])

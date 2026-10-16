import copy
import csv
import hashlib
import hmac
import io
import json
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from engine import initial, validate, step, fill, event, equity, backtest
from intelligence import Workspace
import autopilot

ROOT = Path(__file__).parent
LOCK = threading.RLock()
SESSIONS = {}
ATTEMPTS = {}
STATE = None
DB = None
INTELLIGENCE = None
MARKET = dict(bars=[], error='Waiting for first market update', fetched=0)
PASSWORD = os.environ.get('TRADING_PASSWORD_SHA256', '')
LOCAL = os.environ.get('TRADING_LOCAL') == '1'

def init_db(path):
    global DB, STATE, INTELLIGENCE
    if INTELLIGENCE is not None: INTELLIGENCE.db.close()
    INTELLIGENCE = Workspace(path)
    DB = sqlite3.connect(path, check_same_thread=False)
    DB.execute('PRAGMA journal_mode=WAL')
    DB.execute('CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY, value TEXT NOT NULL)')
    DB.execute('CREATE TABLE IF NOT EXISTS candles(pair TEXT, interval INTEGER, stamp INTEGER, value TEXT NOT NULL, PRIMARY KEY(pair,interval,stamp))')
    row = DB.execute('SELECT value FROM state WHERE id=1').fetchone()
    STATE = json.loads(row[0]) if row else initial()
    autopilot.migrate(STATE)
    # Restarts always require explicit resume, preserving balances and positions.
    STATE['running'] = False
    event(STATE, 'Service started paused', time.time())
    save()

def save():
    with DB:
        DB.execute('INSERT OR REPLACE INTO state VALUES (1, ?)', (json.dumps(STATE, allow_nan=False),))

def fetch_market(c):
    url = f"https://api.kraken.com/0/public/OHLC?pair={c['pair']}&interval={c['interval']}"
    with urllib.request.urlopen(url, timeout=12) as r:
        data = json.load(r)
    if data.get('error'): raise ValueError('; '.join(data['error']))
    raw = next(v for k, v in data['result'].items() if k != 'last')
    bars = [[int(r[0])] + [float(v) for v in r[1:5]] for r in raw]
    if len(bars) < c['slow']+1: raise ValueError('Insufficient market history')
    if any(not all(__import__('math').isfinite(v) and v > 0 for v in b) for b in bars):
        raise ValueError('Invalid market values')
    if any(bars[i][0] >= bars[i+1][0] for i in range(len(bars)-1)):
        raise ValueError('Market timestamps out of order')
    now = time.time()
    if not -60 <= now-bars[-1][0] <= c['interval']*60+90:
        raise ValueError('Market data is stale')
    return bars[:-1], bars[-1][4]

def poll():
    while True:
        with LOCK: config = STATE['config'].copy()
        try:
            bars, price = fetch_market(config)
            with LOCK:
                if config != STATE['config']: continue
                MARKET.update(bars=bars, error='', fetched=time.time())
                with DB:
                    DB.executemany('INSERT OR IGNORE INTO candles VALUES (?,?,?,?)',
                        [(config['pair'],config['interval'],b[0],json.dumps(b)) for b in bars])
                history=[json.loads(r[0]) for r in DB.execute(
                    'SELECT value FROM candles WHERE pair=? AND interval=? ORDER BY stamp DESC LIMIT 2160',
                    (config['pair'],config['interval'])).fetchall()][::-1]
                autopilot.update(STATE, history, time.time())
                autopilot.prepare(STATE, time.time())
                step(STATE, bars, price, time.time())
                save()
        except Exception as exc:
            with LOCK:
                error = f'Market feed unavailable ({type(exc).__name__}); execution suspended'
                if MARKET['error'] != error: event(STATE, error, time.time())
                MARKET['error'] = error
                save()
        time.sleep(30)

def fresh():
    return not MARKET['error'] and time.time()-MARKET['fetched'] < 90

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def reply(self, status, body, kind='application/json', cookie=None):
        if kind == 'application/json': body = json.dumps(body, allow_nan=False).encode()
        elif isinstance(body, str): body = body.encode()
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        if cookie: self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)
    def session(self):
        try:
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            token = cookies['trading_session'].value
        except (KeyError, ValueError): return None
        value = SESSIONS.get(token)
        return value if value and value['expiry'] > time.time() else None
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/health':
            return self.reply(200, dict(ok=True, mode='paper'))
        files = {'/trading/': ('index.html', 'text/html'), '/trading/app.js': ('app.js', 'text/javascript'), '/trading/style.css': ('style.css', 'text/css')}
        files.update({'/trading/intelligence/': ('intelligence.html','text/html'),
                      '/trading/intelligence.js': ('intelligence.js','text/javascript'),
                      '/trading/intelligence.css': ('intelligence.css','text/css')})
        if path in files:
            name, kind = files[path]
            return self.reply(200, (ROOT/'static'/name).read_bytes(), kind)
        with LOCK:
            session = self.session()
            if not session: return self.reply(401, dict(error='Please sign in'))
            if path == '/trading/api/intelligence':
                return self.reply(200, dict(**INTELLIGENCE.summary(),csrf=session['csrf']))
            if path == '/trading/api/state':
                s = copy.deepcopy(STATE)
                s['trades'] = s['trades'][-200:]
                return self.reply(200, dict(state=s, equity=equity(s), market=MARKET,
                                           fresh=fresh(), mode='paper', csrf=session['csrf']))
            if path == '/trading/api/export':
                output = io.StringIO()
                w = csv.DictWriter(output, fieldnames=['time','pair','side','quantity','price','fee','pnl','reason'])
                w.writeheader()
                w.writerows(STATE['trades'])
                return self.reply(200, output.getvalue(), 'text/csv')
        self.reply(404, dict(error='Not found'))
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 8192: return self.reply(413, dict(error='Invalid request size'))
            if self.headers.get('Content-Type') != 'application/json': return self.reply(415, dict(error='JSON required'))
            # JSON + no CORS + custom CSRF header prevent cross-site mutations.
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict): raise ValueError('Object required')
            with LOCK:
                now = time.time()
                if self.path == '/trading/api/login':
                    for key in list(SESSIONS):
                        if SESSIONS[key]['expiry'] < now: del SESSIONS[key]
                    ip = self.client_address[0]
                    ATTEMPTS[ip] = [t for t in ATTEMPTS.get(ip, []) if now-t < 300]
                    if len(ATTEMPTS[ip]) >= 10: return self.reply(429, dict(error='Try again in five minutes'))
                    ATTEMPTS[ip].append(now)
                    password = data.get('password', '')
                    if not isinstance(password, str): raise ValueError('Password required')
                    digest = hashlib.sha256(password.encode()).hexdigest()
                    if not PASSWORD or not hmac.compare_digest(digest, PASSWORD):
                        return self.reply(401, dict(error='Incorrect password'))
                    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                    SESSIONS[token] = dict(expiry=now+8*3600, csrf=csrf)
                    suffix = '' if LOCAL else '; Secure'
                    return self.reply(200, dict(ok=True), cookie=f'trading_session={token}; Path=/trading/; HttpOnly; SameSite=Strict; Max-Age=28800{suffix}')
                session = self.session()
                if not session: return self.reply(401, dict(error='Please sign in'))
                if not hmac.compare_digest(self.headers.get('X-CSRF-Token', ''), session['csrf']):
                    return self.reply(403, dict(error='Invalid session token'))
                if self.path.startswith('/trading/api/intelligence/'):
                    result=INTELLIGENCE.mutate(self.path.rsplit('/',1)[-1],data)
                    return self.reply(200,result)
                if self.path == '/trading/api/logout':
                    for token, value in list(SESSIONS.items()):
                        if value is session: del SESSIONS[token]
                    return self.reply(200, dict(ok=True), cookie='trading_session=; Path=/trading/; Max-Age=0; HttpOnly; SameSite=Strict')
                if self.path == '/trading/api/config':
                    if STATE['running'] or STATE['quantity']: raise ValueError('Pause and close the position before editing settings')
                    STATE['config'] = validate(data)
                    STATE['autopilot']['enabled'] = False
                    STATE.pop('method',None)
                    STATE['last_bar'] = 0
                    MARKET.update(error='Settings changed; waiting for fresh market data', fetched=0, bars=[])
                    event(STATE, 'Strategy settings updated', now)
                elif self.path == '/trading/api/control':
                    action = data.get('action')
                    if action == 'automatic':
                        if STATE['running'] or STATE['quantity']: raise ValueError('Close position and pause before enabling automatic research')
                        STATE.pop('autopilot',None)
                        autopilot.migrate(STATE)
                        MARKET.update(error='Automatic research enabled; waiting for hourly data',fetched=0,bars=[])
                    elif action == 'start':
                        if not fresh(): raise ValueError('Fresh market data required')
                        if STATE['halted']: raise ValueError('Acknowledge the circuit breaker first')
                        STATE['running'] = True
                    elif action == 'pause': STATE['running'] = False
                    elif action == 'stop':
                        STATE['running'], STATE['halted'] = False, True
                    elif action == 'close':
                        if not fresh(): raise ValueError('Fresh market data required to simulate a close')
                        STATE['running'] = False
                        fill(STATE, 'sell', STATE['price'], now, 'Manual close')
                    elif action == 'acknowledge':
                        if STATE['running']: raise ValueError('Pause first')
                        STATE['halted'] = False
                    else: raise ValueError('Unknown control')
                    event(STATE, f'Control: {action}', now)
                elif self.path == '/trading/api/backtest':
                    if not fresh(): raise ValueError('Fresh market history required')
                    return self.reply(200, backtest(STATE['config'], MARKET['bars'], STATE.get('method')))
                else: return self.reply(404, dict(error='Not found'))
                save()
                self.reply(200, dict(ok=True))
        except (ValueError, TypeError, KeyError) as exc:
            self.reply(400, dict(error=str(exc)))
        except Exception:
            self.reply(500, dict(error='Server error; check service logs'))

if __name__ == '__main__':
    if len(PASSWORD) != 64: raise SystemExit('Set TRADING_PASSWORD_SHA256 to a password SHA-256 hash')
    init_db(os.environ.get('TRADING_DB', 'trading.sqlite3'))
    threading.Thread(target=poll, daemon=True).start()
    server = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('TRADING_PORT', '4181'))), Handler)
    print(f'Paper trading dashboard: http://127.0.0.1:{server.server_port}/trading/', flush=True)
    server.serve_forever()

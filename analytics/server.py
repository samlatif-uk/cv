"""Small first-party analytics service. Bind only to loopback behind nginx."""
import base64
from contextlib import contextmanager
import datetime as dt
import hashlib
import hmac
import json
import os
import ipaddress
import secrets
from pathlib import Path
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
HOSTS = {'samlatif.uk', 'www.samlatif.uk', 'react.samlatif.uk'}
PATHS = {'/': 'CV', '/lab/': 'Career atlas', '/lab/stories/': 'Work in practice'}

class GeoLocation:
    def __init__(self, path):
        self.reader = None
        try:
            import maxminddb
            self.reader = maxminddb.open_database(path)
        except Exception:
            # Optional enrichment must not prevent collection if the DB is corrupt.
            pass

    def country(self, address):
        if not self.reader or not address:
            return 'Unknown'
        try:
            code = (self.reader.get(address) or {}).get('country', {}).get('iso_code', '')
            return code if re.fullmatch('[A-Z]{2}', code) else 'Unknown'
        except Exception:
            return 'Unknown'

def public_address(value):
    try:
        address = ipaddress.ip_address(value)
        if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
            address = address.ipv4_mapped
        return str(address) if address.is_global else None
    except ValueError:
        return None

def normalize(payload, agent):
    if not isinstance(payload, dict):
        raise ValueError('Expected an object')
    path = payload.get('path')
    if not isinstance(path, str):
        raise ValueError('Invalid path')
    path = '/' if path in ('/', '/index.html') else path.rstrip('/') + '/'
    if path not in PATHS:
        raise ValueError('Unknown page')
    referrer = payload.get('referrer', '')
    if not isinstance(referrer, str) or len(referrer) > 253 or (referrer and not re.fullmatch(r'[a-zA-Z0-9.-]+', referrer)):
        raise ValueError('Invalid referrer')
    referrer = referrer.lower()
    if referrer in HOSTS:
        referrer = 'Internal'
    agent = agent.lower()
    if re.search(r'bot|crawler|spider|headless|preview', agent):
        return None
    device = 'Tablet' if 'ipad' in agent or ('android' in agent and 'mobile' not in agent) else 'Mobile' if re.search(r'mobile|iphone', agent) else 'Desktop'
    browser = next((name for pattern, name in [('edg/', 'Edge'), ('firefox/|fxios/', 'Firefox'), ('chrome/|crios/', 'Chrome'), ('safari/', 'Safari')] if re.search(pattern, agent)), 'Other')
    return path, referrer or 'Direct / unknown', device, browser

class Store:
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('CREATE TABLE IF NOT EXISTS views (day TEXT, path TEXT, referrer TEXT, device TEXT, browser TEXT, total INTEGER NOT NULL, PRIMARY KEY(day,path,referrer,device,browser))')
            db.execute('CREATE TABLE IF NOT EXISTS audience (day TEXT, visitor TEXT, country TEXT, views INTEGER NOT NULL, sessions INTEGER NOT NULL, last_seen INTEGER, PRIMARY KEY(day,visitor))')
            db.execute('CREATE TABLE IF NOT EXISTS daily_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS analytics_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def record(self, event, address=None, agent='', country='Unknown', now=None):
        now = now or dt.datetime.now(dt.timezone.utc)
        today = now.date()
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            # Bound referrer cardinality so random inputs cannot grow the database indefinitely.
            path, referrer, device, browser = event
            known = db.execute('SELECT 1 FROM views WHERE day=? AND referrer=? LIMIT 1', (str(today), referrer)).fetchone()
            count = db.execute('SELECT COUNT(DISTINCT referrer) FROM views WHERE day=?', (str(today),)).fetchone()[0]
            if not known and count >= 200:
                referrer = 'Other sources'
            db.execute('INSERT INTO views VALUES (?,?,?,?,?,1) ON CONFLICT(day,path,referrer,device,browser) DO UPDATE SET total=total+1', (str(today), path, referrer, device, browser))
            db.execute('DELETE FROM views WHERE day < ?', (str(today - dt.timedelta(days=89)),))
            db.execute('DELETE FROM audience WHERE day < ?', (str(today - dt.timedelta(days=89)),))
            db.execute('DELETE FROM daily_salt WHERE day <> ?', (str(today),))
            db.execute('UPDATE audience SET last_seen=NULL WHERE day <> ? AND last_seen IS NOT NULL', (str(today),))
            if address:
                db.execute('INSERT OR IGNORE INTO analytics_meta VALUES (?,?)', ('audience_since', now.isoformat()))
                db.execute('INSERT OR IGNORE INTO daily_salt VALUES (?,?)', (str(today), secrets.token_hex(32)))
                salt = db.execute('SELECT salt FROM daily_salt WHERE day=?', (str(today),)).fetchone()[0]
                visitor = hmac.new(bytes.fromhex(salt), (address + '\n' + agent[:1024]).encode(), hashlib.sha256).hexdigest()
                timestamp = int(now.timestamp())
                db.execute('''INSERT INTO audience VALUES (?,?,?,1,1,?)
                    ON CONFLICT(day,visitor) DO UPDATE SET views=views+1,
                    sessions=sessions+CASE WHEN excluded.last_seen-last_seen>=1800 THEN 1 ELSE 0 END,
                    last_seen=MAX(last_seen,excluded.last_seen)''', (str(today), visitor, country, timestamp))

    def stats(self, days):
        today = dt.datetime.now(dt.timezone.utc).date()
        start = str(today - dt.timedelta(days=days - 1))
        with self.connect() as db:
            result = {'days': days, 'total': db.execute('SELECT COALESCE(SUM(total),0) FROM views WHERE day>=?', (start,)).fetchone()[0]}
            for column in ('day', 'path', 'referrer', 'device', 'browser'):
                order = 'day ASC' if column == 'day' else 'SUM(total) DESC'
                result[column] = [{'label': label, 'count': count} for label, count in db.execute(f'SELECT {column},SUM(total) FROM views WHERE day>=? GROUP BY {column} ORDER BY {order}', (start,))]
            unique, sessions, tracked = db.execute('SELECT COUNT(*), COALESCE(SUM(sessions),0), COALESCE(SUM(views),0) FROM audience WHERE day>=?', (start,)).fetchone()
            result.update(daily_uniques=unique, sessions=sessions, audience_views=tracked)
            result['unique_day'] = [{'label': day, 'count': count} for day, count in db.execute('SELECT day,COUNT(*) FROM audience WHERE day>=? GROUP BY day ORDER BY day', (start,))]
            result['country'] = [{'label': country, 'count': count} for country, count in db.execute('SELECT country,COUNT(*) FROM audience WHERE day>=? GROUP BY country ORDER BY COUNT(*) DESC,country', (start,))]
            since = db.execute("SELECT value FROM analytics_meta WHERE key='audience_since'").fetchone()
            result['audience_since'] = since[0] if since else None
        return result

def handler_for(store, password_hash, geo=None):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not retain IPs, URLs or credentials in application logs.

        def respond(self, status, body=b'', content_type='application/json', headers=None):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            for key, value in (headers or {}).items():
                self.send_header(key, value)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def authorized(self):
            try:
                scheme, token = self.headers.get('Authorization', '').split(' ', 1)
                user, password = base64.b64decode(token, validate=True).decode().split(':', 1)
                return scheme.lower() == 'basic' and user == 'sam' and hmac.compare_digest(hashlib.sha256(password.encode()).hexdigest(), password_hash)
            except (ValueError, UnicodeError):
                return False

        def do_GET(self):
            if self.path == '/health':
                return self.respond(200, b'{"ok":true}')
            if not self.path.startswith('/insights/'):
                return self.respond(404)
            if not self.authorized():
                return self.respond(401, headers={'WWW-Authenticate': 'Basic realm="Sam Latif analytics", charset="UTF-8"'})
            if self.path.startswith('/insights/stats?days='):
                try:
                    days = int(self.path.split('=')[1])
                    if days not in (7, 30, 90):
                        raise ValueError()
                    stats = store.stats(days)
                    stats['geo_available'] = bool(geo and geo.reader)
                    return self.respond(200, json.dumps(stats).encode())
                except ValueError:
                    return self.respond(400)
            files = {'/insights/': ('dashboard.html', 'text/html; charset=utf-8'), '/insights/dashboard.js': ('dashboard.js', 'text/javascript'), '/insights/dashboard.css': ('dashboard.css', 'text/css')}
            if self.path not in files:
                return self.respond(404)
            filename, mime = files[self.path]
            return self.respond(200, (ROOT / filename).read_bytes(), mime, {'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Frame-Options': 'DENY'})

        def do_POST(self):
            if self.path != '/api/visit':
                return self.respond(404)
            if self.headers.get('Origin') not in {'https://' + host for host in HOSTS}:
                return self.respond(403)
            if self.headers.get('DNT') == '1' or self.headers.get('Sec-GPC') == '1':
                return self.respond(204)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 1024 or self.headers.get_content_type() != 'application/json':
                    return self.respond(400)
                event = normalize(json.loads(self.rfile.read(length)), self.headers.get('User-Agent', '')[:1024])
                if event:
                    # nginx overwrites this header; never trust client X-Forwarded-For.
                    address = public_address(self.headers.get('X-Analytics-IP', ''))
                    store.record(event, address, self.headers.get('User-Agent', '')[:1024], geo.country(address) if geo else 'Unknown')
                return self.respond(204)
            except (ValueError, UnicodeError):
                return self.respond(400)
            except sqlite3.Error:
                return self.respond(503)
    return Handler

if __name__ == '__main__':
    password_hash = os.environ.get('ANALYTICS_PASSWORD_SHA256', '')
    if not re.fullmatch('[0-9a-f]{64}', password_hash):
        raise SystemExit('Set ANALYTICS_PASSWORD_SHA256 before starting.')
    store = Store(os.environ.get('ANALYTICS_DB', '/var/lib/sam-analytics/views.sqlite'))
    geo = GeoLocation(os.environ.get('ANALYTICS_GEO_DB', '/var/lib/sam-analytics/country.mmdb'))
    server = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('ANALYTICS_PORT', '4180'))), handler_for(store, password_hash, geo))
    server.serve_forever()

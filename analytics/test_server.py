import base64
import hashlib
import datetime as dt
import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
import uuid
from http.server import ThreadingHTTPServer
from server import Store, handler_for, normalize, public_address, GeoLocation

class AnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.database = Path(tempfile.gettempdir()) / ('analytics-test-' + uuid.uuid4().hex + '.sqlite')
        self.store = Store(self.database)
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(self.store, hashlib.sha256(b'test-password').hexdigest()))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        for suffix in ('', '-wal', '-shm'):
            Path(str(self.database) + suffix).unlink(missing_ok=True)

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        conn.request(method, path, body, headers or {})
        response = conn.getresponse(); result = response.status, response.read(); conn.close(); return result

    def login(self, password='test-password', origin='https://samlatif.uk'):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        conn.request('POST', '/insights/login', json.dumps({'password':password}), {'Origin':origin, 'Host':'samlatif.uk', 'Content-Type':'application/json'})
        response = conn.getresponse(); status = response.status; cookie = response.getheader('Set-Cookie'); response.read(); conn.close()
        return status, cookie

    def test_dashboard_requires_auth_and_no_public_stats(self):
        self.assertEqual(self.request('GET', '/insights/')[0], 303)
        self.assertEqual(self.request('GET', '/insights/home')[0], 303)
        self.assertEqual(self.request('GET', '/insights/login')[0], 200)
        self.assertEqual(self.request('GET', '/insights/stats?days=30')[0], 401)
        self.assertEqual(self.request('GET', '/insights/site-status')[0], 401)
        self.assertEqual(self.login('wrong')[0], 401)
        self.assertEqual(self.login(origin='https://evil.example')[0], 403)
        status, cookie = self.login()
        self.assertEqual(status, 204)
        for flag in ('Secure', 'HttpOnly', 'SameSite=Strict', 'Max-Age=28800', '__Host-sam_session='):
            self.assertIn(flag, cookie)
        auth = {'Cookie':cookie.split(';')[0]}
        self.assertEqual(self.request('GET', '/insights/', headers=auth)[0], 200)
        self.assertEqual(self.request('GET', '/insights/home', headers=auth)[0], 200)
        self.assertEqual(self.request('GET', '/insights/stats?days=0', headers=auth)[0], 400)
        self.assertEqual(self.request('POST', '/insights/logout', headers=auth)[0], 403)
        self.assertEqual(self.request('POST', '/insights/logout', headers={**auth,'Origin':'https://samlatif.uk','Host':'samlatif.uk'})[0], 204)
        self.assertEqual(self.request('GET', '/insights/stats?days=30', headers=auth)[0], 401)

    def test_expired_and_forged_sessions(self):
        from unittest.mock import patch
        status, cookie = self.login()
        auth = {'Cookie':cookie.split(';')[0]}
        self.assertEqual(self.request('GET', '/insights/stats?days=7', headers={'Cookie':'__Host-sam_session=forged'})[0], 401)
        import time
        with patch('server.time.time', return_value=time.time()+28801):
            self.assertEqual(self.request('GET', '/insights/stats?days=7', headers=auth)[0], 401)

    def test_site_checks_are_cached_and_report_failures(self):
        from unittest.mock import patch, MagicMock
        status, cookie = self.login()
        auth = {'Cookie':cookie.split(';')[0]}
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.headers.get_content_type.return_value = 'text/html'
        with patch('server.urllib.request.urlopen', side_effect=[response, OSError('offline'), response]) as probe:
            status, body = self.request('GET', '/insights/site-status', headers=auth)
            self.assertEqual(status, 200)
            self.assertEqual([p['available'] for p in json.loads(body)['pages']], [True, False, True])
            self.assertEqual(self.request('GET', '/insights/site-status', headers=auth)[0], 200)
            self.assertEqual(probe.call_count, 3)

    def test_collection_origin_validation_and_privacy(self):
        body = json.dumps({'path':'/lab/', 'referrer':'example.com'})
        headers = {'Origin':'https://samlatif.uk', 'Content-Type':'application/json', 'User-Agent':'Mozilla Chrome/120'}
        self.assertEqual(self.request('POST','/api/visit',body,headers)[0],204)
        self.assertEqual(self.request('POST','/api/visit',body,{**headers,'Origin':'https://evil.example'})[0],403)
        self.assertEqual(self.request('POST','/api/visit',body,{**headers,'DNT':'1'})[0],204)
        self.assertEqual(self.request('POST','/api/visit',json.dumps({'path':'/?email=secret'}),headers)[0],400)
        stats = self.store.stats(30)
        self.assertEqual(stats['total'],1)
        self.assertEqual(stats['referrer'][0]['label'],'example.com')

    def test_normalization_and_aggregation(self):
        event = normalize({'path':'/lab', 'referrer':'samlatif.uk'}, 'Mozilla iPhone Safari/1')
        self.assertEqual(event,('/lab/','Internal','Mobile','Safari'))
        self.assertIsNone(normalize({'path':'/'},'Googlebot'))
        self.store.record(event); self.store.record(event)
        self.assertEqual(self.store.stats(7)['path'],[{'label':'/lab/','count':2}])
        with self.store.connect() as db:
            db.execute("INSERT INTO views VALUES ('2000-01-01','/','Direct','Desktop','Other',1)")
        self.store.record(event)
        with self.store.connect() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM views WHERE day='2000-01-01'").fetchone()[0],0)

    def test_daily_unique_visitors_sessions_and_countries(self):
        event = normalize({'path':'/'}, 'Chrome/120')
        now = dt.datetime.now(dt.timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
        for minute in (0, 1, 31):
            self.store.record(event, '8.8.8.8', 'Chrome/120', 'US', now + dt.timedelta(minutes=minute))
        self.store.record(event, '1.1.1.1', 'Safari/1', 'AU', now)
        stats = self.store.stats(7)
        self.assertEqual((stats['total'], stats['daily_uniques'], stats['sessions'], stats['audience_views']), (4, 2, 3, 4))
        self.assertEqual(sum(row['count'] for row in stats['country']), 2)
        with self.store.connect() as db:
            self.assertNotIn('8.8.8.8', str(db.execute('SELECT * FROM audience').fetchall()))
        self.store.record(event, '8.8.8.8', 'Chrome/120', 'US', now + dt.timedelta(days=1))
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM daily_salt').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT COUNT(DISTINCT visitor) FROM audience').fetchone()[0], 3)
            self.assertIsNone(db.execute('SELECT last_seen FROM audience WHERE day=? LIMIT 1', (str(now.date()),)).fetchone()[0])

    def test_legacy_and_missing_identity_are_not_fake_uniques(self):
        self.store.record(normalize({'path':'/'}, 'Chrome/120'))
        stats = self.store.stats(30)
        self.assertEqual(stats['total'], 1)
        self.assertEqual(stats['daily_uniques'], 0)
        self.assertIsNone(stats['audience_since'])
        self.assertEqual(GeoLocation('/missing.mmdb').country('8.8.8.8'), 'Unknown')
        for value in ('', 'garbage', '127.0.0.1', '10.0.0.1', '8.8.8.8, 1.1.1.1'):
            self.assertIsNone(public_address(value))
        self.assertEqual(public_address('::ffff:8.8.8.8'), '8.8.8.8')

    def test_collector_trusted_header_and_opt_out(self):
        headers = {'Origin':'https://samlatif.uk', 'Content-Type':'application/json', 'User-Agent':'Chrome/120', 'X-Analytics-IP':'8.8.8.8'}
        for extra in ({}, {}, {'Sec-GPC':'1'}, {'DNT':'1'}, {'User-Agent':'Googlebot'}):
            self.assertEqual(self.request('POST', '/api/visit', '{"path":"/"}', {**headers, **extra})[0], 204)
        stats = self.store.stats(7)
        self.assertEqual((stats['daily_uniques'], stats['sessions'], stats['total']), (1,1,2))
        self.assertEqual(stats['country'], [{'label':'Unknown','count':1}])

if __name__ == '__main__': unittest.main()

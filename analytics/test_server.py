import base64
import hashlib
import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
import uuid
from http.server import ThreadingHTTPServer
from server import Store, handler_for, normalize

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

    def test_dashboard_requires_auth_and_no_public_stats(self):
        self.assertEqual(self.request('GET', '/insights/')[0], 401)
        self.assertEqual(self.request('GET', '/insights/stats?days=30')[0], 401)
        auth = {'Authorization':'Basic ' + base64.b64encode(b'sam:test-password').decode()}
        self.assertEqual(self.request('GET', '/insights/', headers=auth)[0], 200)
        self.assertEqual(self.request('GET', '/insights/stats?days=0', headers=auth)[0], 400)

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

if __name__ == '__main__': unittest.main()

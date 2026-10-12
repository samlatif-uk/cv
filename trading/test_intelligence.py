import datetime as dt
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch
import uuid
from intelligence import Workspace, probability, url, response_text

class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.path=Path(tempfile.gettempdir())/('intel-test-'+uuid.uuid4().hex+'.sqlite3')
        self.w=Workspace(str(self.path));self.w.provider.enabled=False
        self.deadline=time.time()+3600
        self.q=self.w.mutate('create',dict(question='Will the event occur?',rules='YES if official source confirms; otherwise NO.',
            deadline=dt.datetime.fromtimestamp(self.deadline,dt.timezone.utc).isoformat(),category='Markets'))
    def tearDown(self):
        self.w.db.close()
        for suffix in ('','-wal','-shm'): Path(str(self.path)+suffix).unlink(missing_ok=True)
    def manual(self,**overrides):
        data=dict(id=self.q['id'],probability=70,summary='My assessment',market=60,
                  market_url='https://example.com/market',market_time=dt.datetime.now(dt.timezone.utc).isoformat())
        data.update(overrides)
        return self.w.mutate('manual',data)
    def resolve(self,outcome='yes'):
        return self.w.mutate('resolve',dict(id=self.q['id'],outcome=outcome,source='https://example.com/result',notes='Official result'))
    def test_manual_forecasts_are_immutable_history(self):
        self.manual();self.manual(probability=80)
        values=self.w.get(self.q['id'])['forecasts']
        self.assertEqual([f['probability'] for f in values],[70,80])
        self.assertTrue(all(f['kind']=='manual' for f in values))
    def test_disabled_ai_has_no_side_effects(self):
        with self.assertRaisesRegex(ValueError,'disabled'): self.w.mutate('forecast',dict(id=self.q['id']))
        self.assertEqual(self.w.get(self.q['id'])['forecasts'],[])
        self.assertFalse(self.w.active)
    def test_resolution_and_brier_first_forecast(self):
        self.manual();self.manual(probability=90)
        with patch('intelligence.time.time',return_value=self.deadline+1): self.resolve()
        summary=self.w.summary()
        self.assertAlmostEqual(summary['brier'],.09)
        self.assertAlmostEqual(summary['market_brier'],.16)
        self.assertEqual(summary['score_count'],1)
    def test_void_excluded_from_scores(self):
        self.manual()
        with patch('intelligence.time.time',return_value=self.deadline+1): self.resolve('void')
        self.assertEqual(self.w.summary()['score_count'],0)
    def test_no_early_resolution_or_late_forecasts(self):
        with self.assertRaisesRegex(ValueError,'after the deadline'): self.resolve()
        with patch('intelligence.time.time',return_value=self.deadline+1):
            with self.assertRaisesRegex(ValueError,'closed'): self.manual()
    def test_writing_and_resolution_locked(self):
        self.manual()
        with self.assertRaisesRegex(ValueError,'locked'): self.w.mutate('adopt',dict(id=self.q['id']))
        with patch('intelligence.time.time',return_value=self.deadline+1): self.resolve()
        with self.assertRaises(ValueError): self.resolve('no')
    def test_invalid_probability_and_unsafe_links(self):
        for value in (float('nan'),float('inf'),-1,101,True):
            with self.assertRaises(ValueError): probability(value)
        for link in ('javascript:alert(1)','data:text/plain,hi','https://user:password@example.com'):
            with self.assertRaises(ValueError): url(link)
        with self.assertRaises(ValueError): self.manual(market_time='2099-01-01T00:00:00Z')
    def test_restart_retains_data_and_fails_interrupted_job(self):
        self.manual();q=self.w.get(self.q['id']);q['job']['status']='running';self.w.save(q)
        self.w.db.close();self.w=Workspace(str(self.path))
        q=self.w.get(self.q['id']);self.assertEqual(len(q['forecasts']),1);self.assertEqual(q['job']['status'],'failed')
    def test_ai_provider_flow_with_stub(self):
        class Stub:
            enabled=True;model='test-model'
            def call(self,instructions,payload,schema=None,research=False):
                if research:
                    return 'Test research only',dict(output=[dict(content=[dict(annotations=[dict(type='url_citation',url='https://example.com/evidence',title='Evidence')])])])
                return dict(probability=60,case_yes='For',case_no='Against',uncertainties='Unknown',summary='Test only'),{}
        self.w.provider=Stub();self.w.active=True
        self.w.run(self.q['id'],'forecast',dict(market=None,market_url='',market_time=None))
        q=self.w.get(self.q['id']);self.assertEqual(q['job']['status'],'done');self.assertEqual(q['forecasts'][0]['probability'],60)
        self.assertEqual(len(q['forecasts'][0]['perspectives']),3)
        self.assertFalse(self.w.active)
    def test_missing_sources_does_not_save_ai_forecast(self):
        class Stub:
            enabled=True;model='test-model'
            def call(self,*args,**kwargs): return 'No citations',dict(output=[])
        self.w.provider=Stub();self.w.run(self.q['id'],'forecast',{})
        q=self.w.get(self.q['id']);self.assertEqual(q['job']['status'],'failed');self.assertEqual(q['forecasts'],[])
    def test_incomplete_or_refused_response_rejected(self):
        with self.assertRaises(ValueError): response_text(dict(status='incomplete',output=[]))
        with self.assertRaises(ValueError): response_text(dict(status='completed',output=[dict(content=[dict(type='refusal')])]))

if __name__=='__main__': unittest.main()

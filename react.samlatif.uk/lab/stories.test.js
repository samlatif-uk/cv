import test from 'node:test';
import assert from 'node:assert/strict';
import { seatsFor, teamDistance, makeReport, filterInstruments, windowRange } from './stories/model.js';
test('grouped seating retains balanced teams and reduces mean team distance',()=>{
  const mixed=seatsFor('mixed'), grouped=seatsFor('teams');
  assert.equal(new Set(grouped.map(s=>`${s.x},${s.z}`)).size,24);
  for(const team of [0,1,2]) assert.equal(grouped.filter(s=>s.team===team).length,8);
  assert.ok(teamDistance(grouped)<teamDistance(mixed));
});
test('report percentages derive from inputs and invalid counts are rejected',()=>{
  const valid={title:'Example',period:'Q3',summary:'Summary',completed:18,planned:24};
  assert.equal(makeReport(valid).percent,75);
  for(const values of [{planned:0},{completed:25},{completed:1.5},{title:' '},{planned:1001}]) assert.throws(()=>makeReport({...valid,...values}));
});
test('instrument filters intersect and virtual windows stay bounded',()=>{
  assert.equal(filterInstruments('','all').length,10000);
  assert.equal(filterInstruments('','EUR/USD').length,2500);
  assert.equal(filterInstruments('EUR/USD','GBP/USD').length,0);
  assert.equal(filterInstruments('FX-00001','all').length,1);
  const bottom=windowRange(439650,350,10000);
  assert.equal(bottom.end,10000);assert.ok(bottom.end-bottom.start<=15);
  assert.deepEqual(windowRange(0,350,0),{start:0,end:0});
});

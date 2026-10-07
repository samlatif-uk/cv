import test from 'node:test';
import assert from 'node:assert/strict';
import { jobs, matchesSkill, matchingJobs, commonSkills, firstYear, lastYear } from './atlas-data.js';

test('React filters accept versioned React and Native, but not testing libraries', () => {
  for (const skill of ['React', 'React 18', 'React Native']) {
    assert.equal(matchesSkill({ stack: [skill] }, 'React'), true);
  }
  assert.equal(matchesSkill({ stack: ['React Testing Library'] }, 'React'), false);
});

test('skill, sector and year constraints intersect, including empty results', () => {
  assert.equal(matchingJobs('All', 'All', lastYear).length, jobs.length);
  assert.deepEqual(matchingJobs('Three.js', 'All', firstYear), []);
  const results = matchingJobs('Three.js', 'Product', 2015);
  assert.deepEqual(results.map(job => job.co), ['InSitYou Software']);
  assert.ok(matchingJobs('All', 'Finance', 2021).every(job => job.sector === 'Finance' && job.year <= 2021));
});

test('connections represent shared skills without duplicate React versions', () => {
  assert.deepEqual(commonSkills({ stack: ['React 18', 'React', 'TypeScript'] }, { stack: ['React 19', 'Node.js'] }), ['React']);
  assert.deepEqual(commonSkills({ stack: ['SCSS'] }, { stack: ['TypeScript'] }), []);
});

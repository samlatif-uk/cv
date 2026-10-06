import cv from '../../shared/cv-data.json' with { type: 'json' };

// Editorial groupings of the work; all roles, dates and claims come from the CV.
export const jobs = cv.JOBS.map((job, index) => ({
  ...job,
  id: index,
  year: Number(job.date.match(/\d{4}/)?.[0] || 2012),
  sector: /Bank|Goldman|Visa|UBS|HSBC/.test(job.co) ? 'Finance'
    : /Rehab|Future Platforms|Thought Machine|Chelsea|Social Partners|Fox Parrack|Goldsmiths|Paper$|We3/.test(job.co) ? 'Creative' : 'Product',
}));
export const recommendations = cv.TESTIMONIALS.filter(item => item.visibility === 'public');
export const lastYear = Math.max(...jobs.map(job => job.year));
export const firstYear = Math.min(...jobs.map(job => job.year));
export function matchesSkill(job, skill) {
  if (skill === 'All') return true;
  if (skill === 'React') return job.stack.some(item => /^React(?:$| \d| Native)/.test(item));
  if (skill === 'UX') return /UX|prototype|prototyp|design/i.test([job.desc, ...job.bullets].join(' '));
  return job.stack.includes(skill);
}
export function matchingJobs(skill, sector, year) {
  return jobs.filter(job => job.year <= year && (sector === 'All' || job.sector === sector) && matchesSkill(job, skill));
}
export function commonSkills(a, b) {
  const normalized = job => new Set(job.stack.map(item => /^React(?:$| \d| Native)/.test(item) ? 'React' : item));
  const bSkills = normalized(b);
  return [...normalized(a)].filter(skill => bSkills.has(skill));
}

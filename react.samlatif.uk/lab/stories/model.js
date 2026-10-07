export const teamNames = ['Design', 'Engineering', 'Product'];
export function seatsFor(mode) {
  return Array.from({ length: 24 }, (_, i) => ({ id: i + 1, x: i % 6, z: Math.floor(i / 6), team: mode === 'teams' ? Math.floor((i % 6) / 2) : i % 3 }));
}
export function teamDistance(seats) {
  let sum = 0, pairs = 0;
  seats.forEach((a, i) => seats.slice(i + 1).forEach(b => {
    if (a.team === b.team) { sum += Math.hypot(a.x - b.x, a.z - b.z); pairs++; }
  }));
  return pairs ? sum / pairs : 0;
}
export function makeReport({ title, period, completed, planned, summary }) {
  if (!title.trim() || !period.trim() || !summary.trim()) throw new Error('Add a title, period and summary.');
  if (!Number.isInteger(completed) || !Number.isInteger(planned) || completed < 0 || planned < 1 || planned > 1000 || completed > planned) throw new Error('Use whole numbers: planned 1–1,000, completed 0–planned.');
  return { title: title.trim(), period: period.trim(), summary: summary.trim(), completed, planned, percent: Math.round(completed / planned * 100) };
}
export const instruments = Array.from({ length: 10000 }, (_, i) => ({ id: `FX-${String(i + 1).padStart(5, '0')}`, pair: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'][i % 4], notional: (1 + i % 90) * 100000, status: i % 7 === 0 ? 'Review' : 'Ready' }));
export function filterInstruments(query, pair) {
  const term = query.trim().toLowerCase();
  return instruments.filter(row => (pair === 'all' || row.pair === pair) && `${row.id} ${row.pair}`.toLowerCase().includes(term));
}
export function windowRange(scrollTop, height, count) {
  const start = Math.max(0, Math.floor(scrollTop / 44) - 3);
  return { start: Math.min(start, count), end: Math.min(count, start + Math.ceil(height / 44) + 7) };
}

import './style.css';
import { seatsFor, teamDistance, teamNames, makeReport, filterInstruments, windowRange } from './model.js';
const $ = id => document.getElementById(id);
const text = (tag, content) => { const el = document.createElement(tag); el.textContent = content; return el; };
const cases = {
  space: { client: 'INSITYOU SOFTWARE / 2015', title: 'Turn relationships into a workable space.', problem: 'Architectural practices needed to allocate seats and understand floor plans from large datasets.', contribution: 'Built a ranked-relationship seating algorithm from CSV data and visualised floor plans using D3, Canvas and SVG.', outcome: 'Delivered in-house seat allocation and floor-plan visualisation software, while mentoring a junior developer across the stack.', demo: 'SEATING STUDIO' },
  deck: { client: 'BANK OF AMERICA / 2024–PRESENT', title: 'Make repetitive reporting repeatable.', problem: 'Creating PowerPoint decks manually could take users weeks or even months.', contribution: 'Built an automated PowerPoint deck generator as part of an ongoing internal-portal engagement.', outcome: 'Replaced the manual deck-creation process with automated generation.', demo: 'REPORT COMPOSER' },
  data: { client: 'BANK OF AMERICA / 2022', title: 'Make large datasets feel lightweight.', problem: 'Large financial datasets were slowing down the FX Options Risk trading workflow.', contribution: 'Applied virtualisation and memoisation, and built an RFQ instrument editor with React 18, TypeScript and Redux.', outcome: 'Reduced rendering times from seconds to milliseconds, improving the trader workflow.', demo: 'DATA WORKBENCH' },
};
let active = 'space';
let floorApi;
let floorLoading = false;
async function loadFloor() {
  if (floorApi || floorLoading) return;
  floorLoading = true;
  try { const module = await import('./space.js'); floorApi = module.createFloor($('floor')); floorApi.update(seatsFor($('arrangement').value), $('team').value); floorApi.setActive(active === 'space'); }
  catch { $('floor-fallback').hidden = false; $('view-reset').disabled = true; }
}
function chooseCase(key) {
  active = key;
  const item = cases[key];
  for (const [id, value] of Object.entries({ client:item.client, 'case-title':item.title, problem:item.problem, contribution:item.contribution, outcome:item.outcome, 'demo-title':item.demo })) $(id).textContent = value;
  document.querySelectorAll('[data-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === key)));
  for (const name of Object.keys(cases)) $(name + '-panel').hidden = name !== key;
  floorApi?.setActive(key === 'space');
  if (key === 'space') loadFloor();
  if (key === 'data') renderRows();
}
document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => chooseCase(button.dataset.case)));
function updateSeats() {
  const seats = seatsFor($('arrangement').value);
  $('distance').textContent = teamDistance(seats).toFixed(2);
  $('seat-list').replaceChildren(...seats.filter(seat => $('team').value === 'all' || seat.team === Number($('team').value)).map(seat => text('li', `Seat ${seat.id} · Row ${seat.z + 1}, column ${seat.x + 1} · ${teamNames[seat.team]}`)));
  floorApi?.update(seats, $('team').value);
}
$('arrangement').addEventListener('change', updateSeats); $('team').addEventListener('change', updateSeats);
$('view-reset').addEventListener('click', () => floorApi?.reset());

let report; let slide = 0;
function renderSlide() {
  $('slide-kicker').textContent = report.period.toUpperCase();
  $('slide-number').textContent = `0${slide + 1} / 03`;
  $('deck-status').textContent = `Slide ${slide + 1} of 3`;
  $('slide-prev').disabled = slide === 0; $('slide-next').disabled = slide === 2;
  $('slide-title').textContent = [report.title, 'Delivery at a glance', 'What comes next'][slide];
  const content = $('slide-content'); content.replaceChildren();
  if (slide === 0) content.append(text('p', 'A structured review, generated from one set of inputs.'));
  if (slide === 1) {
    const number = text('div', report.percent + '%'); number.className = 'big';
    const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); fill.style.width = report.percent + '%'; bar.append(fill);
    content.append(number, bar, text('p', `${report.completed} of ${report.planned} initiatives complete. ${report.planned - report.completed} remaining.`));
  }
  if (slide === 2) content.append(text('p', report.summary));
}
function generate() {
  if (!$('completed').value.trim() || !$('planned').value.trim()) { $('report-error').textContent = 'Enter both initiative counts.'; return; }
  try { report = makeReport({ title:$('report-title').value, period:$('period').value, completed:Number($('completed').value), planned:Number($('planned').value), summary:$('summary').value }); slide = 0; renderSlide(); $('report-error').textContent = ''; }
  catch(error) { $('report-error').textContent = error.message; }
}
$('generate').addEventListener('click', generate);
$('slide-prev').addEventListener('click', () => { slide--; renderSlide(); });
$('slide-next').addEventListener('click', () => { slide++; renderSlide(); });
for (const id of ['report-title','period','completed','planned','summary']) $(id).addEventListener('input', () => { $('deck-status').textContent = 'Inputs changed · generate to update'; });

let rows = filterInstruments('', 'all');
function renderRows() {
  const { start, end } = windowRange($('data-viewport').scrollTop, $('data-viewport').clientHeight || 350, rows.length);
  $('data-spacer').style.height = rows.length * 44 + 'px';
  $('data-rows').style.transform = `translateY(${start * 44}px)`;
  $('data-rows').replaceChildren(...rows.slice(start, end).map((row, index) => {
    const el = document.createElement('div'); el.className = 'data-row'; el.setAttribute('role','listitem'); el.setAttribute('aria-posinset', String(start + index + 1)); el.setAttribute('aria-setsize', String(rows.length));
    el.setAttribute('aria-label', `${row.id}, ${row.pair}, notional ${row.notional.toLocaleString('en-GB')}, ${row.status}`);
    el.append(...[row.id,row.pair,(row.notional / 1000000).toFixed(1)+'m',row.status].map(value => text('span',value))); return el;
  }));
  if (!rows.length) $('data-rows').append(text('p','No instruments match. Try another search.'));
  $('row-count').textContent = rows.length.toLocaleString('en-GB') + ' matching rows';
  $('render-count').textContent = (end - start) + ' rows mounted';
}
function search() { rows = filterInstruments($('search').value,$('currency').value); $('data-viewport').scrollTop = 0; renderRows(); }
$('search').addEventListener('input',search); $('currency').addEventListener('change',search);
$('data-viewport').addEventListener('scroll',renderRows,{passive:true});
updateSeats(); generate(); chooseCase('space');
window.addEventListener('pagehide',event => { if (!event.persisted) floorApi?.dispose(); });

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.textContent = ''; this.events = {}; this.attrs = {}; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
}
const text = el => el.textContent + el.children.map(text).join(' ');

test('visitor totals, country names and historical chart gaps render correctly', async () => {
  const html = fs.readFileSync(__dirname + '/dashboard.html', 'utf8');
  const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element('div')]));
  elements.period.value = '7'; elements.metric.value = 'views';
  const today = new Date().toISOString().slice(0, 10);
  const report = { days:7, total:12, day:[{label:today,count:12}], path:[{label:'/',count:12}], referrer:[], device:[], browser:[],
    daily_uniques:2, sessions:3, audience_views:6, country:[{label:'GB',count:1},{label:'Unknown',count:1}],
    unique_day:[{label:today,count:2}], audience_since:today+'T12:00:00+00:00', geo_available:true };
  const context = vm.createContext({ document:{getElementById:id=>elements[id], createElement:tag=>new Element(tag), createElementNS:(_,tag)=>new Element(tag), createTextNode:content=>{const el=new Element('text');el.textContent=content;return el;}},
    Intl, Date, fetch:async()=>({ok:true,json:async()=>report}) });
  vm.runInContext(fs.readFileSync(__dirname + '/dashboard.js','utf8'), context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(elements.uniques.textContent,'2');
  assert.equal(elements.sessions.textContent,'3');
  assert.equal(elements['views-per-visit'].textContent,'2.0');
  assert.match(text(elements.country),/United Kingdom/);
  elements.metric.value='unique'; elements.metric.events.change();
  assert.match(text(elements.day),/Not collected/);
  assert.equal(elements.chart.children[0].children.filter(el=>el.tag==='circle').length,1);
  report.audience_since=null; report.unique_day=[];
  elements.refresh.events.click(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(elements.uniques.textContent,'—');
  assert.equal(elements.chart.children[0].children.filter(el=>el.tag==='circle').length,0);
});

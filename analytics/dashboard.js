const status = document.getElementById('status');
let request = 0;
async function refresh() {
  const current = ++request;
  status.textContent = 'Loading…';
  try {
    const response = await fetch('/insights/stats?days=' + document.getElementById('period').value);
    if (!response.ok) throw Error('Unable to load data. Check your login and try again.');
    const data = await response.json();
    if (current !== request) return;
    document.getElementById('total').textContent = data.total.toLocaleString();
    for (const key of ['day', 'path', 'referrer', 'device', 'browser']) {
      const host = document.getElementById(key); host.replaceChildren();
      for (const item of data[key]) {
        const row = document.createElement('div'); row.className = 'row';
        const label = document.createElement('span'); label.textContent = item.label;
        const value = document.createElement('strong'); value.textContent = item.count.toLocaleString();
        row.append(label, value); host.append(row);
      }
      if (!data[key].length) { const empty = document.createElement('p'); empty.textContent = 'No visits recorded yet.'; host.append(empty); }
    }
    status.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch(error) { if (current === request) status.textContent = error.message; }
}
document.getElementById('period').addEventListener('change',refresh);
document.getElementById('refresh').addEventListener('click',refresh);
refresh();

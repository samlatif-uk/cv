/* First-party analytics. No cookies, browser storage, query strings or form data. Server estimates daily visitors and country; see analytics/README.md. */
(() => {
  if (!['samlatif.uk', 'www.samlatif.uk', 'react.samlatif.uk'].includes(location.hostname)) return;
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  let sent = false;
  function record() {
    if (sent || document.visibilityState !== 'visible') return;
    sent = true;
    let referrer = '';
    try { referrer = new URL(document.referrer).hostname; } catch { /* Direct visit. */ }
    fetch('/api/visit', {
      method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname, referrer }),
    }).catch(() => {});
    document.removeEventListener('visibilitychange', record);
  }
  document.addEventListener('visibilitychange', record);
  record();
})();

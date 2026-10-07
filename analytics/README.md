# First-party site analytics

The site loads `/visit.js`, posts to `/api/visit` on the same origin, and stores
daily aggregate counts in SQLite on the VPS. Betterlytics is removed.

## Dashboard

After deployment, open `https://samlatif.uk/insights/`. Username: `sam`.
Retrieve the generated password from the VPS using:

```sh
sudo cat /root/sam-analytics-login.txt
```

The password is generated once and retained through deployments. It is not
committed, embedded in the site, or printed in CI logs. The service uses its hash.
Use HTTPS. Browsers retain HTTP Basic credentials until the authenticated browser
session closes; there is no application logout button.

## Collected data and limits

- UTC day, one of the three known page paths, referring hostname, coarse device
  category and browser family; aggregate page-view counts only.
- No cookies, storage IDs, IP storage, precise timestamps, full user agents,
  referrer paths, query strings, form contents, or third-party requests.
- No claim of unique visitors, visitor names or geographical location.
- Respects Do Not Track and Global Privacy Control. Ignores known bot user agents.
- Local previews are not tracked. No history is imported from Betterlytics.
- Only the last 90 UTC days are retained; cleanup runs on the next recorded view.
- Origin checks and nginx rate limits deter abuse, but counts can still be
  spoofed or undercounted by blockers. Rate limiting uses IPs transiently in nginx
  memory. Existing general web-server access logs are separate from analytics.

## Operations

The deployment workflow runs `install.sh` before syncing the public files. It
requires root, Python 3 with SQLite, nginx and systemd. It creates an isolated
`sam-analytics` service user, binds Python to `127.0.0.1:4180`, and adds proxy
locations to enabled vhosts matching the configured apex and React web roots.
Existing nginx configurations are backed up and validated before reload.
If the vhost layout differs, installation stops with the missing root reported.

Data lives in `/var/lib/sam-analytics/views.sqlite`, outside public web roots.
Use SQLite's backup API for a consistent backup; copying a live database without
its WAL is unsafe. Inspect service health with `systemctl status sam-analytics`.

Run tests: `python3 analytics/test_server.py`. The dashboard is served directly
by Python; it is not included in the public Vite build.

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

## Collected data and metrics

- Page views retain the existing daily page, referrer, device and browser aggregates.
- **Daily unique visitors** are estimates deduplicated by a SHA-256 HMAC of the
  network address and user agent with a random salt that rotates each UTC day.
  Raw IP addresses and full user agents are processed in memory, never stored.
  Daily pseudonymous hashes are retained for at most 90 days. The prior day's
  salt and last-seen times are removed on the next recorded view.
- **Visitor-days** sum daily unique estimates over the selected range. They are
  not distinct people across that range. Shared networks, changed browsers and
  VPNs can merge or split estimates. No names or persistent browser IDs are collected.
- **Visits** start after at least 30 minutes without a recorded page view, or at
  UTC midnight. These are estimates, not browser sessions. Views per visit uses
  only page views with a visitor estimate.
- **Location** is an approximate country from a local DB-IP Country Lite MMDB.
  No visitor addresses are sent to a geolocation service; no GPS is requested.
  Unknown/private IPs, missing databases and older data are not assigned a country.
- Existing view history is preserved. Unique/location history is not backfilled;
  the dashboard states when collection began and how many views have estimates.
- No cookies or browser storage IDs, referrer paths, query strings or form data.
  Do Not Track, Global Privacy Control and known-bot exclusions remain active.
- Only production hosts are tracked. Counts can be spoofed or blocked.
- nginx overwrites `X-Analytics-IP` with `$remote_addr`. The service must remain
  loopback-only. Never use an arbitrary client-supplied forwarding header. If a
  CDN is added, configure nginx real-IP handling only for that CDN's trusted
  network ranges first; otherwise estimates will describe the proxy.

## Country database

Installation requires Debian/Ubuntu's `python3-maxminddb` package and downloads
DB-IP's current monthly Country Lite database (with the
[sapics DB-IP mirror](https://github.com/sapics/ip-location-db) as a fallback for
blocked downloads) to
`/var/lib/sam-analytics/country.mmdb`. A monthly cron job refreshes it on the 3rd
and restarts the service. Downloads are validated and atomically replaced; a
failed update preserves the previous database. An initial failure is visible as
"Country database unavailable" on the dashboard; other metrics still work.
To retry: `sudo python3 /opt/sam-analytics/update_geo.py` then
`sudo systemctl restart sam-analytics`.

Data is provided by [DB-IP](https://db-ip.com/db/download/ip-to-country-lite)
under CC BY 4.0. The dashboard includes attribution. Local lookup has reduced
coverage/accuracy and VPNs can change the apparent country.

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

Dashboard rendering regression test: `node analytics/test_dashboard.cjs`.

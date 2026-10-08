# Sam Latif — personal site

[![Deploy React site to VPS](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml/badge.svg)](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml)

The primary site is a React CV and portfolio for Sam Latif, a senior fullstack consultant working across frontend engineering, product delivery and UX.

## Site map

- `/` — CV landing page, experience, technical skills, recommendations and education.
- `/lab/` — Career Atlas: a Three.js map of engagements connected by shared skills.
- `/lab/stories/` — Work in Practice: illustrative demos covering spatial planning, report automation and large-data interfaces.
- `/insights/` — Private first-party analytics dashboard, installed on the VPS.

The interactive pages use the same black, gold and warm-ivory visual system as the CV. Case-study demonstrations use synthetic data and are labelled as recreations; they do not expose client software or confidential information.

## Local development

```bash
cd react.samlatif.uk
npm install
npm run dev              # React CV
npm run dev:lab          # Lab pages
npm run test:lab         # Atlas and demo data tests
npm run build            # CV plus /lab/ and /lab/stories/ production build
```

Role and recommendation content comes from `shared/cv-data.json`. Three.js and company marks are bundled locally. See `react.samlatif.uk/lab/LOGOS.md` for logo attribution.

## First-party analytics

`analytics/` contains a Python and SQLite service used by the VPS. It reports page views, estimated daily unique visitors, visits after 30 minutes of inactivity, views per visit, and approximate countries. Country lookups use a local DB-IP database. Daily salted visitor hashes expire after 90 days; no raw IP addresses, cookies, browser storage IDs, query strings or form data are stored. Do Not Track and Global Privacy Control are respected. Multi-day unique totals are labelled visitor-days, and historical data is not backfilled. See [analytics documentation](analytics/README.md) for definitions and setup.

```bash
python3 analytics/test_server.py
```

The service binds to loopback and is proxied by nginx. The installer creates the `sam-analytics` systemd service, generates dashboard credentials once, and saves them outside the web root at `/root/sam-analytics-login.txt`. The dashboard is available at `https://samlatif.uk/insights/` after deployment.

## Deployment

`.github/workflows/deploy-react-vps.yml` builds the React site and syncs the complete output to the React and apex web roots. It also installs first-party analytics and validates nginx before reloading it. Required secrets are `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` and `VPS_DEPLOY_PATH`; `VPS_PORT` and `STATIC_DEPLOY_PATH` are optional.

The pull-request build check runs TypeScript, analytics integration tests, atlas/demo tests and the full production build on Ubuntu.

## Other app

`network.samlatif.uk/` is the separate Craftfolio network app (Next.js, Prisma and SQLite), developed independently from the public CV and lab pages.

## Contact

hello@samlatif.uk

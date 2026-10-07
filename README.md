# CV — samlatif.uk

[![Deploy React site to VPS](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml/badge.svg)](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml)

A minimal personal CV / portfolio website for Sam Latif.

## Contents

- `react.samlatif.uk/` — the primary site, built with React, Vite and TypeScript. Includes the CV, career atlas at `/lab/`, and case studies at `/lab/stories/`.
- `network.samlatif.uk/` — Craftfolio network app (Next.js + Prisma + SQLite).

## Usage

### React site

- To run the React version locally:

  ```bash
  cd react.samlatif.uk
  npm install
  npm run dev
  ```

### Network Version

- To run the network app locally:

  ```bash
  cd network.samlatif.uk
  npm install
  npm run db:reset
  npm run dev
  ```

## Deploy

- Live site: https://samlatif.uk (deployed)
- The same React build also serves https://react.samlatif.uk

### React VPS Auto Deploy (GitHub Actions)

- Workflow file: `.github/workflows/deploy-react-vps.yml`
- Trigger: push to `main` when React, shared data/assets, or workflow files change
- The complete React build (including `/lab/`) is synced to both domain roots. The vanilla homepage is retired.
- Required GitHub repository secrets:
  - `VPS_HOST` (example: `your-server.example.com`)
  - `VPS_USER` (example: `deploy`)
  - `VPS_SSH_KEY` (private SSH key for the VPS user)
  - `VPS_DEPLOY_PATH` (example: `/var/www/your-site`)
  - `VPS_PORT` (optional, default `22`)

### One-time VPS Setup (Nginx)

Before running setup, ensure DNS has an `A` record:

- Host: `react`
- Value: `$VPS_HOST`

Run the bootstrap script directly on the VPS:

```bash
scp scripts/bootstrap-react-vps.sh "$VPS_USER@$VPS_HOST:/tmp/"
ssh "$VPS_USER@$VPS_HOST" "chmod +x /tmp/bootstrap-react-vps.sh && /tmp/bootstrap-react-vps.sh react.example.com $VPS_DEPLOY_PATH hello@example.com"
```

Manual equivalent:

```bash
sudo apt update
sudo apt install -y nginx
sudo mkdir -p "$VPS_DEPLOY_PATH"
```

Create `/etc/nginx/sites-available/react.samlatif.uk`:

```nginx
server {
  listen 80;
  server_name react.example.com;

  root /var/www/your-site;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/react.samlatif.uk /etc/nginx/sites-enabled/react.samlatif.uk
sudo nginx -t
sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d react.example.com
```

## Contact

- Email: hello@samlatif.uk

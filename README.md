# CV — samlatif.uk

[![Deploy React site to VPS](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml/badge.svg)](https://github.com/samlatif-uk/cv/actions/workflows/deploy-react-vps.yml)

A minimal personal CV / portfolio website for Sam Latif.

## Contents

- `index.html` — the site homepage (static HTML).
- `react.samlatif.uk/` — a modern React mirror of the CV, built with Vite and TypeScript.

## Usage

### Static HTML Version

- To view locally, open `index.html` in your browser or run a simple HTTP server:

  ```bash
  python3 -m http.server
  ```

### React Version

- To run the React version locally:

  ```bash
  cd react.samlatif.uk
  npm install
  npm run dev
  ```

## Deploy

- Live site: https://samlatif.uk (deployed)
- React version intended for: https://react.samlatif.uk

### React VPS Auto Deploy (GitHub Actions)

- Workflow file: `.github/workflows/deploy-react-vps.yml`
- Trigger: push to `main` when React, static site, shared data/assets, or workflow files change
- Required GitHub repository secrets:
  - `VPS_HOST` (example: `79.99.45.146`)
  - `VPS_USER` (example: `root`)
  - `VPS_SSH_KEY` (private SSH key for the VPS user)
  - `VPS_DEPLOY_PATH` (example: `/var/www/react.samlatif.uk`)
  - `VPS_PORT` (optional, default `22`)

### One-time VPS Setup (Nginx)

Before running setup, ensure DNS has an `A` record:

- Host: `react`
- Value: `79.99.45.146`

Run the bootstrap script directly on the VPS:

```bash
scp scripts/bootstrap-react-vps.sh root@79.99.45.146:/root/
ssh root@79.99.45.146 "chmod +x /root/bootstrap-react-vps.sh && /root/bootstrap-react-vps.sh react.samlatif.uk /var/www/react.samlatif.uk hello@samlatif.uk"
```

Manual equivalent:

```bash
sudo apt update
sudo apt install -y nginx
sudo mkdir -p /var/www/react.samlatif.uk
```

Create `/etc/nginx/sites-available/react.samlatif.uk`:

```nginx
server {
  listen 80;
  server_name react.samlatif.uk;

  root /var/www/react.samlatif.uk;
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
sudo certbot --nginx -d react.samlatif.uk
```

## Contact

- Email: hello@samlatif.uk

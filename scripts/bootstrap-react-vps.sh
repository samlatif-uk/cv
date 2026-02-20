#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-react.samlatif.uk}"
DEPLOY_PATH="${2:-/var/www/react.samlatif.uk}"
EMAIL="${3:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0 [domain] [deploy_path] [email]"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

mkdir -p "${DEPLOY_PATH}"
chown -R www-data:www-data "${DEPLOY_PATH}"
chmod -R 755 "${DEPLOY_PATH}"

SITE_CONF="/etc/nginx/sites-available/${DOMAIN}"
SITE_LINK="/etc/nginx/sites-enabled/${DOMAIN}"

cat > "${SITE_CONF}" <<EOF
server {
  listen 80;
  server_name ${DOMAIN};

  root ${DEPLOY_PATH};
  index index.html;

  location / {
    try_files \$uri /index.html;
  }
}
EOF

if [[ ! -L "${SITE_LINK}" ]]; then
  ln -s "${SITE_CONF}" "${SITE_LINK}"
fi

if [[ -e "/etc/nginx/sites-enabled/default" ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable nginx
systemctl reload nginx

if [[ -n "${EMAIL}" ]]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi

systemctl reload nginx

echo "Bootstrap complete for ${DOMAIN}"
echo "Web root: ${DEPLOY_PATH}"

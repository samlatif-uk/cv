#!/usr/bin/env bash
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo 'Run analytics installation as root.'; exit 1; }
command -v python3 >/dev/null
command -v nginx >/dev/null
SOURCE="$(cd "$(dirname "$0")" && pwd)"
APEX_ROOT="${1:-/var/www/samlatif.uk}"
REACT_ROOT="${2:-/var/www/react.samlatif.uk}"
id sam-analytics >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin sam-analytics
install -d -m 755 /opt/sam-analytics /etc/nginx/snippets
install -m 644 "$SOURCE"/server.py "$SOURCE"/dashboard.html "$SOURCE"/dashboard.js "$SOURCE"/dashboard.css /opt/sam-analytics/
if [[ ! -f /etc/sam-analytics.env ]]; then
  python3 - <<'PY'
import hashlib, os, secrets
password = secrets.token_urlsafe(32)
for path, content in [('/etc/sam-analytics.env', 'ANALYTICS_PASSWORD_SHA256=' + hashlib.sha256(password.encode()).hexdigest() + '\n'), ('/root/sam-analytics-login.txt', 'Dashboard: https://samlatif.uk/insights/\nUsername: sam\nPassword: ' + password + '\n')]:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write(content)
PY
fi
install -m 644 "$SOURCE/sam-analytics.service" /etc/systemd/system/sam-analytics.service
systemctl daemon-reload
systemctl enable --now sam-analytics
systemctl restart sam-analytics
python3 - <<'PY'
import time, urllib.request
for attempt in range(10):
    try:
        with urllib.request.urlopen('http://127.0.0.1:4180/health', timeout=2) as response:
            assert response.status == 200
        break
    except Exception:
        if attempt == 9: raise
        time.sleep(1)
PY
install -m 644 "$SOURCE/nginx.conf" /etc/nginx/snippets/sam-analytics.conf
cat > /etc/nginx/conf.d/sam-analytics-limits.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=sam_views:1m rate=30r/m;
limit_req_zone $binary_remote_addr zone=sam_dashboard:1m rate=30r/m;
EOF
# Add the snippet only to vhosts with the two explicitly supplied site roots.
# Existing TLS and routing directives remain intact; validate before reloading.
python3 - "$APEX_ROOT" "$REACT_ROOT" <<'PY'
import pathlib, re, subprocess, sys
roots = set(sys.argv[1:])
changed = {}
found = set()
try:
    for link in pathlib.Path('/etc/nginx/sites-enabled').iterdir():
        path = link.resolve()
        if not path.is_file() or path in changed: continue
        original = path.read_text()
        def insert(match):
            root = match.group(2).strip('"\'')
            if root not in roots: return match.group(0)
            found.add(root)
            return match.group(0) + '\n' + match.group(1) + 'include /etc/nginx/snippets/sam-analytics.conf;'
        if 'include /etc/nginx/snippets/sam-analytics.conf;' in original:
            for root in roots:
                if re.search(r'\broot\s+["\']?' + re.escape(root) + r'["\']?\s*;', original): found.add(root)
            continue
        updated = re.sub(r'(?m)^(\s*)root\s+([^;]+);', insert, original)
        if updated != original:
            changed[path] = original
            backup = path.with_name(path.name + '.pre-analytics')
            if not backup.exists(): backup.write_text(original)
            path.write_text(updated)
    if not roots.issubset(found):
        raise RuntimeError('Could not find enabled nginx vhosts for: ' + ', '.join(roots - found))
    subprocess.run(['nginx', '-t'], check=True)
except Exception:
    for path, original in changed.items(): path.write_text(original)
    raise
PY
systemctl reload nginx
echo 'Analytics installed. Dashboard credentials are in /root/sam-analytics-login.txt (not printed to deployment logs).'

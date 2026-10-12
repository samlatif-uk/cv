#!/usr/bin/env bash
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo 'Install as root.'; exit 1; }
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
command -v python3 >/dev/null
command -v nginx >/dev/null
python3 -m unittest discover -s "$SOURCE" -p 'test_*.py'
id sam-trading >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin sam-trading
install -d -m 755 /opt/sam-trading /opt/sam-trading/static /etc/nginx/snippets
install -d -o sam-trading -g sam-trading -m 700 /var/lib/sam-trading
# A consistent pre-upgrade database backup remains outside every web root.
if [[ -f /var/lib/sam-trading/trading.sqlite3 ]]; then
  python3 - <<'PY'
import sqlite3,time
source=sqlite3.connect('/var/lib/sam-trading/trading.sqlite3')
target=sqlite3.connect('/var/lib/sam-trading/backup-'+str(int(time.time()))+'.sqlite3')
source.backup(target)
target.close();source.close()
PY
fi
install -m 644 "$SOURCE/server.py" "$SOURCE/engine.py" /opt/sam-trading/
install -m 644 "$SOURCE"/static/* /opt/sam-trading/static/
if [[ ! -f /etc/sam-trading.env ]]; then
  python3 - <<'PY'
import hashlib,os,secrets
password=secrets.token_urlsafe(32)
files={'/etc/sam-trading.env':'TRADING_PASSWORD_SHA256='+hashlib.sha256(password.encode()).hexdigest()+'\n',
       '/root/sam-trading-login.txt':'Dashboard: https://samlatif.uk/trading/\nPassword: '+password+'\n'}
for path,content in files.items():
    with os.fdopen(os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as f: f.write(content)
PY
fi
install -m 644 "$SOURCE/deploy/sam-trading.service" /etc/systemd/system/sam-trading.service
systemctl daemon-reload
systemctl enable sam-trading
systemctl restart sam-trading
python3 - <<'PY'
import time,urllib.request
for attempt in range(15):
    try:
        with urllib.request.urlopen('http://127.0.0.1:4181/health',timeout=2) as r: assert r.status==200
        break
    except Exception:
        if attempt==14: raise
        time.sleep(1)
PY
# Preserve the existing TLS and vhosts. Roll back nginx edits if validation fails.
python3 - "$SOURCE" <<'PY'
import pathlib,re,subprocess,sys
source=pathlib.Path(sys.argv[1]); changed={}
def write(path,text):
    changed[path]=path.read_text() if path.exists() else None
    path.write_text(text)
try:
    write(pathlib.Path('/etc/nginx/snippets/sam-trading.conf'),(source/'deploy/nginx.conf').read_text())
    write(pathlib.Path('/etc/nginx/conf.d/sam-trading-limits.conf'),'limit_req_zone $binary_remote_addr zone=sam_trading:1m rate=60r/m;\n')
    found=False
    for link in pathlib.Path('/etc/nginx/sites-enabled').iterdir():
        path=link.resolve()
        if not path.is_file(): continue
        text=path.read_text()
        if not re.search(r'\broot\s+["\']?/var/www/samlatif\.uk["\']?\s*;',text): continue
        found=True
        if 'include /etc/nginx/snippets/sam-trading.conf;' not in text:
            updated=re.sub(r'(?m)^(\s*root\s+["\']?/var/www/samlatif\.uk["\']?\s*;)',r'\1\n    include /etc/nginx/snippets/sam-trading.conf;',text)
            backup=path.with_name(path.name+'.pre-trading')
            if not backup.exists(): backup.write_text(text)
            write(path,updated)
    if not found: raise RuntimeError('Apex nginx web root not found; no public route installed')
    subprocess.run(['nginx','-t'],check=True)
except Exception:
    for path,text in changed.items():
        if text is None: path.unlink(missing_ok=True)
        else: path.write_text(text)
    raise
PY
systemctl reload nginx
python3 "$SOURCE/deploy/smoke.py"
echo 'Paper trading installed, paused. Password: /root/sam-trading-login.txt (not printed).'

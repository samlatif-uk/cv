"""Exercise the real nginx snippet in CI, without touching the system config."""
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.request
import urllib.error

with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    (root / '.git').mkdir()
    (root / '.git/HEAD').write_text('private metadata')
    (root / '.well-known/acme-challenge').mkdir(parents=True)
    (root / '.well-known/acme-challenge/test').write_text('challenge')
    (root / 'index.html').write_text('<html>site</html>')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    snippet = pathlib.Path(__file__).with_name('nginx.conf').resolve()
    config = root / 'nginx.conf'
    config.write_text(f"""daemon off;
error_log {root}/error.log;
pid {root}/nginx.pid;
events {{}}
http {{
 access_log off;
 limit_req_zone $binary_remote_addr zone=sam_views:1m rate=30r/m;
 limit_req_zone $binary_remote_addr zone=sam_dashboard:1m rate=30r/m;
 limit_req_zone $binary_remote_addr zone=sam_login:1m rate=5r/m;
 server {{
  listen 127.0.0.1:{port};
  root {root};
  include {snippet};
  location / {{ try_files $uri $uri/ /index.html; }}
 }}
}}
""")
    subprocess.run(['nginx', '-t', '-c', str(config), '-p', str(root)], check=True)
    process = subprocess.Popen(['nginx', '-c', str(config), '-p', str(root)])
    try:
        for attempt in range(30):
            try:
                response = urllib.request.urlopen(f'http://127.0.0.1:{port}/', timeout=1)
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('nginx did not start')
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
        assert "script-src 'self'" in response.headers['Content-Security-Policy']
        for path in ('/.git/HEAD', '/.git/config', '/.env', '/assets/.git/index', '/insights/.git/config', '/%2egit/HEAD'):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=2)
                raise AssertionError('Private path exposed: ' + path)
            except urllib.error.HTTPError as error:
                assert error.code == 404, (path, error.code)
        assert urllib.request.urlopen(f'http://127.0.0.1:{port}/.well-known/acme-challenge/test').read() == b'challenge'
        print('nginx security regression checks passed')
    finally:
        process.terminate()
        process.wait(timeout=5)

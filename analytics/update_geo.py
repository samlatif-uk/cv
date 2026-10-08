"""Download the monthly DB-IP Country Lite database; preserve old data on failure."""
import datetime as dt
import gzip
import os
from pathlib import Path
import shutil
import tempfile
import urllib.request
import maxminddb


def update(destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    month = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m')
    url = f'https://download.db-ip.com/free/dbip-country-lite-{month}.mmdb.gz'
    temporary = None
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            with gzip.GzipFile(fileobj=response) as source:
                with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as target:
                    temporary = Path(target.name)
                    shutil.copyfileobj(source, target)
        with maxminddb.open_database(str(temporary)) as reader:
            if 'country' not in reader.metadata().database_type.lower():
                raise ValueError('Expected a country database')
        os.chmod(temporary, 0o644)
        temporary.replace(destination)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


if __name__ == '__main__':
    update('/var/lib/sam-analytics/country.mmdb')

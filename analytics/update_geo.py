"""Download the monthly DB-IP Country Lite database; preserve old data on failure."""
import datetime as dt
import gzip
import os
from pathlib import Path
import shutil
import tempfile
import urllib.request

MIRROR = 'https://github.com/sapics/ip-location-db/releases/download/latest/dbip-country.mmdb'

def validate(path):
    import maxminddb
    with maxminddb.open_database(str(path)) as reader:
        if 'country' not in reader.metadata().database_type.lower():
            raise ValueError('Expected a country database')
        record = reader.get('8.8.8.8') or {}
        code = record.get('country', {}).get('iso_code') or record.get('country_code')
        if not isinstance(code, str) or len(code) != 2 or not code.isupper():
            raise ValueError('Country database lookup failed validation')


def update(destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    month = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m')
    url = f'https://download.db-ip.com/free/dbip-country-lite-{month}.mmdb.gz'
    errors = []
    for source_url, compressed in ((url, True), (MIRROR, False)):
        temporary = None
        try:
            request = urllib.request.Request(source_url, headers={'User-Agent': 'SamLatif-Analytics/1.0'})
            with urllib.request.urlopen(request, timeout=60) as response:
                source = gzip.GzipFile(fileobj=response) if compressed else response
                with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as target:
                    temporary = Path(target.name)
                    shutil.copyfileobj(source, target)
            validate(temporary)
            os.chmod(temporary, 0o644)
            temporary.replace(destination)
            print('Country database installed from ' + source_url)
            return
        except Exception as error:
            errors.append(f'{source_url}: {error}')
        finally:
            if temporary and temporary.exists():
                temporary.unlink()
    raise RuntimeError('Country database update failed; existing file preserved. ' + '; '.join(errors))


if __name__ == '__main__':
    update('/var/lib/sam-analytics/country.mmdb')

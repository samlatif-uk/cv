import io
import gzip
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
from urllib.error import HTTPError
from update_geo import update, MIRROR
from server import GeoLocation


class GeoUpdateTests(unittest.TestCase):
    def test_forbidden_primary_uses_mirror(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'country.mmdb'
            with patch('update_geo.urllib.request.urlopen', side_effect=[HTTPError('primary',403,'Forbidden',{},None), io.BytesIO(b'mirror-db')]) as fetch, patch('update_geo.validate') as validate:
                update(path)
                self.assertEqual(path.read_bytes(), b'mirror-db')
                self.assertEqual(fetch.call_args.args[0].full_url, MIRROR)
                validate.assert_called_once()

    def test_primary_gzip(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'country.mmdb'
            with patch('update_geo.urllib.request.urlopen', return_value=io.BytesIO(gzip.compress(b'primary-db'))), patch('update_geo.validate'):
                update(path)
                self.assertEqual(path.read_bytes(), b'primary-db')

    def test_invalid_download_preserves_previous_database(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'country.mmdb'
            path.write_bytes(b'old-db')
            with patch('update_geo.urllib.request.urlopen', side_effect=[io.BytesIO(gzip.compress(b'invalid')),io.BytesIO(b'invalid')]), patch('update_geo.validate', side_effect=ValueError('invalid')):
                with self.assertRaises(RuntimeError): update(path)
            self.assertEqual(path.read_bytes(),b'old-db')
            self.assertEqual(list(Path(folder).iterdir()),[path])

    def test_both_country_schemas(self):
        geo = GeoLocation('/missing.mmdb')
        geo.reader = Mock()
        for record in ({'country':{'iso_code':'GB'}},{'country_code':'GB'}):
            geo.reader.get.return_value = record
            self.assertEqual(geo.country('8.8.8.8'),'GB')

if __name__ == '__main__': unittest.main()

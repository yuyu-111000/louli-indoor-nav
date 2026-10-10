"""Back up the live local database and record checksums without exposing feedback."""
import hashlib
import json
from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from urllib.request import build_opener, ProxyHandler

ROOT = Path(__file__).resolve().parents[1]
client = build_opener(ProxyHandler({}))


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def summary(connection):
    return {table: digest(connection.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall())
            for table in ('venues', 'feedback')}


if __name__ == '__main__':
    with client.open('http://127.0.0.1:8791/index.html') as response:
        assert response.read() == (ROOT/'frontend/index.html').read_bytes(), 'Port 8791 serves a different frontend'
    with client.open('http://127.0.0.1:8791/api/v1/venues/yintai-demo/bundle') as response:
        live = json.load(response)
    with sqlite3.connect((ROOT/'backend/runtime/demo.sqlite').as_uri()+'?mode=ro', uri=True) as source:
        stored = json.loads(source.execute('SELECT bundle FROM venues WHERE id=?', ('yintai-demo',)).fetchone()[0])
        assert stored['map'] == live['map'], 'Live database does not match the expected runtime database'
        directory = ROOT/'backend/runtime/backups'
        directory.mkdir(parents=True, exist_ok=True)
        path = directory/('demo-before-single-floor-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.sqlite')
        assert not path.exists()
        with sqlite3.connect(path) as target:
            source.backup(target)
            assert target.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
            assert summary(source)==summary(target)
        print('Verified database backup: '+str(path))
        print('Current default source: '+str(live['venue']['source']))
        print('Current default has photo trace: '+str(bool(live['map'].get('trace'))))

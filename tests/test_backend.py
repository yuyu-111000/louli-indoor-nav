import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SERVER = Path(__file__).resolve().parents[1] / 'backend' / 'server.py'
server = None
if SERVER.exists():
    spec = importlib.util.spec_from_file_location('louli_server', SERVER)
    server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(server)


def fixture():
    return {'schemaVersion': 1, 'venue': {'id': 'test-hospital', 'name': '测试医院', 'type': 'hospital', 'source': 'synthetic'},
            'map': {'width': 20, 'height': 20, 'resolution': .5, 'start': {'x': 10, 'y': 18},
                    'corridors': [[8, 0, 12, 19]], 'rooms': [{'id': 'room1', 'x0': 0, 'y0': 3, 'x1': 8, 'y1': 9, 'dx': 8, 'dy': 6, 'ix': -1, 'iy': 0}],
                    'fountain': {'x': 10, 'y': 1, 'r': .1}, 'escalator': [10, 2, 11, 3], 'entrances': [{'x': 10, 'y': 18, 't': '入口', 'a': '↑'}]},
            'catalog': {'title': '医院', 'sub': '演示', 'unit': '人', 'cats': {'clinic': ['诊室', '＋', 0]}, 'chips': [['clinic', '门诊']], 'favs': ['room1'], 'sample': {'poi': 'room1', 'num': 'A001'}, 'poi': {'room1': {'n': '内科', 's': '普通门诊', 'c': 'clinic', 'q': [2, 3, '人']}}},
            'flow': {'phases': [['room1']], 'labels': ['门诊']}, 'queues': [{'poiId': 'room1', 'ahead': 2, 'minutesPerPerson': 3, 'unit': '人'}]}


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(server, 'backend/server.py must implement the requested service')

    def test_accepts_location_with_explicit_simulated_indoor_status(self):
        b = fixture()
        b['venue']['indoorStatus'] = 'demo_simulated'
        b['venue']['location'] = {'crs': 'WGS84', 'lat': 30.3018106, 'lon': 120.1028555, 'address': '丰潭路380号', 'mapUrl': 'https://www.openstreetmap.org/?mlat=30.3018106&mlon=120.1028555', 'dataStatus': 'outdoor_anchor_real_osm', 'distanceStraightM': 1551, 'anchorId': 'MALL-YINTAI'}
        saved = server.validate_bundle(b)
        self.assertEqual(saved['venue']['location']['crs'], 'WGS84')

    def test_rejects_invalid_location_and_unlabelled_indoor_geometry(self):
        b = fixture(); b['venue']['indoorStatus'] = 'demo_simulated'
        b['venue']['location'] = {'crs': 'WGS84', 'lat': 30, 'lon': 120, 'address': '示例', 'mapUrl': 'https://www.openstreetmap.org/', 'dataStatus': 'outdoor_anchor_real_osm', 'distanceStraightM': 1551, 'anchorId': 'MALL-YINTAI'}
        mutations = [lambda b: b['venue']['location'].update(dataStatus={}), lambda b: b['venue']['location'].update(mapUrl='https://[broken'), lambda b: b['venue']['location'].update(lat=91), lambda b: b['venue']['location'].update(lon=True), lambda b: b['venue']['location'].update(mapUrl='javascript:alert(1)'), lambda b: b['venue']['location'].update(crs='GCJ02'), lambda b: b['venue'].pop('indoorStatus')]
        for mutate in mutations:
            bad = copy.deepcopy(b); mutate(bad)
            with self.assertRaises(server.ValidationError): server.validate_bundle(bad)

    def test_nearby_catalog_preserves_anchor_status_and_recomputes_distance(self):
        origin = {'id': 'ZJU-ZJG', 'name': '紫金港', 'lat': 30.3061419, 'lon': 120.0875012}
        venue = {'id': 'MALL-YINTAI', 'name': '城西银泰', 'category': 'mall', 'address': '丰潭路380号', 'lat': 30.3018106, 'lon': 120.1028555, 'data_status': 'outdoor_anchor_real_osm', 'map_url': 'https://www.openstreetmap.org/', 'distance_straight_m': 0}
        data = server.validate_nearby({'schemaVersion': 1, 'crs': 'WGS84', 'origin': origin, 'venues': [venue]})
        self.assertAlmostEqual(data['venues'][0]['distance_straight_m'], 1551, delta=3)
        self.assertEqual(data['venues'][0]['data_status'], 'outdoor_anchor_real_osm')
        venue['map_url'] = 'data:text/html,<script>'
        with self.assertRaises(server.ValidationError): server.validate_nearby({'schemaVersion': 1, 'crs': 'WGS84', 'origin': origin, 'venues': [venue]})

    def test_accepts_complete_bundle(self):
        self.assertEqual(server.validate_bundle(fixture())['venue']['id'], 'test-hospital')

    def test_accepts_fractional_room_geometry_boundary_entrances_and_all_chip(self):
        b = fixture()
        b['map']['rooms'][0].update(x1=8.5, dx=8.5, dy=6.25)
        b['map']['entrances'][0].update(y=20)
        b['catalog']['chips'].insert(0, ['all', '全部'])
        self.assertEqual(server.validate_bundle(b)['map']['rooms'][0]['dx'], 8.5)

    def test_accepts_original_catalog_flow_and_normalizes_top_level_flow(self):
        b = fixture()
        b['catalog']['flow'] = b.pop('flow')
        self.assertEqual(server.validate_bundle(b)['catalog']['flow']['labels'], ['门诊'])
        b = fixture()
        self.assertEqual(server.validate_bundle(b)['catalog']['flow']['labels'], ['门诊'])

    def test_large_integer_and_malformed_optional_content_fail_validation(self):
        b = fixture(); b['queues'][0]['ahead'] = 10 ** 1000
        with self.assertRaises(server.ValidationError):
            server.validate_bundle(b)
        b = fixture(); b['catalog']['poi']['room1']['docs'] = [123]
        with self.assertRaises(server.ValidationError):
            server.validate_bundle(b)

    def test_fractional_target_inside_grid_boundary_is_accepted(self):
        b = fixture()
        b['map']['rooms'][0].update(x0=14, x1=20, dx=16.75, ix=1)
        self.assertEqual(server.validate_bundle(b)['map']['rooms'][0]['dx'], 16.75)

    def test_non_utf8_surrogate_text_is_rejected(self):
        b = fixture(); b['venue']['name'] = '\ud800'
        with self.assertRaises(server.ValidationError):
            server.validate_bundle(b)

    def test_rejects_unsafe_sizes_references_and_numbers(self):
        mutations = [lambda b: b['map'].update(width=301), lambda b: b['map'].update(resolution=.2),
                     lambda b: b['venue'].update(id='../escape'), lambda b: b['catalog']['poi'].clear(),
                     lambda b: b['catalog']['favs'].append('missing'), lambda b: b['queues'][0].update(ahead=-1),
                     lambda b: b['queues'][0].update(ahead=1.5), lambda b: b['queues'][0].update(minutesPerPerson=float('inf')),
                     lambda b: b['map']['rooms'][0].update(ix=-100), lambda b: b['map']['start'].update(x=19, y=19),
                     lambda b: b['venue'].update(name='x' * 2001), lambda b: b.update(unexpected=True), lambda b: b.update(flow=None)]
        for mutate in mutations:
            b = fixture(); mutate(b)
            with self.subTest(bundle=b), self.assertRaises(server.ValidationError):
                server.validate_bundle(b)


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(server, 'backend/server.py must implement the requested service')
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / 'data').mkdir(); (self.root / 'frontend').mkdir()
        (self.root / 'data' / 'seed.json').write_text(json.dumps(fixture()), encoding='utf-8')
        (self.root / 'frontend' / 'index.html').write_text('<h1>Louli</h1>')
        (self.root / 'secret.txt').write_text('PRIVATE')
        self.db = self.root / 'demo.sqlite'
        self.httpd = server.create_server('127.0.0.1', 0, self.db, self.root / 'data', self.root / 'frontend')
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True); self.thread.start()
        self.url = 'http://127.0.0.1:' + str(self.httpd.server_port)

    def test_nearby_catalog_endpoint_and_located_mall_import(self):
        source = SERVER.parent.parent / 'data'
        context = self.root / 'data' / 'context'; context.mkdir()
        (context / 'nearby-venues.json').write_bytes((source / 'context' / 'nearby-venues.json').read_bytes())
        status, data = self.request('/api/v1/nearby-venues')
        self.assertEqual(status, 200); self.assertEqual(len(data['venues']), 6)
        mall = json.loads((source / 'yintai-demo.json').read_text())
        status, _ = self.request('/api/v1/imports', 'POST', mall)
        self.assertEqual(status, 201)
        status, saved = self.request('/api/v1/venues/yintai-demo/bundle')
        self.assertEqual(saved['venue']['location'], mall['venue']['location'])
        self.assertEqual(saved['venue']['indoorStatus'], 'demo_simulated')
        (context / 'nearby-venues.json').write_text('{}')
        status, _ = self.request('/api/v1/nearby-venues')
        self.assertEqual(status, 422)

    def tearDown(self):
        if hasattr(self, 'httpd'):
            self.httpd.shutdown(); self.httpd.server_close(); self.thread.join(); self.tmp.cleanup()

    def request(self, path, method='GET', payload=None, raw=None):
        body = raw if raw is not None else json.dumps(payload).encode() if payload is not None else None
        req = Request(self.url + path, data=body, method=method, headers={'Content-Type': 'application/json'})
        try:
            response = urlopen(req, timeout=3)
        except HTTPError as exc:
            response = exc
        with response:
            data = response.read()
            return response.status, json.loads(data) if 'application/json' in response.headers.get('Content-Type', '') else data.decode()

    def test_nearby_api_is_empty_when_optional_catalog_is_absent(self):
        status, body = self.request('/api/v1/nearby-venues')
        self.assertEqual(status, 200)
        self.assertEqual(body['venues'], [])
        self.assertIsNone(body['origin'])

    def test_health_seed_static_and_missing(self):
        self.assertEqual(self.request('/api/v1/health')[0], 200)
        self.assertEqual(self.request('/api/v1/venues')[1]['venues'][0]['name'], '测试医院')
        self.assertEqual(self.request('/')[1], '<h1>Louli</h1>')
        self.assertEqual(self.request('/api/v1/venues/unknown/bundle')[0], 404)

    def test_queue_update_persists_and_invalid_update_is_atomic(self):
        q = [{'poiId': 'room1', 'ahead': 8, 'minutesPerPerson': 2.5, 'unit': '人'}]
        self.assertEqual(self.request('/api/v1/venues/test-hospital/queues', 'PUT', {'queues': q})[0], 200)
        self.assertEqual(self.request('/api/v1/venues/test-hospital/bundle')[1]['queues'], q)
        bad = copy.deepcopy(q); bad[0]['ahead'] = -2
        self.assertEqual(self.request('/api/v1/venues/test-hospital/queues', 'PUT', {'queues': bad})[0], 422)
        store = server.Store(self.db)
        self.assertEqual(store.get_bundle('test-hospital')['queues'], q)
        store.close()

    def test_import_upsert_and_failed_import_does_not_write(self):
        b = fixture(); b['venue']['id'] = 'custom'; b['venue']['source'] = 'user-provided'
        self.assertEqual(self.request('/api/v1/imports', 'POST', b), (201, {'venueId': 'custom'}))
        b['venue']['name'] = '更新场馆'
        self.assertEqual(self.request('/api/v1/imports', 'POST', b)[0], 201)
        b['map']['width'] = 999
        status, body = self.request('/api/v1/imports', 'POST', b)
        self.assertEqual(status, 422); self.assertEqual(body['error']['code'], 'validation_error')
        self.assertEqual(self.request('/api/v1/venues/custom/bundle')[1]['venue']['name'], '更新场馆')

    def test_body_errors_and_static_escape_are_rejected(self):
        self.assertEqual(self.request('/api/v1/imports', 'POST', raw=b'{broken')[0], 400)
        self.assertEqual(self.request('/api/v1/imports', 'POST', raw=b'x' * (2 * 1024 * 1024 + 1))[0], 413)
        for path in ['/../secret.txt', '/%2e%2e/secret.txt', '/backend/server.py', '/api/v2/venues']:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
        (self.root / 'frontend' / 'link.txt').symlink_to(self.root / 'secret.txt')
        self.assertEqual(self.request('/link.txt')[0], 404)

    def test_invalid_seed_reset_preserves_all_existing_data(self):
        bad = fixture(); bad['map']['width'] = 301
        (self.root / 'data' / 'seed.json').write_text(json.dumps(bad), encoding='utf-8')
        self.assertEqual(self.request('/api/v1/reset', 'POST', {})[0], 422)
        self.assertEqual(self.request('/api/v1/venues/test-hospital/bundle')[1]['venue'], fixture()['venue'])

    def test_malformed_seed_reset_returns_json_error_and_preserves_data(self):
        (self.root / 'data' / 'seed.json').write_text('{broken', encoding='utf-8')
        self.assertEqual(self.request('/api/v1/reset', 'POST', {})[0], 422)
        self.assertEqual(self.request('/api/v1/venues')[0], 200)

    def test_reset_keeps_imported_venue_and_its_queue(self):
        b = fixture(); b['venue']['id'] = 'custom'; b['venue']['source'] = 'user-provided'
        b['queues'][0]['ahead'] = 77
        self.assertEqual(self.request('/api/v1/imports', 'POST', b)[0], 201)
        self.assertEqual(self.request('/api/v1/reset', 'POST', {})[0], 200)
        status, saved = self.request('/api/v1/venues/custom/bundle')
        self.assertEqual(status, 200)
        self.assertEqual(saved['queues'][0]['ahead'], 77)

    def test_reset_reloads_seed(self):
        q = [{'poiId': 'room1', 'ahead': 99, 'minutesPerPerson': 1, 'unit': '人'}]
        self.request('/api/v1/venues/test-hospital/queues', 'PUT', {'queues': q})
        self.assertEqual(self.request('/api/v1/reset', 'POST', {})[0], 200)
        self.assertEqual(self.request('/api/v1/venues/test-hospital/queues')[1]['queues'], fixture()['queues'])


if __name__ == '__main__':
    unittest.main()

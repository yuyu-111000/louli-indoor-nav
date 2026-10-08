#!/usr/bin/env python3
"""Local-only Louli demo API; Python standard library + SQLite."""
import argparse
import copy
import json
import math
import mimetypes
from pathlib import Path
import re
import sqlite3
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 2 * 1024 * 1024
SLUG = re.compile(r'^[a-z0-9][a-z0-9_-]{0,63}$')
IDENTIFIER = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')


class ValidationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def object_fields(value, required, optional=(), path='object'):
    require(isinstance(value, dict), f'{path} must be an object')
    require(set(required) <= value.keys(), f'{path} missing required fields: {sorted(set(required) - value.keys())}')
    require(value.keys() <= set(required) | set(optional), f'{path} has unknown fields: {sorted(value.keys() - set(required) - set(optional))}')


def string(value, path, maximum=2000, empty=False):
    require(isinstance(value, str) and (empty or bool(value.strip())) and len(value) <= maximum, f'{path} must be a string of 1–{maximum} characters')
    require(not any(ord(c) < 32 and c not in '\n\r\t' for c in value), f'{path} contains control characters')
    require(not any(0xD800 <= ord(c) <= 0xDFFF for c in value), f'{path} must be valid UTF-8 text')


def number(value, path, lower=0, upper=1000000, integer=False):
    require((type(value) is int or (type(value) is float and math.isfinite(value))), f'{path} must be a finite number')
    require(lower <= value <= upper, f'{path} must be between {lower} and {upper}')
    if integer:
        require(type(value) is int, f'{path} must be an integer')


def sequence(value, path, maximum=1000):
    require(isinstance(value, list) and len(value) <= maximum, f'{path} must be an array with at most {maximum} entries')


def json_limits(value, depth=0):
    require(depth <= 12, 'JSON nesting must not exceed 12 levels')
    if isinstance(value, dict):
        require(len(value) <= 1000, 'Objects must not exceed 1000 fields')
        for k, v in value.items():
            string(k, 'field name', 100)
            json_limits(v, depth + 1)
    elif isinstance(value, list):
        sequence(value, 'array')
        for v in value:
            json_limits(v, depth + 1)
    elif isinstance(value, str):
        string(value, 'text', empty=True)
    elif type(value) in (int, float):
        require((type(value) is int or math.isfinite(value)) and abs(value) <= 1000000000, 'Numbers must be finite and within ±1 billion')
    else:
        require(value is None or type(value) is bool, 'Unsupported JSON value')


def validate_queues(queues, poi):
    sequence(queues, 'queues', 300)
    seen = set()
    for i, q in enumerate(queues):
        path = f'queues[{i}]'
        object_fields(q, ('poiId', 'ahead', 'minutesPerPerson', 'unit'), path=path)
        require(isinstance(q['poiId'], str) and q['poiId'] in poi, f'{path}.poiId must reference a POI')
        require(q['poiId'] not in seen, f'{path}.poiId is duplicated')
        seen.add(q['poiId'])
        number(q['ahead'], path + '.ahead', integer=True)
        number(q['minutesPerPerson'], path + '.minutesPerPerson', lower=.000001, upper=10000)
        string(q['unit'], path + '.unit', 20)
    return copy.deepcopy(queues)


ANCHOR_STATUS = {'outdoor_anchor_real_osm', 'hospital_polygon_real_osm', 'nearby_entrance_poi_real_osm', 'official_address_campus_anchor_osm'}


def map_url(value):
    string(value, 'map URL')
    try:
        url = urlsplit(value)
    except ValueError:
        raise ValidationError('Invalid map URL')
    require(url.scheme == 'https' and url.hostname in ('www.openstreetmap.org', 'openstreetmap.org') and not url.username and not url.password, 'Map URL must be an HTTPS OpenStreetMap link')


def validate_location(location):
    object_fields(location, ('crs', 'lat', 'lon', 'address', 'mapUrl', 'dataStatus', 'distanceStraightM', 'anchorId'), path='venue.location')
    require(location['crs'] == 'WGS84', 'Location coordinates must be WGS84')
    number(location['lat'], 'latitude', -90, 90); number(location['lon'], 'longitude', -180, 180)
    number(location['distanceStraightM'], 'straight-line distance', 0, 40000000)
    string(location['address'], 'address'); string(location['anchorId'], 'anchor id', 64)
    require(isinstance(location['dataStatus'], str) and location['dataStatus'] in ANCHOR_STATUS, 'Unrecognised anchor status')
    map_url(location['mapUrl'])


def validate_nearby(data):
    json_limits(data)
    object_fields(data, ('schemaVersion', 'crs', 'origin', 'venues'), path='nearby catalog')
    require(type(data['schemaVersion']) is int and data['schemaVersion'] == 1 and data['crs'] == 'WGS84', 'Nearby catalog requires schemaVersion 1 and WGS84')
    origin = data['origin']
    object_fields(origin, ('id', 'name', 'lat', 'lon'), path='origin')
    string(origin['id'], 'origin id', 64); string(origin['name'], 'origin name', 200)
    number(origin['lat'], 'origin latitude', -90, 90); number(origin['lon'], 'origin longitude', -180, 180)
    sequence(data['venues'], 'nearby venues', 100)
    result = copy.deepcopy(data); seen = set()
    for venue in result['venues']:
        object_fields(venue, ('id', 'name', 'category', 'address', 'lat', 'lon', 'data_status', 'map_url'), ('source_url', 'distance_straight_m'), path='nearby venue')
        string(venue['id'], 'venue id', 64); string(venue['name'], 'venue name', 200); string(venue['address'], 'venue address')
        require(venue['id'] not in seen, 'Nearby venue ids must be unique'); seen.add(venue['id'])
        require(venue['category'] in ('mall', 'hospital'), 'Nearby category must be mall or hospital')
        number(venue['lat'], 'venue latitude', -90, 90); number(venue['lon'], 'venue longitude', -180, 180)
        require(isinstance(venue['data_status'], str) and venue['data_status'] in ANCHOR_STATUS, 'Unrecognised nearby anchor status'); map_url(venue['map_url'])
        if 'source_url' in venue:
            string(venue['source_url'], 'source URL')
            require(urlsplit(venue['source_url']).scheme == 'https', 'Source URL requires HTTPS')
        lat1, lat2 = math.radians(origin['lat']), math.radians(venue['lat'])
        dlat = lat2 - lat1; dlon = math.radians(venue['lon'] - origin['lon'])
        a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
        venue['distance_straight_m'] = round(6371008.8 * 2 * math.asin(math.sqrt(min(1, max(0, a)))), 1)
    result['venues'].sort(key=lambda v: (v['distance_straight_m'], v['id']))
    return result


def validate_bundle(bundle):
    json_limits(bundle)
    object_fields(bundle, ('schemaVersion', 'venue', 'map', 'catalog', 'queues'), ('flow',), 'bundle')
    require(type(bundle['schemaVersion']) is int and bundle['schemaVersion'] == 1, 'schemaVersion must be 1')
    venue = bundle['venue']
    object_fields(venue, ('id', 'name', 'type', 'source'), ('description', 'location', 'indoorStatus'), 'venue')
    require(isinstance(venue['id'], str) and SLUG.fullmatch(venue['id']), 'venue.id must be a safe lowercase slug of at most 64 characters')
    string(venue['name'], 'venue.name', 200)
    require(venue['type'] in ('hospital', 'mall'), 'venue.type must be hospital or mall')
    require(venue['source'] in ('synthetic', 'user-provided'), 'venue.source must be synthetic or user-provided')
    if 'indoorStatus' in venue:
        require(venue['indoorStatus'] in ('demo_simulated', 'user_provided'), 'Indoor status must be explicit')
    if 'location' in venue:
        require('indoorStatus' in venue, 'A located venue must label its indoor geometry status')
        validate_location(venue['location'])
    if 'description' in venue:
        string(venue['description'], 'venue.description', empty=True)
    m = bundle['map']
    object_fields(m, ('width', 'height', 'resolution', 'start', 'corridors', 'rooms', 'fountain', 'escalator', 'entrances'), path='map')
    number(m['width'], 'map.width', 4, 300, integer=True)
    number(m['height'], 'map.height', 4, 300, integer=True)
    require(type(m['resolution']) in (int, float) and m['resolution'] in (.5, 1), 'map.resolution must be 0.5 or 1 metres per cell')
    w, h = m['width'], m['height']

    def point(x, y, path, boundary=False):
        number(x, path + '.x', 0, w)
        number(y, path + '.y', 0, h)
        if not boundary:
            require(x < w and y < h, path + ' must be inside the map boundary')

    def rectangle(rect, path):
        sequence(rect, path, 4)
        require(len(rect) == 4, path + ' must contain four coordinates')
        x0, y0, x1, y1 = rect
        point(x0, y0, path, True); point(x1, y1, path, True)
        require(x0 < x1 and y0 < y1, path + ' must have positive width and height')

    object_fields(m['start'], ('x', 'y'), path='map.start')
    point(m['start']['x'], m['start']['y'], 'map.start')
    require(type(m['start']['x']) is int and type(m['start']['y']) is int, 'map.start must be an integer grid cell')
    sequence(m['corridors'], 'map.corridors', 300)
    require(bool(m['corridors']), 'map.corridors must not be empty')
    for i, c in enumerate(m['corridors']):
        rectangle(c, f'map.corridors[{i}]')
    sequence(m['rooms'], 'map.rooms', 300)
    require(bool(m['rooms']), 'map.rooms must not be empty')
    room_ids = set()
    for i, r in enumerate(m['rooms']):
        path = f'map.rooms[{i}]'
        object_fields(r, ('id', 'x0', 'y0', 'x1', 'y1', 'dx', 'dy', 'ix', 'iy'), path=path)
        require(isinstance(r['id'], str) and IDENTIFIER.fullmatch(r['id']), path + '.id must be a safe identifier')
        require(r['id'] not in room_ids, path + '.id is duplicated')
        room_ids.add(r['id'])
        rectangle([r['x0'], r['y0'], r['x1'], r['y1']], path)
        point(r['dx'], r['dy'], path + '.door', True)
        require(type(r['ix']) is int and type(r['iy']) is int and (r['ix'], r['iy']) in ((0, 1), (0, -1), (1, 0), (-1, 0)), path + '.ix/iy must be a cardinal unit direction')
        point(r['dx'] + r['ix'] * 3, r['dy'] + r['iy'] * 3, path + '.target')
    sx, sy = m['start']['x'], m['start']['y']
    rects = m['corridors'] + [[r['x0'], r['y0'], r['x1'], r['y1']] for r in m['rooms']]
    require(any(x0 <= sx < x1 and y0 <= sy < y1 for x0, y0, x1, y1 in rects), 'map.start must be inside a corridor or room')
    object_fields(m['fountain'], ('x', 'y', 'r'), path='map.fountain')
    point(m['fountain']['x'], m['fountain']['y'], 'map.fountain', True)
    number(m['fountain']['r'], 'map.fountain.r', 0, min(w, h))
    rectangle(m['escalator'], 'map.escalator')
    sequence(m['entrances'], 'map.entrances', 30)
    for i, e in enumerate(m['entrances']):
        object_fields(e, ('x', 'y', 't', 'a'), path=f'map.entrances[{i}]')
        point(e['x'], e['y'], 'map.entrance', True)
        string(e['t'], 'map.entrance.t', 200); string(e['a'], 'map.entrance.a', 20)
    c = bundle['catalog']
    object_fields(c, ('title', 'sub', 'unit', 'cats', 'chips', 'favs', 'sample', 'poi'), ('flow',), path='catalog')
    for key in ('title', 'sub', 'unit'):
        string(c[key], 'catalog.' + key, 200)
    require(isinstance(c['cats'], dict) and 0 < len(c['cats']) <= 50, 'catalog.cats must have 1–50 categories')
    for key, value in c['cats'].items():
        string(key, 'category id', 64)
        sequence(value, 'category', 3); require(len(value) == 3, 'category must contain [name,glyph,colorIndex]')
        string(value[0], 'category.name', 100); string(value[1], 'category.glyph', 20)
        number(value[2], 'category.colorIndex', 0, 20, integer=True)
    require(isinstance(c['poi'], dict) and set(c['poi']) == room_ids, 'catalog.poi must contain exactly one POI for every room id')
    for key, p in c['poi'].items():
        object_fields(p, ('n', 's', 'c'), ('r', 'p', 'q', 'tags', 'deals', 'menu', 'rev', 'docs', 'info'), 'catalog.poi.' + key)
        string(p['n'], 'poi.name', 200); string(p['s'], 'poi.description', empty=True)
        require(isinstance(p['c'], str) and p['c'] in c['cats'], 'poi.c must reference a category')
        if 'r' in p: number(p['r'], 'poi.rating', 0, 5)
        if 'p' in p: number(p['p'], 'poi.price')
        if 'q' in p:
            sequence(p['q'], 'poi.q', 3); require(len(p['q']) == 3, 'poi.q must contain [ahead,minutesPerPerson,unit]')
            validate_queues([dict(zip(('poiId', 'ahead', 'minutesPerPerson', 'unit'), [key] + p['q']))], c['poi'])
        for field in ('tags', 'deals', 'menu', 'rev', 'docs', 'info'):
            if field in p:
                sequence(p[field], 'poi.' + field, 100)
                for item in p[field]:
                    if field in ('tags', 'menu', 'docs', 'info'):
                        string(item, 'poi.' + field + ' item')
                    elif field == 'rev':
                        sequence(item, 'poi.rev entry', 2)
                        require(len(item) == 2, 'poi.rev entry must contain [author,text]')
                        string(item[0], 'review.author', 100); string(item[1], 'review.text')
                    elif field == 'deals':
                        sequence(item, 'poi.deals entry', 3)
                        require(len(item) == 3, 'poi.deals entry must contain [name,price,originalPrice]')
                        string(item[0], 'deal.name', 200)
                        number(item[1], 'deal.price'); number(item[2], 'deal.originalPrice')
    sequence(c['chips'], 'catalog.chips', 100)
    for chip in c['chips']:
        sequence(chip, 'chip', 2); require(len(chip) == 2, 'chip must contain [category,label]')
        require(isinstance(chip[0], str) and (chip[0] == 'all' or chip[0] in c['cats']), 'chip category must reference a category')
        string(chip[1], 'chip.label', 100)
    sequence(c['favs'], 'catalog.favs', 300)
    require(all(isinstance(pid, str) and pid in room_ids for pid in c['favs']), 'catalog.favs must reference POIs')
    object_fields(c['sample'], ('poi', 'num'), path='catalog.sample')
    require(isinstance(c['sample']['poi'], str) and c['sample']['poi'] in room_ids, 'sample.poi must reference a POI')
    string(c['sample']['num'], 'sample.num', 100)
    require(not ('flow' in bundle and 'flow' in c and bundle['flow'] != c['flow']), 'Top-level and catalog flow must agree when both are present')
    if 'flow' in c: require(isinstance(c['flow'], dict), 'catalog.flow must be an object')
    if 'flow' in bundle: require(isinstance(bundle['flow'], dict), 'flow must be an object')
    f = c.get('flow', bundle.get('flow'))
    if f is not None:
        object_fields(f, ('phases', 'labels'), path='flow')
        sequence(f['phases'], 'flow.phases', 30); sequence(f['labels'], 'flow.labels', 30)
        require(len(f['phases']) == len(f['labels']), 'flow phases and labels must have equal lengths')
        for phase in f['phases']:
            sequence(phase, 'flow.phase', 300)
            require(all(isinstance(pid, str) and pid in room_ids for pid in phase), 'flow phases must reference POIs')
        for label in f['labels']: string(label, 'flow.label', 100)
    validate_queues(bundle['queues'], c['poi'])
    result = copy.deepcopy(bundle)
    if f is not None:
        result['catalog']['flow'] = copy.deepcopy(f)
    result.pop('flow', None)
    return result


def apply_queues(bundle, queues):
    bundle['queues'] = copy.deepcopy(queues)
    for p in bundle['catalog']['poi'].values():
        p.pop('q', None)
    for q in queues:
        bundle['catalog']['poi'][q['poiId']]['q'] = [q['ahead'], q['minutesPerPerson'], q['unit']]
    return bundle


class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(str(path), check_same_thread=False)
        self.lock = threading.RLock()
        self.connection.execute('CREATE TABLE IF NOT EXISTS venues (id TEXT PRIMARY KEY, bundle TEXT NOT NULL)')
        self.connection.commit()

    def close(self):
        with self.lock: self.connection.close()

    def list_venues(self):
        with self.lock:
            rows = self.connection.execute('SELECT bundle FROM venues ORDER BY id').fetchall()
        return [{k: json.loads(row[0])['venue'][k] for k in ('id', 'name', 'type', 'source')} for row in rows]

    def get_bundle(self, venue_id):
        with self.lock:
            row = self.connection.execute('SELECT bundle FROM venues WHERE id=?', (venue_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def _write(self, bundle):
        self.connection.execute('INSERT INTO venues(id,bundle) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET bundle=excluded.bundle',
                                (bundle['venue']['id'], json.dumps(bundle, ensure_ascii=False, allow_nan=False)))

    def upsert(self, bundle):
        validated = validate_bundle(bundle)
        apply_queues(validated, validated['queues'])
        with self.lock, self.connection:
            self._write(validated)
        return validated['venue']['id']

    def update_queues(self, venue_id, queues):
        with self.lock, self.connection:
            bundle = self.get_bundle(venue_id)
            if bundle is None: return None
            validated = validate_queues(queues, bundle['catalog']['poi'])
            self._write(apply_queues(bundle, validated))
        return validated

    def seed(self, directory, reset=False):
        bundles = []
        for path in sorted(Path(directory).glob('*.json')):
            require(path.stat().st_size <= MAX_BODY, f'Seed {path.name} exceeds 2 MiB')
            try:
                bundles.append(validate_bundle(json.loads(path.read_text(encoding='utf-8'))))
            except (ValueError, UnicodeDecodeError, RecursionError) as exc:
                raise ValidationError(f'Seed {path.name} is invalid: {exc}') from exc
        require(bool(bundles), 'No JSON seed bundles found in data directory')
        require(len({b['venue']['id'] for b in bundles}) == len(bundles), 'Seed venue ids must be unique')
        with self.lock, self.connection:
            for b in bundles:
                if reset or self.get_bundle(b['venue']['id']) is None:
                    self._write(apply_queues(b, b['queues']))
        return len(bundles)


class DemoServer(ThreadingHTTPServer):
    daemon_threads = True

    def server_close(self):
        super().server_close()
        self.store.close()


class Handler(BaseHTTPRequestHandler):
    server_version = 'LouliLocal/1'

    def log_message(self, format, *args):
        pass

    def respond(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers(); self.wfile.write(data)

    def error(self, status, code, message):
        self.respond(status, {'error': {'code': code, 'message': message}})

    def read_json(self):
        length = self.headers.get('Content-Length')
        if length is None or not length.isdecimal():
            self.error(411, 'length_required', 'A valid Content-Length is required'); return None
        length = int(length)
        if length > MAX_BODY:
            # Drain a bounded oversize upload so ordinary clients receive JSON 413
            # rather than a connection reset while still sending their body.
            remaining = min(length, MAX_BODY * 2)
            self.connection.settimeout(5)
            try:
                while remaining:
                    chunk = self.rfile.read(min(65536, remaining))
                    if not chunk: break
                    remaining -= len(chunk)
            except TimeoutError:
                pass
            self.error(413, 'body_too_large', 'JSON body must not exceed 2 MiB'); return None
        if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
            self.error(415, 'unsupported_media_type', 'Use Content-Type: application/json'); return None
        try:
            def pairs(items):
                result = {}
                for key, value in items:
                    if key in result: raise ValueError('Duplicate JSON field: ' + key)
                    result[key] = value
                return result
            value = json.loads(self.rfile.read(length).decode('utf-8'), object_pairs_hook=pairs,
                               parse_constant=lambda constant: (_ for _ in ()).throw(ValueError('Non-finite JSON number')))
            if not isinstance(value, dict): raise ValueError('JSON body must be an object')
            return value
        except (ValueError, UnicodeDecodeError, RecursionError):
            self.error(400, 'invalid_json', 'Body must be a valid UTF-8 JSON object with unique keys'); return None

    def do_GET(self): self.dispatch('GET')
    def do_POST(self): self.dispatch('POST')
    def do_PUT(self): self.dispatch('PUT')
    def do_DELETE(self): self.error(405, 'method_not_allowed', 'Supported methods are GET, POST and PUT')
    def do_PATCH(self): self.error(405, 'method_not_allowed', 'Supported methods are GET, POST and PUT')
    def do_OPTIONS(self): self.error(405, 'method_not_allowed', 'This local service is same-origin only')

    def dispatch(self, method):
        try:
            self.route(method)
        except ValidationError as exc:
            self.error(422, 'validation_error', str(exc))
        except (sqlite3.Error, OSError):
            self.error(500, 'storage_error', 'Local data could not be read or written')

    def route(self, method):
        path = unquote(urlsplit(self.path).path)
        store = self.server.store
        if path == '/api/v1/health' and method == 'GET':
            return self.respond(200, {'status': 'ok', 'apiVersion': 1, 'storage': 'sqlite', 'localOnly': True})
        if path == '/api/v1/venues' and method == 'GET':
            return self.respond(200, {'venues': store.list_venues()})
        if path == '/api/v1/nearby-venues' and method == 'GET':
            catalog = self.server.data_dir / 'context' / 'nearby-venues.json'
            if not catalog.exists():
                return self.respond(200, {'schemaVersion': 1, 'crs': 'WGS84', 'origin': None, 'venues': []})
            require(catalog.stat().st_size <= MAX_BODY, 'Nearby catalog exceeds 2 MiB')
            try:
                data = json.loads(catalog.read_text(encoding='utf-8'))
            except (ValueError, UnicodeDecodeError) as exc:
                raise ValidationError('Nearby catalog is not valid UTF-8 JSON') from exc
            return self.respond(200, validate_nearby(data))
        match = re.fullmatch(r'/api/v1/venues/([a-z0-9][a-z0-9_-]{0,63})/(bundle|queues)', path)
        if match:
            venue_id, resource = match.groups()
            bundle = store.get_bundle(venue_id)
            if bundle is None: return self.error(404, 'venue_not_found', 'Venue does not exist')
            if method == 'GET':
                return self.respond(200, bundle if resource == 'bundle' else {'queues': bundle['queues']})
            if method == 'PUT' and resource == 'queues':
                payload = self.read_json()
                if payload is None: return
                object_fields(payload, ('queues',), path='body')
                queues = store.update_queues(venue_id, payload['queues'])
                if queues is None: return self.error(404, 'venue_not_found', 'Venue does not exist')
                return self.respond(200, {'queues': queues})
            return self.error(405, 'method_not_allowed', 'This endpoint does not support that method')
        if path == '/api/v1/imports' and method == 'POST':
            payload = self.read_json()
            if payload is None: return
            return self.respond(201, {'venueId': store.upsert(payload)})
        if path == '/api/v1/reset' and method == 'POST':
            payload = self.read_json()
            if payload is None: return
            object_fields(payload, (), path='body')
            count = store.seed(self.server.data_dir, reset=True)
            return self.respond(200, {'venuesLoaded': count})
        if path.startswith('/api/'):
            return self.error(404, 'not_found', 'API endpoint does not exist')
        if method != 'GET': return self.error(405, 'method_not_allowed', 'Static files only support GET')
        if '\\' in path or '\x00' in path:
            return self.error(404, 'not_found', 'File does not exist')
        relative = path.lstrip('/') or 'index.html'
        target = (self.server.frontend_dir / relative).resolve()
        if not target.is_relative_to(self.server.frontend_dir) or not target.is_file():
            return self.error(404, 'not_found', 'File does not exist')
        data = target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(target))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers(); self.wfile.write(data)


def create_server(host='127.0.0.1', port=8791, db=None, data_dir=None, frontend_dir=None):
    if host != '127.0.0.1':
        raise ValueError('This demonstration service only binds to 127.0.0.1')
    store = Store(db or ROOT / 'backend' / 'runtime' / 'demo.sqlite')
    data_dir = Path(data_dir or ROOT / 'data').resolve()
    try:
        store.seed(data_dir)
        httpd = DemoServer((host, port), Handler)
    except Exception:
        store.close(); raise
    httpd.store = store
    httpd.data_dir = data_dir
    httpd.frontend_dir = Path(frontend_dir or ROOT / 'frontend').resolve()
    return httpd


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8791)
    parser.add_argument('--db', type=Path, default=ROOT / 'backend' / 'runtime' / 'demo.sqlite')
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'data')
    parser.add_argument('--frontend-dir', type=Path, default=ROOT / 'frontend')
    args = parser.parse_args()
    try:
        httpd = create_server(port=args.port, db=args.db, data_dir=args.data_dir, frontend_dir=args.frontend_dir)
    except (ValueError, OSError, sqlite3.Error) as exc:
        parser.exit(1, f'Cannot start local demo: {exc}\n')
    print(f'Louli local demo: http://127.0.0.1:{httpd.server_port} (Ctrl+C to stop)', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()

"""Adapt the supplied 1F photo trace without treating pixels as measured metres."""
import copy
import json
import math
import shutil
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = (40, 215)
SCALE = 10


def inside(x, y, shape):
    hit = False
    for i, (ax, ay) in enumerate(shape):
        bx, by = shape[i - 1]
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            hit = not hit
    return hit


def hull(points):
    points = sorted(set(map(tuple, points)))
    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    halves = []
    for seq in (points, list(reversed(points))):
        half = []
        for p in seq:
            while len(half) > 1 and cross(half[-2], half[-1], p) <= 0:
                half.pop()
            half.append(p)
        halves.append(half[:-1])
    return halves[0] + halves[1]


def build(source, legacy, floor_id="1F"):
    floor = next(f for f in source['floors'] if f['id'] == floor_id)
    convert = lambda p: [round((p[0]-ORIGIN[0])/SCALE, 3), round((p[1]-ORIGIN[1])/SCALE, 3)]
    zones = [dict(id=z['id'], tone=z['tone'], shape=[convert(p) for p in z['shape']]) for z in floor['zones']]
    # This envelope and the grey photo areas are presentation annotations, not surveyed boundaries.
    outline = hull(p for z in zones for p in z['shape'])
    cx = sum(x for x, y in outline)/len(outline)
    cy = sum(y for x, y in outline)/len(outline)
    outline = [[round(max(0, min(151.9, cx+(x-cx)*1.06)), 3),
                round(max(0, min(87.9, cy+(y-cy)*1.06)), 3)] for x, y in outline]
    obstacles = [[convert(p) for p in shape] for shape in [
        [[990, 525], [1135, 520], [1145, 640], [1065, 694], [935, 588]],
        [[1040, 725], [1190, 790], [1300, 795], [1320, 920], [1100, 930], [1095, 965], [1005, 925], [965, 785]],
    ]] if floor_id == "1F" else []
    width, height, res = 152, 88, .5
    gw, gh = int(width/res), int(height/res)
    blocked = [z['shape'] for z in zones] + obstacles
    walk = [inside((x+.5)*res, (y+.5)*res, outline) and
            not any(inside((x+.5)*res, (y+.5)*res, p) for p in blocked)
            for y in range(gh) for x in range(gw)]
    start = {'x': 60, 'y': 30}
    if floor_id != '1F':
        remaining = {n for n, free in enumerate(walk) if free}
        largest = set()
        while remaining:
            first = remaining.pop(); component = {first}; pending = deque([first])
            while pending:
                at = pending.popleft(); x, y = at % gw, at // gw
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    n = ny*gw+nx
                    if 0 <= nx < gw and 0 <= ny < gh and n in remaining:
                        remaining.remove(n); component.add(n); pending.append(n)
            if len(component) > len(largest): largest = component
        first = min(largest, key=lambda n: ((n%gw+.5)*res-60)**2+((n//gw+.5)*res-30)**2)
        start = dict(x=(first%gw+.5)*res, y=(first//gw+.5)*res)

    root = int(start['y']/res)*gw+int(start['x']/res)
    assert walk[root], 'The demonstration start must be in photo whitespace'
    connected = {root}
    todo = deque([root])
    while todo:
        at = todo.popleft(); x, y = at % gw, at//gw
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            n = ny*gw+nx
            if 0 <= nx < gw and 0 <= ny < gh and walk[n] and n not in connected:
                connected.add(n); todo.append(n)
    def comfortable(n):
        x,y=n%gw,n//gw
        return all(0 <= x+dx < gw and 0 <= y+dy < gh and walk[(y+dy)*gw+x+dx]
                   for dx in range(-2,3) for dy in range(-2,3))
    targets = [n for n in connected if comfortable(n)]
    rooms, poi, points = [], {}, []
    for shop in floor['shops']:
        x, y = convert([shop['x'], shop['y']])
        n = min(targets, key=lambda n: ((n%gw+.5)*res-x)**2+((n//gw+.5)*res-y)**2)
        tx, ty = (n%gw+.5)*res, (n//gw+.5)*res
        rooms.append(dict(id=shop['id'], x0=x-1, y0=y-1, x1=x+1, y1=y+1,
                          dx=tx-3, dy=ty, ix=1, iy=0))
        points.append(dict(id=shop['id'], x=x, y=y, zoneId=shop['zoneId'], confidence=shop['confidence']))
        food = any(name in shop['name'] for name in ['星巴克','M Stand','奈雪','必胜客','茶百道'])
        poi[shop['id']] = dict(n=shop['name'], s=floor_id+' · '+('照片店名可辨' if shop['confidence']=='clear' else '名称待核对'),
                              c='food' if food else 'shop', info=['店名及相对位置来自导览屏照片。', '导航终点为附近留白中的演示接近点，不是已核实店门。'])
    bundle = copy.deepcopy(legacy)
    bundle['venue'].update(source='user-provided', indoorStatus='user_provided',
                           description='城西银泰 1F 导览屏照片轮廓与店名；通路、接近点、排队和定位为演示，未经实测比例标定。')
    bundle['map'] = dict(width=width, height=height, resolution=res, start=start,
                        corridors=[[0,0,width,height]], rooms=rooms,
                        fountain={'x':0,'y':0,'r':0}, escalator=[0,0,.1,.1],
                        entrances=[dict(x=60,y=30,t='演示起点',a='s')],
                        trace=dict(version='photo-trace-v1', floor=floor_id, units='relative',
                                   origin=list(ORIGIN), pixelsPerUnit=SCALE,
                                   sourceSize=[1706,1279], photo=f'data/yintai-kiosk/photos/{floor_id}.jpg',
                                   routing='inferred-whitespace', outline=outline,
                                   zones=zones, points=points, inferredObstacles=obstacles))
    favs = ['1F-S01','1F-S04','1F-S03'] if floor_id == '1F' else list(poi)[:3]
    bundle['catalog'] = dict(title='城西银泰 · '+floor_id, sub='导览照片单层图 · 路线与候位演示', unit='人',
                             cats={'shop':['商店','店',1], 'food':['餐饮','餐',4]},
                             chips=[['all','全部'],['shop','商店'],['food','餐饮']],
                             favs=favs, sample={'poi':'1F-S03','num':'演示 A001'}, poi=poi)
    if floor_id != '1F':
        bundle['venue']['description'] = f'城西银泰 {floor_id} 导览照片轮廓；本层路线与定位为仿真。'
        bundle['catalog']['sample'] = dict(poi=favs[0], num='演示 A001')
        bundle['queues'] = []
        bundle['map']['entrances'] = [dict(**start, t='演示起点', a='s')]
        return bundle
    bundle['queues'] = [dict(poiId='1F-S03',ahead=5,minutesPerPerson=2,unit='人'),
                        dict(poiId='1F-S07',ahead=3,minutesPerPerson=3,unit='桌')]
    return bundle


if __name__ == '__main__':
    source = json.loads((ROOT/'城西银泰3D地图数据/kiosk-map.json').read_text(encoding='utf-8'))
    legacy_file = ROOT/'examples/yintai-simulated-legacy.json'
    if not legacy_file.exists():
        legacy_file.write_bytes((ROOT/'data/yintai-demo.json').read_bytes())
    bundle = build(source, json.loads(legacy_file.read_text(encoding='utf-8')))
    text = json.dumps(bundle, ensure_ascii=False, indent=2)+'\n'
    for path in ('data/yintai-demo.json','frontend/data/yintai-demo.json'):
        (ROOT/path).write_text(text, encoding='utf-8')
    viewer = copy.deepcopy(source)
    viewer['floors'] = copy.deepcopy(source['floors'])
    viewer_dir = ROOT/'frontend/data/yintai-kiosk'
    (viewer_dir/'photos').mkdir(parents=True, exist_ok=True)
    (viewer_dir/'kiosk-map.json').write_text(json.dumps(viewer, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    shop_records = dict(venue=source['venue'], floor='1F', source=source['source'],
                        coordinateSystem=source['coordinateSystem'], shops=next(f for f in source['floors'] if f['id'] == '1F')['shops'])
    (viewer_dir/'1F-shops.json').write_text(json.dumps(shop_records, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    shutil.copy2(ROOT/'城西银泰3D地图数据/photos/1F.jpg', viewer_dir/'photos/1F.jpg')
    floor_dir = ROOT/'frontend/data/yintai-floors'
    floor_dir.mkdir(parents=True, exist_ok=True)
    for floor in source['floors']:
        if floor['id'] != '1F':
            package = build(source, json.loads(legacy_file.read_text(encoding='utf-8')), floor['id'])
            (floor_dir/(floor['id']+'.json')).write_text(json.dumps(package, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        shutil.copy2(ROOT/'城西银泰3D地图数据/photos'/ (floor['id']+'.jpg'), viewer_dir/'photos'/ (floor['id']+'.jpg'))
    print('B1 to 4F photo data; demonstration routes remain within each floor.')

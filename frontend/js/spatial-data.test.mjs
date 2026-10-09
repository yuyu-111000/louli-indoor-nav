import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {floorById,filterShops,polygonPoints} from './spatial-data.mjs';

const data=JSON.parse(readFileSync(new URL('../data/yintai-kiosk/kiosk-map.json',import.meta.url)));

test('photo tracing has five distinct floors with bounded store shapes',()=>{
  assert.deepEqual(data.floors.map(f=>f.id),['B1','1F','2F','3F','4F']);
  assert.ok(data.floors.every(f=>f.zones.length>=9 && f.shops.length>=10));
  for(const floor of data.floors){
    const zoneIds=new Set(floor.zones.map(z=>z.id));
    for(const zone of floor.zones){
      assert.ok(zone.shape.length>=3);
      assert.ok(zone.shape.every(([x,y])=>x>=0&&x<=1706&&y>=0&&y<=1279));
      assert.ok(polygonPoints(zone.shape).includes(','));
    }
    for(const shop of floor.shops){
      assert.ok(shop.x>=0&&shop.x<=1706&&shop.y>=0&&shop.y<=1279);
      assert.ok(shop.zoneId===null||zoneIds.has(shop.zoneId));
      assert.ok(['clear','review'].includes(shop.confidence));
    }
  }
});

test('floor selection and cross-floor search retain photo-derived uncertainty',()=>{
  assert.equal(floorById(data,'3F').shops.find(s=>s.name==='博纳影院')?.confidence,'clear');
  assert.equal(filterShops(data,'星巴克').length,3);
  assert.equal(filterShops(data,'不存在').length,0);
});

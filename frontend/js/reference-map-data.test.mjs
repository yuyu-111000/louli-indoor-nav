import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getVenue, getFloor, defaultAsset, markersForAsset, searchFloor} from './reference-map-data.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/public-floor-views.json',import.meta.url)));
test('public views keep distinct floors, verified image files, and point-only annotations',()=>{
  const y=getVenue(data,'MALL-YINTAI'),x=getVenue(data,'MALL-XIXI');
  assert.equal(y.floors.length,10);assert.equal(x.floors.length,9);
  for(const v of [y,x])for(const f of v.floors){assert.equal(f.real_routing_enabled,false);assert.equal(f.nodes.length,0);assert.equal(f.edges.length,0);for(const asset of f.map_assets){assert.ok(fs.existsSync(new URL(`../${asset.path}`,import.meta.url)),asset.path);}}
});
test('F1 opens the image that actually contains selectable shops',()=>{
  const floor=getFloor(getVenue(data,'MALL-YINTAI'),'F1');const view=defaultAsset(floor);
  assert.ok(view.path.endsWith('F1_detail_south.jpg'));
  const markers=markersForAsset(floor,view.id);assert.equal(markers.length,20);
  assert.ok(markers.some(p=>p.name==='PANDORA'));
  assert.equal(searchFloor(floor,'pandora')[0].name,'PANDORA');
  assert.equal(markersForAsset(floor,floor.map_assets.find(a=>a.id!==view.id).id).length,0);
});
test('thin floor remains explicitly incomplete and unrouteable',()=>{
  const floor=getFloor(getVenue(data,'MALL-YINTAI'),'F2');
  assert.equal(floor.pois.length,0);assert.equal(floor.complete_indoor_floorplan,false);
  assert.match(floor.coverage_note,/轮廓|底图/);
});

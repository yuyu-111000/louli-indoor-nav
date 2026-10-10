import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const hosp=JSON.parse(fs.readFileSync(new URL('../../data/hosp.json',import.meta.url)));
const mall=JSON.parse(fs.readFileSync(new URL('../../data/mall.json',import.meta.url)));
function grid(bundle){const c=vm.createContext({window:{LouliSession:{bundle}},Uint8Array,Float32Array,Math});for(const name of ['utils','geometry','routing']){vm.runInContext(fs.readFileSync(new URL(`${name}.js`,import.meta.url),'utf8'),c);}return c;}
test('map dimensions and start come from the selected venue package',()=>{const small=structuredClone(hosp);small.map.width=150;small.map.height=90;const c=grid(small);assert.equal(vm.runInContext('BW',c),150);assert.equal(vm.runInContext('BH',c),90);});
test('hospital navigation has reachable routes to every room',()=>{const c=grid(hosp);for(const s of hosp.map.rooms){c.target=s;assert.ok(vm.runInContext('astar(70,81,target.dx+target.ix*3,target.dy+target.iy*3)?.len > 0',c),s.id);}});
test('demonstration chapters adapt to an imported venue without original room IDs',async()=>{let m;try{m=await import('./story-data.js');}catch{}assert.ok(m?.buildStory,'buildStory is available');const custom=structuredClone(mall);custom.catalog.poi={custom:{n:'示例店',s:'示例',c:'food',q:[1,2,'桌']}};custom.catalog.favs=['custom'];custom.catalog.sample.poi='custom';const story=m.buildStory(custom);assert.equal(story.length,4);for(const c of story)assert.ok(c.ids.every(id=>id==='custom'));});
test('hospital chapters preserve the documented flow and source label',async()=>{let m;try{m=await import('./story-data.js');}catch{}assert.ok(m?.buildStory,'buildStory is available');const story=m.buildStory(hosp);assert.equal(story[0].action,'overview');assert.equal(story[1].action,'navigate');assert.deepEqual(story[1].ids,hosp.catalog.flow.phases.flat());assert.equal(story[2].action,'queue');assert.equal(story[3].action,'hardware');});
test('custom 60 by 40 metre map has reachable doors and its own start',()=>{const b=JSON.parse(fs.readFileSync(new URL('../../examples/custom-map.json',import.meta.url)));const c=grid(b);assert.equal(vm.runInContext('BW',c),60);assert.equal(vm.runInContext('BH',c),40);for(const room of b.map.rooms){c.target=room;assert.ok(vm.runInContext('astar(MAP.start.x,MAP.start.y,target.dx+target.ix*3,target.dy+target.iy*3)?.len > 0',c),room.id);}});
test('imported descriptive text, category glyph and queue units render as text',()=>{const c=vm.createContext({document:{querySelector(){}},Math,Date,Q:{safe:{n:1,unit:'<img src=x>',rate:1}},glyphStyle:()=>'',catOf:()=>['商店','<script>x</script>',0],walkMeters:()=>2});for(const name of ['utils','panel-renderer'])vm.runInContext(fs.readFileSync(new URL(`${name}.js`,import.meta.url),'utf8'),c);c.poi={id:'safe',n:'<b>名称</b>',s:'<img src=x onerror=alert(1)>'};const html=vm.runInContext('poiRow(poi)',c);assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));assert.ok(html.includes('&lt;img'));});
test('ending navigation cancels pending arrival callbacks before another route starts',()=>{const c=vm.createContext({sim:{timers:[{t:2,fn(){}}],walk:{done:false}},nav:{active:true},ui:{tab:'nav'},document:{body:{classList:{remove(){}}}},$:()=>({hidden:false})});vm.runInContext(fs.readFileSync(new URL('navigation.js',import.meta.url),'utf8'),c);vm.runInContext('endNav(true)',c);assert.equal(c.sim.timers.length,0);assert.equal(c.sim.walk.done,true);});
test('an API queue change advances the local ticket and emits a return reminder',()=>{const alerts=[];const c=vm.createContext({Q:{safe:{n:8}},tickets:[{poi:'safe',ahead:8,status:'wait'}],V:{poi:{safe:{n:'示例店'}}},ui:{},toast:m=>alerts.push(m)});const source=fs.readFileSync(new URL('demo-bridge.js',import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf('function syncQueueRows'),source.indexOf('window.LouliDemo=')),c);c.rows=[{poiId:'safe',ahead:1,minutesPerPerson:2,unit:'桌'}];vm.runInContext('syncQueueRows(rows)',c);assert.equal(c.tickets[0].ahead,1);assert.equal(c.tickets[0].status,'soon');assert.equal(alerts.length,1);assert.ok(alerts[0].includes('示例店'));});
test('nearby malls distinguish photo-derived and simulated interiors with reachable targets',()=>{for(const id of ['yintai-demo','xixi-demo']){const b=JSON.parse(fs.readFileSync(new URL(`../../data/${id}.json`,import.meta.url)));assert.equal(b.venue.indoorStatus,id==='yintai-demo'?'user_provided':'demo_simulated');assert.equal(b.venue.source,id==='yintai-demo'?'user-provided':'synthetic');assert.equal(b.venue.location.crs,'WGS84');const c=grid(b);for(const room of b.map.rooms){c.target=room;assert.ok(vm.runInContext('astar(MAP.start.x,MAP.start.y,target.dx+target.ix*3,target.dy+target.iy*3)?.len > 0',c),room.id);}}});
test('photo-derived mall story distinguishes source shapes from navigation simulation',async()=>{const {buildStory}=await import('./story-data.js');const b=JSON.parse(fs.readFileSync(new URL('../../data/yintai-demo.json',import.meta.url)));const story=buildStory(b);assert.ok(story[0].caption.includes('导览照片'));assert.ok(story[1].caption.includes('尚未现场核实'));});

test('1F preserves all source polygons and shop ids, including same-name and shared-zone records',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../../城西银泰3D地图数据/kiosk-map.json',import.meta.url)));
  const floor=source.floors.find(f=>f.id==='1F'),b=JSON.parse(fs.readFileSync(new URL('../../data/yintai-demo.json',import.meta.url)));
  assert.equal(b.map.trace.units,'relative');assert.equal(b.map.trace.zones.length,31);assert.equal(b.map.trace.points.length,10);
  for(const zone of floor.zones){const converted=b.map.trace.zones.find(z=>z.id===zone.id);assert.deepEqual(converted.shape,zone.shape.map(([x,y])=>[(x-40)/10,(y-215)/10]));}
  for(const shop of floor.shops){assert.equal(b.catalog.poi[shop.id].n,shop.name);assert.equal(b.map.trace.points.find(p=>p.id===shop.id).confidence,shop.confidence);}
  assert.equal(Object.values(b.catalog.poi).filter(p=>p.n==='星巴克').length,2);
  const c=grid(b);for(const room of b.map.rooms){c.target=room;const route=vm.runInContext('astar(MAP.start.x,MAP.start.y,target.dx+3,target.dy)',c);c.route=route;
    assert.ok(vm.runInContext('(()=>{for(let d=0;d<route.len;d+=.2){const p=pointAt(route,d);if(!isWalk(p.x,p.y))return false;}return true;})()',c),room.id);
  }
});

test('simulated beacons follow each venue geometry with walkable, spaced anchors',()=>{
  for(const path of ['../../data/yintai-demo.json','../../data/hosp.json','../../examples/custom-map.json']){
    const bundle=JSON.parse(fs.readFileSync(new URL(path,import.meta.url))),c=grid(bundle);
    vm.runInContext(fs.readFileSync(new URL('beacon-layout.js',import.meta.url),'utf8'),c);
    const points=vm.runInContext('buildBeaconLayout(MAP,window.LouliSession.bundle.catalog.poi)',c);
    assert.ok(points.length>=3&&points.length<=12,path);
    assert.ok(points.some(p=>p.kind==='entrance'),path);
    assert.ok(points.some(p=>p.kind==='junction'),path);
    assert.ok(points.some(p=>p.kind==='service'),path);
    for(const point of points){c.point=point;assert.ok(vm.runInContext('isWalk(point.x,point.y)',c),point.id);}
    const spacing=Math.max(4,Math.min(bundle.map.width,bundle.map.height)*.08);
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>=spacing);
  }
});

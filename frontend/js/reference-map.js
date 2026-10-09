import {getVenue,getFloor,defaultAsset,markersForAsset,searchFloor} from './reference-map-data.mjs';
const $=selector=>document.querySelector(selector);
const query=new URLSearchParams(location.search);
if(query.get('embed')==='1')document.body.classList.add('embedded');
let venue,floor,asset,zoom=1,selected=null;
const viewNames={overview:'总览',overview_A:'A区总览',detail_north:'北侧细节',detail_south:'南侧细节',detail_west:'西侧细节',detail_east:'东侧细节'};
const kindNames={shop:'商户',food:'餐饮',entrance_label:'入口标注',elevator_label:'电梯文字',escalator_label:'扶梯文字',cross_floor_hint:'跨层文字',parking_label:'停车标注',parking_entrance_label:'停车入口'};
function layout(){if(!asset)return;const box=$('#viewport'),scale=Math.min(box.clientWidth/asset.width_px,box.clientHeight/asset.height_px)*zoom;
  $('#mapPlane').style.width=`${asset.width_px*scale}px`;$('#mapPlane').style.height=`${asset.height_px*scale}px`;
}
function select(poi){selected=poi;$('#selection').hidden=false;$('#selectionName').textContent=poi.name;$('#selectionKind').textContent=kindNames[poi.type]||'图上注释';
  document.querySelectorAll('.marker').forEach(button=>button.classList.toggle('selected',button.dataset.poiId===poi.id));
}
function renderMarkers(){const layer=$('#markers');layer.replaceChildren();for(const poi of markersForAsset(floor,asset.id).filter(p=>p.type==='shop'||p.type==='food')){
  const button=document.createElement('button');button.type='button';button.className='marker';button.dataset.poiId=poi.id;button.title=poi.name;button.setAttribute('aria-label',`图上标注：${poi.name}`);
  button.style.left=`${poi.position.x/asset.width_px*100}%`;button.style.top=`${poi.position.y/asset.height_px*100}%`;button.onclick=()=>select(poi);layer.append(button);
}if(selected?.position.asset_id===asset.id)select(selected);else{$('#selection').hidden=true;selected=null;}}
function showAsset(id){asset=floor.map_assets.find(a=>a.id===id)||defaultAsset(floor);if(!asset)return;
  $('#viewSelect').value=asset.id;$('#mapImage').src=asset.path;$('#mapImage').alt=`${venue.name} ${floor.id} ${viewNames[asset.view]||asset.view}的公开地图截图`;
  $('#viewport').scrollTo(0,0);renderMarkers();layout();
}
function selectFloor(id){floor=getFloor(venue,id);if(!floor)return;
  $('#floorSelect').value=floor.id;const view=$('#viewSelect');view.replaceChildren(...floor.map_assets.map(a=>{const option=document.createElement('option');option.value=a.id;option.textContent=viewNames[a.view]||a.view;return option;}));
  const shops=floor.pois.filter(p=>p.type==='shop'||p.type==='food').length;
  $('#coverage').textContent=shops?`${floor.id} · 截图标注 ${floor.pois.length} 处，其中商户/餐饮 ${shops} 处。${floor.coverage_note}`:`${floor.id} · 当前以参考轮廓或停车内容为主。${floor.coverage_note}`;
  $('#poiSearch').value='';$('#searchResults').hidden=true;selected=null;zoom=1;showAsset(defaultAsset(floor)?.id);
}
function renderSearch(){const term=$('#poiSearch').value.trim(),results=$('#searchResults');results.replaceChildren();results.hidden=!term;if(!term)return;
  const matches=searchFloor(floor,term);if(!matches.length){results.textContent='本层未找到对应标注。';return;}
  for(const poi of matches.slice(0,12)){const button=document.createElement('button');button.type='button';button.textContent=`${poi.name} · ${kindNames[poi.type]||'图上注释'}`;button.onclick=()=>{showAsset(poi.position.asset_id);select(poi);results.hidden=true;};results.append(button);}
}
$('#floorSelect').onchange=e=>selectFloor(e.target.value);
$('#viewSelect').onchange=e=>showAsset(e.target.value);
$('#poiSearch').oninput=renderSearch;
$('#closeSelection').onclick=()=>{selected=null;$('#selection').hidden=true;document.querySelectorAll('.marker').forEach(b=>b.classList.remove('selected'));};
$('#zoomIn').onclick=()=>{zoom=Math.min(3,zoom+0.5);layout();};
$('#zoomOut').onclick=()=>{zoom=Math.max(1,zoom-0.5);layout();};
window.addEventListener('resize',layout);
try{const response=await fetch('data/public-floor-views.json');if(!response.ok)throw new Error('无法读取楼层索引');const data=await response.json();
  venue=getVenue(data,query.get('venue')==='xixi-demo'?'MALL-XIXI':'MALL-YINTAI');if(!venue)throw new Error('没有此场馆的公开楼层资料');
  $('#simulationLink').href=`demo.html?venue=${venue.id==='MALL-XIXI'?'xixi-demo':'yintai-demo'}`;
  $('#floorSelect').replaceChildren(...venue.floors.map(f=>{const option=document.createElement('option');option.value=f.id;option.textContent=`${f.id}${f.pois.length?' · 有标注':' · 参考图'}`;return option;}));
  selectFloor(getFloor(venue,query.get('floor'))?.id||'F1');
}catch(error){$('#coverage').textContent=`公开地图未能加载：${error.message}`;}

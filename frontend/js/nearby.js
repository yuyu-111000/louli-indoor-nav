import {loadNearby} from './api.js';
export const showVenueId=id=>({'MALL-YINTAI':'yintai-demo','MALL-XIXI':'xixi-demo'}[id]||null);
export const anchorLabel=status=>({outdoor_anchor_real_osm:'公开地图室外锚点',hospital_polygon_real_osm:'公开地图院区参考点',nearby_entrance_poi_real_osm:'入口／公交站参考点，非室内位置',official_address_campus_anchor_osm:'校园锚点，非院区建筑入口'}[status]||'用户提供地点资料');
export async function renderNearby(list,currentId){
  list.textContent='正在读取场馆资料…';
    try{const data=await loadNearby();list.replaceChildren();if(!data.venues.length){list.textContent='尚未添加附近场馆资料。';return;}
      for(const v of data.venues){const row=document.createElement('section');row.className='nearby-row';const heading=document.createElement('div');heading.className='nearby-heading';const name=document.createElement('h3');name.textContent=v.name;const dist=document.createElement('span');dist.textContent=v.data_status==='official_address_campus_anchor_osm'?'校园范围':`${(v.distance_straight_m/1000).toFixed(2)} km`;heading.append(name,dist);
        const address=document.createElement('p');address.textContent=v.address;const status=document.createElement('small');status.textContent=anchorLabel(v.data_status);const actions=document.createElement('div');actions.className='nearby-actions';const link=document.createElement('a');link.textContent='查看室外地点 ↗';link.href=v.map_url;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
        const id=showVenueId(v.id);if(id){const button=document.createElement('button');button.textContent=currentId===id?'当前展示':'选择作为展示';button.disabled=currentId===id;button.onclick=async()=>{button.disabled=true;location.href=`./?venue=${encodeURIComponent(id)}#showcase`;};actions.append(button);}else{const hint=document.createElement('span');hint.textContent='尚无室内图';actions.append(hint);}
        row.append(heading,address,status,actions);list.append(row);
      }
    }catch(e){list.textContent=`场馆资料读取失败：${e.message}`;}
}

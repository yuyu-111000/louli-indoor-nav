export function getVenue(data,id){return data.venues.find(v=>v.id===id)||null;}
export function getFloor(venue,id){return venue?.floors.find(f=>f.id===id)||null;}
export function defaultAsset(floor){
  if(!floor)return null;
  const populated=floor.pois.find(p=>floor.map_assets.some(a=>a.id===p.position.asset_id));
  return floor.map_assets.find(a=>a.id===populated?.position.asset_id)||floor.map_assets[0]||null;
}
export function markersForAsset(floor,assetId){return floor.pois.filter(p=>p.position.asset_id===assetId);}
export function searchFloor(floor,query){const term=query.trim().toLocaleLowerCase();return term?floor.pois.filter(p=>p.name.toLocaleLowerCase().includes(term)):floor.pois;}

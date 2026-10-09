export function floorById(data,id){return data.floors.find(f=>f.id===id)||null;}
export function filterShops(data,query){
  const term=query.trim().toLocaleLowerCase();
  return term?data.floors.flatMap(f=>f.shops.filter(s=>s.name.toLocaleLowerCase().includes(term)).map(s=>({...s,floor:f.id}))):[];
}
export function polygonPoints(shape){return shape.map(([x,y])=>`${x},${y}`).join(' ');}

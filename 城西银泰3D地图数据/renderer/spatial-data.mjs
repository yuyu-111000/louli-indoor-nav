export function floorById(data,id){return data.floors.find(f=>f.id===id)||null;}
export function filterShops(data,query){
  const term=query.trim().toLocaleLowerCase();
  return term?data.floors.flatMap(f=>f.shops.filter(s=>s.name.toLocaleLowerCase().includes(term)).map(s=>({...s,floor:f.id}))):[];
}
export function polygonPoints(shape){return shape.map(([x,y])=>`${x},${y}`).join(' ');}
export function visibleSideFaces(shape,depth){
  const signedArea=shape.reduce((sum,[x,y],i)=>{const [nx,ny]=shape[(i+1)%shape.length];return sum+x*ny-nx*y;},0);
  if(!signedArea)return [];
  return shape.flatMap(([x,y],i)=>{
    const [nx,ny]=shape[(i+1)%shape.length];
    return (nx-x)*signedArea<0?[[[x,y],[nx,ny],[nx,ny+depth],[x,y+depth]]]:[];
  });
}

/* Illustrative BLE anchors: entrances, corridor junctions and service doors.
 * Use the venue geometry, with spacing to avoid overlapping display markers.
 * These are simulated placements, not a surveyed radio coverage plan.
 */
function buildBeaconLayout(map,poi) {
  const candidates=[];
  const add=(x,y,kind)=>{
    const cell=nearestCell(x,y);
    if(cell<0)return;
    candidates.push({...cellPt(cell),kind});
  };
  map.entrances.forEach(e=>add(e.x,e.y,'entrance'));
  if(map.trace)map.rooms.forEach(r=>add(r.dx+r.ix*3,r.dy+r.iy*3,poi[r.id]?.c==='food'?'service':'junction'));
  for(let i=0;i<map.corridors.length;i++)for(let j=i+1;j<map.corridors.length;j++){
    const a=map.corridors[i],b=map.corridors[j];
    const left=Math.max(a[0],b[0]),right=Math.min(a[2],b[2]);
    const top=Math.max(a[1],b[1]),bottom=Math.min(a[3],b[3]);
    if(right>left&&bottom>top)add((left+right)/2,(top+bottom)/2,'junction');
  }
  map.rooms.filter(r=>['svc','service','fac'].includes(poi[r.id]?.c)).forEach(r=>add(r.dx+r.ix*2,r.dy+r.iy*2,'service'));
  // Fill long corridors between anchors to illustrate overlapping observations.
  for(const [x0,y0,x1,y1] of map.corridors){
    const horizontal=x1-x0>=y1-y0,length=horizontal?x1-x0:y1-y0;
    const count=Math.max(1,Math.ceil(length/24));
    for(let i=0;i<count;i++)add(horizontal?x0+(i+.5)*(x1-x0)/count:(x0+x1)/2,horizontal?(y0+y1)/2:y0+(i+.5)*(y1-y0)/count,'corridor');
  }
  const points=[],spacing=Math.max(4,Math.min(map.width,map.height)*.08);
  for(const point of candidates){
    if(points.every(other=>Math.hypot(other.x-point.x,other.y-point.y)>=spacing))points.push({...point,id:`B${String(points.length+1).padStart(2,'0')}`});
    if(points.length===12)break;
  }
  return points;
}

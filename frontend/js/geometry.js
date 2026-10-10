/* Building geometry: metres in legacy maps, relative units in photo traces. */
const MAP=window.LouliSession.bundle.map;
const TRACE=MAP.trace||null;
const BW=MAP.width,BH=MAP.height,RES=MAP.resolution,GW=Math.round(BW/RES),GH=Math.round(BH/RES);
const CORR=MAP.corridors;
const SLOTS=MAP.rooms.map(s=>{const mark=TRACE?.points.find(p=>p.id===s.id);return {...s,tx:s.dx+s.ix*3,ty:s.dy+s.iy*3,cx:mark?.x??(s.x0+s.x1)/2,cy:mark?.y??(s.y0+s.y1)/2};});
const SL=Object.fromEntries(SLOTS.map(s=>[s.id,s]));
const FOUNTAIN=MAP.fountain, ESC=MAP.escalator, ENTR=MAP.entrances;

const walk=new Uint8Array(GW*GH);
const gi=(gx,gy)=>gy*GW+gx;
const toG=v=>Math.floor(v/RES);
function inGrid(gx,gy){return gx>=0&&gy>=0&&gx<GW&&gy<GH;}
function isWalk(x,y){const gx=toG(x),gy=toG(y);return inGrid(gx,gy)&&walk[gi(gx,gy)]===1;}
function fillRect(x0,y0,x1,y1,v){for(let gy=Math.max(0,toG(y0));gy<Math.min(GH,Math.ceil(y1/RES));gy++)for(let gx=Math.max(0,toG(x0));gx<Math.min(GW,Math.ceil(x1/RES));gx++){const cx=(gx+.5)*RES,cy=(gy+.5)*RES;if(cx>x0&&cx<x1&&cy>y0&&cy<y1)walk[gi(gx,gy)]=v;}}
function setW(x,y,v){const gx=toG(x),gy=toG(y);if(inGrid(gx,gy))walk[gi(gx,gy)]=v;}
function pointInPolygon(x,y,shape){let inside=false;for(let i=0,j=shape.length-1;i<shape.length;j=i++){const [ax,ay]=shape[i],[bx,by]=shape[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;}
CORR.forEach(r=>fillRect(...r,1));
if(TRACE){
  const obstacles=[...TRACE.zones.map(z=>z.shape),...TRACE.inferredObstacles];
  for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){
    const x=(gx+.5)*RES,y=(gy+.5)*RES;
    walk[gi(gx,gy)]=pointInPolygon(x,y,TRACE.outline)&&!obstacles.some(shape=>pointInPolygon(x,y,shape))?1:0;
  }
}else{
SLOTS.forEach(s=>fillRect(s.x0+.5,s.y0+.5,s.x1-.5,s.y1-.5,1));
for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){const x=(gx+.5)*RES,y=(gy+.5)*RES;if(hyp(x-FOUNTAIN.x,y-FOUNTAIN.y)<FOUNTAIN.r)walk[gi(gx,gy)]=0;}
fillRect(...ESC,0);
SLOTS.forEach(s=>{const tx=-s.iy,ty=s.ix;for(let t=-1.2;t<=1.2;t+=.2)for(let u=-1;u<=1.3;u+=.2)setW(s.dx+tx*t+s.ix*u,s.dy+ty*t+s.iy*u,1);});
}

// clearance (chamfer distance transform, in cells)
const clr=new Float32Array(GW*GH);
(()=>{for(let i=0;i<clr.length;i++)clr[i]=walk[i]?1e6:0;const D=1.4142;
  for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const i=gi(x,y);if(!clr[i])continue;let v=clr[i];
    if(x>0)v=Math.min(v,clr[i-1]+1);if(y>0){v=Math.min(v,clr[i-GW]+1);if(x>0)v=Math.min(v,clr[i-GW-1]+D);if(x<GW-1)v=Math.min(v,clr[i-GW+1]+D);}clr[i]=v;}
  for(let y=GH-1;y>=0;y--)for(let x=GW-1;x>=0;x--){const i=gi(x,y);if(!clr[i])continue;let v=clr[i];
    if(x<GW-1)v=Math.min(v,clr[i+1]+1);if(y<GH-1){v=Math.min(v,clr[i+GW]+1);if(x<GW-1)v=Math.min(v,clr[i+GW+1]+D);if(x>0)v=Math.min(v,clr[i+GW-1]+D);}clr[i]=v;}
})();

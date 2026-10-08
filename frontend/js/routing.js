/* ============ path planning ============ */
class Heap{constructor(){this.i=[];this.f=[];}
  get n(){return this.i.length;}
  clear(){this.i.length=0;this.f.length=0;}
  push(k,f){const I=this.i,F=this.f;let p=I.length;I.push(k);F.push(f);while(p>0){const q=(p-1)>>1;if(F[q]<=f)break;I[p]=I[q];F[p]=F[q];p=q;}I[p]=k;F[p]=f;}
  pop(){const I=this.i,F=this.f;const top=I[0];const k=I.pop(),f=F.pop();const n=I.length;if(n){let p=0;for(;;){let c=2*p+1;if(c>=n)break;if(c+1<n&&F[c+1]<F[c])c++;if(F[c]>=f)break;I[p]=I[c];F[p]=F[c];p=c;}I[p]=k;F[p]=f;}return top;}}
const heap=new Heap();
const NB=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.4142],[1,-1,1.4142],[-1,1,1.4142],[-1,-1,1.4142]];
function nearestCell(x,y){const gx=clamp(toG(x),0,GW-1),gy=clamp(toG(y),0,GH-1);if(walk[gi(gx,gy)])return gi(gx,gy);
  for(let r=1;r<40;r++){let best=-1,bd=1e9;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const X=gx+dx,Y=gy+dy;if(!inGrid(X,Y)||!walk[gi(X,Y)])continue;const d=dx*dx+dy*dy;if(d<bd){bd=d;best=gi(X,Y);}}if(best>=0)return best;}return -1;}
const cellPt=i=>({x:(i%GW+.5)*RES,y:((i/GW|0)+.5)*RES});
function nearestWalkPt(x,y){return isWalk(x,y)?{x,y}:cellPt(nearestCell(x,y));}
function wallCost(n){const c=clr[n]*RES;return c<1.6?1+(1.6-c)*1.3:1;}
function expand(s,t,useCost){
  const g=new Float32Array(GW*GH).fill(Infinity),came=new Int32Array(GW*GH).fill(-1),closed=new Uint8Array(GW*GH);
  const tx=t>=0?t%GW:0,ty=t>=0?(t/GW|0):0;
  const h=t>=0?(i=>{const dx=Math.abs(i%GW-tx),dy=Math.abs((i/GW|0)-ty);return dx+dy-0.5858*Math.min(dx,dy);}):(()=>0);
  heap.clear();g[s]=0;heap.push(s,h(s));
  while(heap.n){const cur=heap.pop();if(closed[cur])continue;closed[cur]=1;if(cur===t)break;const cx=cur%GW,cy=cur/GW|0;
    for(const [dx,dy,w] of NB){const nx=cx+dx,ny=cy+dy;if(!inGrid(nx,ny))continue;const n=gi(nx,ny);if(!walk[n]||closed[n])continue;
      if(dx&&dy&&(!walk[gi(cx+dx,cy)]||!walk[gi(cx,cy+dy)]))continue;
      const ng=g[cur]+w*(useCost?wallCost(n):1);if(ng<g[n]){g[n]=ng;came[n]=cur;heap.push(n,ng+h(n));}}}
  return {g,came};}
function distField(x,y){const s=nearestCell(x,y);return expand(s,-1,false).g;}
function los(a,b,s0,e0){const L=hyp(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(L/.25));
  for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;const gx=toG(x),gy=toG(y);if(!inGrid(gx,gy))return false;const k=gi(gx,gy);if(!walk[k])return false;
    if(clr[k]*RES<0.8&&hyp(x-s0.x,y-s0.y)>2.5&&hyp(x-e0.x,y-e0.y)>2.5)return false;}return true;}
function astar(ax,ay,bx,by){
  const a=nearestWalkPt(ax,ay),b=nearestWalkPt(bx,by);const s=nearestCell(a.x,a.y),t=nearestCell(b.x,b.y);if(s<0||t<0)return null;
  const {came}=expand(s,t,true);if(s!==t&&came[t]<0)return null;
  const cells=[];for(let c=t;c!==-1;c=came[c]){cells.push(c);if(c===s)break;}cells.reverse();
  const pts=cells.map(cellPt);pts[0]=a;pts[pts.length-1]=b;if(pts.length===1)pts.push({...b});
  const out=[pts[0]];let i=0;const n=pts.length;
  while(i<n-1){let j=i+1;for(let k=i+2;k<n;k++){if(los(pts[i],pts[k],a,b))j=k;else if(k-j>8)break;}out.push(pts[j]);i=j;}
  return makeRoute(out);}
function makeRoute(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hyp(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));
  const r={pts,cum,len:cum[cum.length-1],turns:[]};
  for(let i=1;i<pts.length-1;i++){const a=Math.atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x),b=Math.atan2(pts[i+1].y-pts[i].y,pts[i+1].x-pts[i].x);const ang=wrap(b-a);
    if(Math.abs(ang)>rad(28))r.turns.push({s:cum[i],ang,x:pts[i].x,y:pts[i].y});}
  return r;}
function pointAt(r,s){s=clamp(s,0,r.len);let i=1;while(i<r.cum.length-1&&r.cum[i]<s)i++;const a=r.pts[i-1],b=r.pts[i];const L=r.cum[i]-r.cum[i-1]||1;const t=(s-r.cum[i-1])/L;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,h:Math.atan2(b.y-a.y,b.x-a.x)};}
function project(r,p){let best={d:1e9,s:0,x:p.x,y:p.y};for(let i=1;i<r.pts.length;i++){const a=r.pts[i-1],b=r.pts[i];const vx=b.x-a.x,vy=b.y-a.y;const L2=vx*vx+vy*vy||1;
  const t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/L2,0,1);const x=a.x+vx*t,y=a.y+vy*t;const d=hyp(p.x-x,p.y-y);if(d<best.d)best={d,s:r.cum[i-1]+Math.sqrt(L2)*t,x,y};}return best;}

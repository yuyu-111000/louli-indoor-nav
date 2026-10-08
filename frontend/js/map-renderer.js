/* ============ rendering: map ============ */
const cv=$('#map'),ctx=cv.getContext('2d'),chart=$('#chart'),cctx=chart.getContext('2d');
let T={},dpr=1;
function readTheme(){const cs=getComputedStyle(document.documentElement);
  ['ground','block','floor','wall','ink','muted','faint','panel','line','accent','route-edge','me','me-soft','warn','bad','c-gps','c-fp','c-pdr','c-ekf','c-truth','t1','t2','t3','t4','t5','t6','g1','g2','g3','g4','g5','g6','water','done']
  .forEach(k=>T[k]=cs.getPropertyValue('--'+k).trim());}
function resize(){dpr=window.devicePixelRatio||1;cv.width=cv.clientWidth*dpr;cv.height=cv.clientHeight*dpr;const r=chart.getBoundingClientRect();chart.width=r.width*dpr;chart.height=r.height*dpr;}
const isMob=()=>innerWidth<=760;
function mapArea(){const W=cv.clientWidth,H=cv.clientHeight;if(window.LouliSession.embed)return {l:28,r:W-28,t:window.LouliSession.bundle.venue.location?145:100,b:H-74};return isMob()?{l:10,r:W-10,t:200,b:H*.54-6}:{l:404,r:W>1200?W-366:W-70,t:20,b:H-20};}
function fit(){const a=mapArea();let s=Math.min((a.r-a.l)/BW,(a.b-a.t)/BH);if(isMob()&&!window.LouliSession.embed)s=Math.max(s,4.2);view.s=s;
  const cx=isMob()&&!window.LouliSession.embed?BW/2:BW/2,cy=isMob()&&!window.LouliSession.embed?BH*.74:BH/2;view.ox=(a.l+a.r)/2-cx*s;view.oy=(a.t+a.b)/2-cy*s;}
function zoomAt(px,py,ns){ns=clamp(ns,1.5,40);const wx=(px-view.ox)/view.s,wy=(py-view.oy)/view.s;view.s=ns;view.ox=px-wx*ns;view.oy=py-wy*ns;}
function centerOn(x,y,k){const a=mapArea();const tx=(a.l+a.r)/2-x*view.s,ty=(a.t+a.b)/2-y*view.s;view.ox+=(tx-view.ox)*k;view.oy+=(ty-view.oy)*k;}
const W2S=(x,y)=>[view.ox+x*view.s,view.oy+y*view.s];
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const FONT='"Noto Sans SC",-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
function drawMap(now){
  const W=cv.clientWidth,H=cv.clientHeight,s=view.s;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=T.ground;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(view.ox,view.oy);ctx.scale(s,s);
  rr(ctx,-.6,-.6,BW+1.2,BH+1.2,1.6);ctx.fillStyle=T.block;ctx.fill();ctx.lineWidth=2.2/s;ctx.strokeStyle=T.wall;ctx.stroke();
  ctx.fillStyle=T.floor;CORR.forEach(([x0,y0,x1,y1])=>ctx.fillRect(x0,y0,x1-x0,y1-y0));
  // atrium details
  ctx.beginPath();ctx.arc(FOUNTAIN.x,FOUNTAIN.y,FOUNTAIN.r,0,Math.PI*2);ctx.fillStyle=T.water;ctx.fill();ctx.lineWidth=1/s;ctx.strokeStyle=T.wall;ctx.stroke();
  ctx.fillStyle=T.block;ctx.fillRect(ESC[0],ESC[1],ESC[2]-ESC[0],ESC[3]-ESC[1]);ctx.strokeStyle=T.wall;ctx.lineWidth=1/s;
  for(let y=ESC[1]+1;y<ESC[3];y+=1){ctx.beginPath();ctx.moveTo(ESC[0]+.6,y);ctx.lineTo(ESC[2]-.6,y);ctx.stroke();}
  ctx.strokeRect(ESC[0],ESC[1],ESC[2]-ESC[0],ESC[3]-ESC[1]);
  // shops
  for(const sl of SLOTS){const p=V.poi[sl.id];const k=catOf(p)[2];ctx.fillStyle=T['t'+k];ctx.fillRect(sl.x0+.25,sl.y0+.25,sl.x1-sl.x0-.5,sl.y1-sl.y0-.5);
    ctx.lineWidth=(sl.id===selId?2.4:1)/s;ctx.strokeStyle=sl.id===selId?T.accent:T.wall;ctx.strokeRect(sl.x0+.25,sl.y0+.25,sl.x1-sl.x0-.5,sl.y1-sl.y0-.5);
    const tx=-sl.iy,ty=sl.ix;ctx.fillStyle=T.floor;ctx.save();ctx.translate(sl.dx,sl.dy);ctx.rotate(Math.atan2(ty,tx));ctx.fillRect(-1.1,-.45,2.2,.9);ctx.restore();}
  // emitters
  if(layers.nodes){for(const a of APS){ctx.strokeStyle=T.faint;ctx.lineWidth=1.3/s;for(let r=1;r<=2;r++){ctx.beginPath();ctx.arc(a.x,a.y+.5,r*.55,-Math.PI*.78,-Math.PI*.22);ctx.stroke();}ctx.beginPath();ctx.arc(a.x,a.y+.5,.18,0,7);ctx.fillStyle=T.faint;ctx.fill();}
    if(sim.src==='fused')for(const b of BCN){const r=.55;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6;ctx.lineTo(b.x+r*Math.cos(a),b.y+r*Math.sin(a));}ctx.closePath();ctx.fillStyle=T.accent;ctx.globalAlpha=.85;ctx.fill();ctx.globalAlpha=1;}}
  // route
  const showRoute=nav.active&&nav.route;
  if(showRoute){const r=nav.route;const prog=project(r,disp).s;
    const line=(from,to,col,w)=>{ctx.beginPath();const a=pointAt(r,from);ctx.moveTo(a.x,a.y);for(let i=1;i<r.pts.length;i++)if(r.cum[i]>from&&r.cum[i]<to)ctx.lineTo(r.pts[i].x,r.pts[i].y);const b=pointAt(r,to);ctx.lineTo(b.x,b.y);ctx.strokeStyle=col;ctx.lineWidth=w/s;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();};
    line(0,prog,T.done,7);line(prog,r.len,T['route-edge'],9);line(prog,r.len,T.accent,6.5);
    ctx.strokeStyle=T.panel;ctx.lineWidth=1.8/s;const step=Math.max(3,46/s);
    for(let d=prog+step/2;d<r.len-1;d+=step){const p=pointAt(r,d),a=2.2/s*3.2;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.h);ctx.beginPath();ctx.moveTo(-a*.5,-a*.6);ctx.lineTo(a*.4,0);ctx.lineTo(-a*.5,a*.6);ctx.stroke();ctx.restore();}}
  // plan preview
  if(!nav.active&&ui.tab==='plan'&&ui.plan&&ui.planRoute){ctx.setLineDash([1.2,1]);ctx.strokeStyle=T.accent;ctx.lineWidth=3/s;ctx.beginPath();ui.planRoute.forEach((r,j)=>r.pts.forEach((p,i)=>(i===0&&j===0)?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)));ctx.stroke();ctx.setLineDash([]);}
  // sim layers
  const path=(arr,col,w,dash)=>{if(arr.length<2)return;ctx.beginPath();arr.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=col;ctx.lineWidth=w/s;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);};
  if(layers.pdr){path(sim.trail.pdr,T['c-pdr'],2,[4/s,3/s]);ctx.beginPath();ctx.arc(sim.pdr.x,sim.pdr.y,3.5/s,0,7);ctx.fillStyle=T['c-pdr'];ctx.fill();}
  if(layers.truth){path(sim.trail.truth,T['c-truth'],1.4,[1.5/s,2.5/s]);}
  if(layers.fp){sim.raw.forEach(p=>{const a=clamp(1-(sim.t-p.t)/16,0,1);ctx.globalAlpha=a*.9;ctx.beginPath();ctx.arc(p.x,p.y,3/s,0,7);ctx.fillStyle=T['c-fp'];ctx.fill();});ctx.globalAlpha=1;}
  if(layers.gps){const g=sim.gps;ctx.beginPath();ctx.arc(g.x,g.y,20,0,7);ctx.fillStyle=T['c-gps'];ctx.globalAlpha=.13;ctx.fill();ctx.globalAlpha=.7;ctx.lineWidth=1.2/s;ctx.strokeStyle=T['c-gps'];ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(g.x,g.y,5/s,0,7);ctx.fillStyle=T['c-gps'];ctx.fill();}
  // uncertainty ellipse
  if(ekf.ready){const P=ekf.P;const a=P[0][0],b=P[0][1],c=P[1][1];const tr2=(a+c)/2,dt=Math.sqrt(Math.max(0,((a-c)/2)**2+b*b));const l1=tr2+dt,l2=Math.max(.01,tr2-dt);const ang=.5*Math.atan2(2*b,a-c);
    ctx.save();ctx.translate(disp.x,disp.y);ctx.rotate(ang);ctx.beginPath();ctx.ellipse(0,0,Math.max(2*Math.sqrt(l1),.6),Math.max(2*Math.sqrt(l2),.6),0,0,7);ctx.fillStyle=T['me-soft'];ctx.fill();ctx.restore();}
  ctx.restore();
  // ---- screen space ----
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const sl of SLOTS){const p=V.poi[sl.id];const [cx,cy]=W2S(sl.cx,sl.cy);const w=(sl.x1-sl.x0)*s,h=(sl.y1-sl.y0)*s;if(w<20||h<20)continue;
    const k=catOf(p)[2];const showName=w>46&&h>40;const gy=showName?cy-9:cy;
    ctx.beginPath();ctx.arc(cx,gy,9,0,7);ctx.fillStyle=T['g'+k];ctx.fill();ctx.fillStyle=T.panel;ctx.font=`700 10.5px ${FONT}`;ctx.fillText(catOf(p)[1],cx,gy+.5);
    if(showName){ctx.font=`500 ${s>12?13:12}px ${FONT}`;let name=p.n;while(ctx.measureText(name).width>w-8&&name.length>2)name=name.slice(0,-1);if(name!==p.n)name=name.slice(0,-1)+'…';
      ctx.fillStyle=T.ink;ctx.fillText(name,cx,cy+9);
      if(s>11&&h>62){ctx.font=`11px ${FONT}`;ctx.fillStyle=T.muted;ctx.fillText(p.s,cx,cy+25);}
      const q=Q[sl.id];if(q&&s>8&&h>56){const txt=q.n>0?`等 ${q.n} ${q.unit}`:'无需等';ctx.font=`500 10.5px ${FONT}`;const tw=ctx.measureText(txt).width+10;const yy=cy+(s>11&&h>62?41:26);
        rr(ctx,cx-tw/2,yy-8,tw,16,5);ctx.fillStyle=q.n>4?T.warn:T.accent;ctx.globalAlpha=.16;ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=q.n>4?T.warn:T.accent;ctx.fillText(txt,cx,yy+.5);}}}
  if(s>3.5){ctx.font=`500 11px ${FONT}`;ctx.fillStyle=T.muted;for(const e of ENTR){const [x,y]=W2S(e.x,e.y);const o=e.a==='s'?[0,14]:e.a==='w'?[-26,0]:[26,0];ctx.fillText(e.t,x+o[0],y+o[1]);}
    if(s>6){const [fx,fy]=W2S(FOUNTAIN.x,FOUNTAIN.y);ctx.fillText('中庭',fx,fy);const [ex,ey]=W2S((ESC[0]+ESC[2])/2,(ESC[1]+ESC[3])/2);ctx.save();ctx.translate(ex,ey);ctx.fillStyle=T.muted;ctx.fillText('扶梯',0,0);ctx.restore();}}
  // stops
  const stops=nav.active?nav.legs.map((id,i)=>({id,i,done:i<nav.i})):(ui.tab==='plan'&&ui.plan?ui.plan.best.rows.map((r,i)=>({id:r.id,i,done:false})):[]);
  const seen={};for(const st of stops){const sl=SL[st.id];const [x,y]=W2S(sl.tx,sl.ty);const off=(seen[st.id]=(seen[st.id]||0)+1)-1;const X=x+off*18;
    ctx.beginPath();ctx.arc(X,y-16,11,0,7);ctx.fillStyle=st.done?T.done:T.accent;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=T.panel;ctx.stroke();ctx.beginPath();ctx.moveTo(X-4,y-7);ctx.lineTo(X,y-1);ctx.lineTo(X+4,y-7);ctx.fill();
    ctx.fillStyle=T.panel;ctx.font=`600 11.5px "JetBrains Mono",monospace`;ctx.fillText(String(st.i+1),X,y-15.5);}
  // truth marker
  if(layers.truth){const [x,y]=W2S(sim.truth.x,sim.truth.y);ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.lineWidth=2;ctx.strokeStyle=T['c-truth'];ctx.stroke();}
  // me
  if(ekf.ready){const [x,y]=W2S(disp.x,disp.y);const h=ekf.s[2];
    const g=ctx.createRadialGradient(x,y,0,x,y,34);g.addColorStop(0,T['me-soft']);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.save();ctx.translate(x,y);ctx.rotate(h);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,34,-.5,.5);ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.restore();
    const pulse=(now/1400)%1;ctx.beginPath();ctx.arc(x,y,9+pulse*14,0,7);ctx.strokeStyle=T.me;ctx.globalAlpha=(1-pulse)*.45;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(x,y,9,0,7);ctx.fillStyle=T.panel;ctx.fill();ctx.beginPath();ctx.arc(x,y,6.3,0,7);ctx.fillStyle=T.me;ctx.fill();}
  // scale bar
  const m=s>14?5:s>6?10:20;const bx=window.LouliSession.embed?W-64-m*s:isMob()?14:W-70-m*s-10,by=window.LouliSession.embed?H-38:isMob()?H*.54-22:H-20;ctx.strokeStyle=T.muted;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(bx,by-4);ctx.lineTo(bx,by);ctx.lineTo(bx+m*s,by);ctx.lineTo(bx+m*s,by-4);ctx.stroke();
  ctx.fillStyle=T.muted;ctx.font=`11px "JetBrains Mono",monospace`;ctx.textAlign='left';ctx.fillText(`${m} m`,bx+m*s+6,by-2);}

function drawChart(){const w=chart.width/dpr,h=chart.height/dpr;if(!w)return;cctx.setTransform(dpr,0,0,dpr,0,0);cctx.clearRect(0,0,w,h);
  const top=6,bot=h-14,left=22,ymax=12;const Y=v=>bot-(Math.min(v,ymax)/ymax)*(bot-top);
  cctx.font=`10px "JetBrains Mono",monospace`;cctx.textAlign='right';cctx.textBaseline='middle';
  for(const v of [0,4,8,12]){cctx.strokeStyle=T.line;cctx.lineWidth=1;cctx.beginPath();cctx.moveTo(left,Y(v));cctx.lineTo(w,Y(v));cctx.stroke();cctx.fillStyle=T.faint;cctx.fillText(v,left-5,Y(v));}
  cctx.textAlign='left';cctx.fillText('最近 60 秒 · 米',left,h-5);
  const H=sim.hist;if(H.length<2)return;const X=i=>left+(w-left)*(i+120-H.length)/119;
  for(const [k,col,lw] of [['gps','c-gps',1.2],['pdr','c-pdr',1.4],['fp','c-fp',1.2],['ekf','c-ekf',2.2]]){cctx.beginPath();let st=false;H.forEach((e,i)=>{if(isNaN(e[k]))return;const x=X(i),y=Y(e[k]);st?cctx.lineTo(x,y):cctx.moveTo(x,y);st=true;});
    cctx.strokeStyle=T[col];cctx.lineWidth=lw;cctx.stroke();}
  const e=H[H.length-1];cctx.beginPath();cctx.arc(X(H.length-1),Y(e.ekf),3,0,7);cctx.fillStyle=T['c-ekf'];cctx.fill();}

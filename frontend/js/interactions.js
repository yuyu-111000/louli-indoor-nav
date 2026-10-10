/* ============ toast ============ */
let toastTimer=null,toastFn=null;
function toast(text,action,fn){$('#toastText').textContent=text;const b=$('#toastBtn');b.hidden=!action;if(action)b.textContent=action;toastFn=fn||null;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,action?7000:4200);}
$('#toastBtn').onclick=()=>{$('#toast').hidden=true;toastFn&&toastFn();};

/* ============ events ============ */
$('#pbody').addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id;
  if(a==='open'){ui.detail=id;selId=id;const s=SL[id];if(isMob())$('#panel').classList.remove('collapsed');focusOn(s.cx,s.cy);}
  else if(a==='back'){ui.detail=null;selId=null;}
  else if(a==='go'){ui.detail=null;startConfirmedNav([id]);}
  else if(a==='fav'){favs.includes(id)?(favs=favs.filter(x=>x!==id),sel.delete(id)):(favs.push(id),sel.add(id));store('louli.fav.'+window.LouliSession.bundle.venue.id,favs);toast(favs.includes(id)?`已加入清单，在「${vKey==='mall'?'清单':'就诊'}」里一键规划路线`:'已移出清单');}
  else if(a==='take')takeTicket(id);
  else if(a==='sel'){el.checked?sel.add(id):sel.delete(id);return;}
  else if(a==='plan'){const ids=favs.filter(x=>sel.has(x)).slice(0,7);if(!ids.length){toast('先勾选至少一个地点');return;}doPlan([ids]);}
  else if(a==='hospplan')doPlan(V.flow.phases);
  else if(a==='startplan'){startConfirmedNav(ui.plan.best.rows.map(r=>r.id));ui.plan=null;}
  else if(a==='endnav')endNav(true);
  else if(a==='cancel'){tickets=tickets.filter(t=>t.tid!==el.dataset.tid);toast('已取消排号');}
  ui.dirty=true;});
function startConfirmedNav(ids){startNav(ids);if(window.LouliCare?.manualSteps||window.LouliCare?.reduceMotion){sim.paused=false;window.LouliSession.paintPlayback($('#pauseBtn'),true,{playing:'暂停',paused:'继续'});}}
function doPlan(phases){let combinations=1;for(const phase of phases)for(let i=2;i<=phase.length;i++)combinations*=i;if(phases.flat().length>12||combinations>10000){toast('演示版最多规划 12 个任务；请缩小同阶段的地点数量');return;}const next=plan(phases);if(!Number.isFinite(next.best?.t)){toast('任务之间暂无可通行路线，请检查走廊和门点');return;}ui.plan=next;ui.scrollPlan=true;let pos={x:disp.x,y:disp.y};ui.planRoute=ui.plan.best.rows.map(r=>{const s=SL[r.id];const rt=astar(pos.x,pos.y,s.tx,s.ty);pos={x:s.tx,y:s.ty};return rt;}).filter(Boolean);}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;ui.tab=b.dataset.tab;ui.detail=null;selId=nav.active?selId:null;ui.dirty=true;if(isMob())$('#panel').classList.remove('collapsed');});
$('#chips').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;ui.filter=b.dataset.f;document.querySelectorAll('#chips .fchip').forEach(x=>x.setAttribute('aria-pressed',x===b));ui.tab='near';ui.detail=null;ui.dirty=true;});
$('#q').addEventListener('input',e=>{ui.q=e.target.value;ui.tab='near';ui.detail=null;ui.dirty=true;});
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){const b=$('#pbody .poi');if(b)b.click();}});
$('#venueSeg').addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;location.href='demo.html?venue='+(b.dataset.v==='mall'?'yintai-demo':b.dataset.v);});
$('#srcSeg').addEventListener('click',e=>{const b=e.target.closest('[data-src]');if(!b)return;sim.src=b.dataset.src;document.querySelectorAll('#srcSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));sim.stats={gps:[],fp:[],pdr:[],ekf:[]};
  toast(sim.src==='fused'?'已加入楼里信标：每秒一次观测，误差统计已重置':'仅使用商场现有 WiFi：每 2 秒一次观测，误差统计已重置');});
$('#spdSeg').addEventListener('click',e=>{const b=e.target.closest('[data-spd]');if(!b)return;sim.speed=+b.dataset.spd;document.querySelectorAll('#spdSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));});
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>{const k=b.dataset.layer;layers[k]=!layers[k];b.setAttribute('aria-pressed',layers[k]);});
$('#pauseBtn').onclick=()=>{sim.paused=!sim.paused;window.LouliSession.paintPlayback($('#pauseBtn'),!sim.paused,{playing:'暂停',paused:'继续'});};
$('#resetBtn').onclick=()=>{sim.stats={gps:[],fp:[],pdr:[],ekf:[]};sim.hist=[];sim.pdr={x:sim.truth.x,y:sim.truth.y,h:sim.lastStep.h};sim.trail={truth:[],pdr:[],ekf:[]};toast('统计已重置，纯惯导从当前真实位置重新起算');};
$('#zin').onclick=()=>{const a=mapArea();zoomAt((a.l+a.r)/2,(a.t+a.b)/2,view.s*1.35);};
$('#zout').onclick=()=>{const a=mapArea();zoomAt((a.l+a.r)/2,(a.t+a.b)/2,view.s/1.35);};
$('#locate').onclick=()=>{follow=true;if(view.s<7){const a=mapArea();zoomAt((a.l+a.r)/2,(a.t+a.b)/2,8);}};
function setConsoleOpen(open){
  $('#console').classList.toggle('console-collapsed',!open);
  $('#console').classList.toggle('open',open);
  $('#console').inert=!open;
  $('#console').setAttribute('aria-hidden',String(!open));
  $('#conPill').classList.toggle('visible',!open);
  $('#conPill').setAttribute('aria-expanded',String(open));
}
setConsoleOpen(!isMob());
$('#conClose').onclick=()=>{setConsoleOpen(false);$('#conPill').focus({preventScroll:true});};
$('#conPill').onclick=()=>{setConsoleOpen(true);$('#conClose').focus({preventScroll:true});};
$('#handle').onclick=()=>$('#panel').classList.toggle('collapsed');
function focusOn(x,y){const a=mapArea();if(view.s<7)zoomAt((a.l+a.r)/2,(a.t+a.b)/2,7.5);follow=false;focusT={x,y,k:0};}
let focusT=null;

const panMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
// Screen-space limits keep the floor near its viewport while allowing resisted overscroll.
function panLimits(){
  const a=mapArea(),w=Math.max(1,a.r-a.l),h=Math.max(1,a.b-a.t);
  const cx=(a.l+a.r)/2-BW*view.s/2,cy=(a.t+a.b)/2-BH*view.s/2;
  const rx=Math.abs(BW*view.s-w)/2+w*.12,ry=Math.abs(BH*view.s-h)/2+h*.12;
  return {minX:cx-rx,maxX:cx+rx,minY:cy-ry,maxY:cy+ry};
}
function resistAxis(value,delta,min,max){
  const over=value<min?min-value:value>max?value-max:0;
  const outward=(value<min&&delta<0)||(value>max&&delta>0);
  const margin=64;
  return clamp(value+delta*(outward?Math.max(0,1-over/margin)**2:1),min-margin,max+margin);
}
function dragPan(dx,dy){const b=panLimits();view.ox=resistAxis(view.ox,dx,b.minX,b.maxX);view.oy=resistAxis(view.oy,dy,b.minY,b.maxY);}
function settlePan(dt){
  if(ptrs.size||follow||focusT)return;
  const b=panLimits(),x=clamp(view.ox,b.minX,b.maxX),y=clamp(view.oy,b.minY,b.maxY);
  const k=(panMotionPreference.matches||window.LouliCare?.reduceMotion)?1:1-Math.exp(-dt*14);
  view.ox+= (x-view.ox)*k;view.oy+=(y-view.oy)*k;
  if(Math.abs(x-view.ox)<.1)view.ox=x;if(Math.abs(y-view.oy)<.1)view.oy=y;
}

// map pointer
const ptrs=new Map();let moved=false,pinch=null,downAt=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});downAt={x:e.offsetX,y:e.offsetY};moved=false;cv.classList.add('dragging');
  if(ptrs.size===2){follow=false;focusT=null;const [a,b]=[...ptrs.values()];pinch={d:hyp(a.x-b.x,a.y-b.y)||1,s:view.s,wx:((a.x+b.x)/2-view.ox)/view.s,wy:((a.y+b.y)/2-view.oy)/view.s};}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;const pv=ptrs.get(e.pointerId),cur={x:e.offsetX,y:e.offsetY};ptrs.set(e.pointerId,cur);
  if(ptrs.size===1){if(hyp(cur.x-downAt.x,cur.y-downAt.y)>4)moved=true;if(moved){dragPan(cur.x-pv.x,cur.y-pv.y);follow=false;focusT=null;}}
  else if(ptrs.size===2&&pinch){const [a,b]=[...ptrs.values()];const ns=clamp(pinch.s*hyp(a.x-b.x,a.y-b.y)/pinch.d,1.5,40);view.s=ns;view.ox=(a.x+b.x)/2-pinch.wx*ns;view.oy=(a.y+b.y)/2-pinch.wy*ns;const bounds=panLimits();view.ox=clamp(view.ox,bounds.minX-64,bounds.maxX+64);view.oy=clamp(view.oy,bounds.minY-64,bounds.maxY+64);moved=true;follow=false;focusT=null;}});
const up=e=>{if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)cv.classList.remove('dragging');if(!moved&&e.type==='pointerup')tap(e.offsetX,e.offsetY);};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('lostpointercapture',e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)cv.classList.remove('dragging');});
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,view.s*Math.exp(-e.deltaY*.0015));focusT=null;},{passive:false});
function tap(px,py){const x=(px-view.ox)/view.s,y=(py-view.oy)/view.s;
  let sl;
  if(TRACE){
    sl=SLOTS.find(s=>hyp(s.cx-x,s.cy-y)*view.s<18);
    if(!sl){const zone=TRACE.zones.find(z=>pointInPolygon(x,y,z.shape));const marks=TRACE.points.filter(p=>p.zoneId===zone?.id).sort((a,b)=>hyp(a.x-x,a.y-y)-hyp(b.x-x,b.y-y));sl=SL[marks[0]?.id];}
  }else sl=SLOTS.find(s=>x>=s.x0&&x<=s.x1&&y>=s.y0&&y<=s.y1);
  if(sl){ui.detail=sl.id;selId=sl.id;ui.dirty=true;if(window.LouliSession.embed)parent.postMessage({type:'louli-map-selected',id:sl.id},location.origin);if(isMob())$('#panel').classList.remove('collapsed');}}

/* ============ navigation ============ */
function startNav(ids){
  if(!ids.length)return;nav.active=true;nav.legs=ids.slice();nav.i=0;nav.waiting=false;nav.route=null;follow=true;
  ids.forEach(id=>{const p=P(id);if(p.q&&!tickets.some(t=>t.poi===id&&t.status!=='done'))takeTicket(id,true);});
  ui.tab='nav';ui.detail=null;ui.dirty=true;document.body.classList.add('navving');startLeg();}
function startLeg(){const s=SL[nav.legs[nav.i]];nav.route=astar(disp.x,disp.y,s.tx,s.ty);walkTo(s.tx,s.ty);nav.waiting=false;nav.lastReroute=sim.t;selId=s.id;ui.dirty=true;}
function arriveLeg(){const p=P(nav.legs[nav.i]);const last=nav.i>=nav.legs.length-1;
  const t=tickets.find(t=>t.poi===p.id&&t.status!=='done');
  toast(last?`已到达「${p.n}」，导航结束`:`已到达「${p.n}」，${t&&t.ahead>0?`前面还有 ${t.ahead} ${t.unit}，先`:''}稍作停留后前往下一站`);
  if(last){later(2,()=>endNav(false));}else{nav.waiting=true;nav.route=null;later(3,()=>{if(!nav.active)return;nav.i++;startLeg();});}ui.dirty=true;}
function endNav(user){sim.timers=[];nav.active=false;nav.route=null;nav.legs=[];follow=false;document.body.classList.remove('navving');$('#navbanner').hidden=true;
  if(user&&sim.walk)sim.walk.done=true;sim.roamWait=4;if(ui.tab==='nav')ui.tab='near';ui.dirty=true;}
function turnWord(a){const d=Math.abs(a);if(d>rad(135))return '掉头';if(d<rad(55))return a>0?'向右前方走':'向左前方走';return a>0?'右转':'左转';}
function landmark(x,y,ex){let best=null,bd=10;for(const s of SLOTS){if(s.id===ex||V.poi[s.id].c==='fac')continue;const d=hyp(s.dx-x,s.dy-y);if(d<bd){bd=d;best=V.poi[s.id].n;}}
  if(!best&&FOUNTAIN.r>0&&hyp(x-FOUNTAIN.x,y-FOUNTAIN.y)<12)best='中庭喷泉';return best;}
function navInstr(){const r=nav.route;if(!r)return null;const pr=project(r,disp);const s=pr.s,remain=Math.max(0,r.len-s);const dest=P(nav.legs[nav.i]);
  const next=r.turns.find(t=>t.s>s+.8);
  if(next){const d=next.s-s;const w=turnWord(next.ang);const lm=landmark(next.x,next.y,dest.id);
    return {icon:Math.abs(next.ang)>rad(135)?'u':next.ang>0?'right':'left',main:d<4?w:TRACE?`前方${w}`:`${Math.round(d)} 米后${w}`,sub:lm?`在「${lm}」附近`:'沿通道继续前行',remain,s};}
  return {icon:remain<6?'arrive':'up',main:remain<4?'即将到达':TRACE?'沿图上路线直行':`直行 ${Math.round(remain)} 米`,sub:`到达「${dest.n}」${TRACE?'附近的演示接近点':''}`,remain,s};}
const ICONS={
  up:'<path d="M22 36V10M12 20l10-10 10 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  left:'<path d="M28 38V22a6 6 0 0 0-6-6H10M17 9l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  right:'<path d="M16 38V22a6 6 0 0 1 6-6h12M27 9l7 7-7 7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  u:'<path d="M14 38V18a8 8 0 0 1 16 0v12M23 24l7 7 7-7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  arrive:'<path d="M22 40s12-11 12-20a12 12 0 0 0-24 0c0 9 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="22" cy="20" r="4" fill="currentColor"/>'};

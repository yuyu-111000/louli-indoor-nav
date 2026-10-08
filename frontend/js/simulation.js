/* ============ app state ============ */
const SPEED=1.25,STEP_L=.68,QACC=24;
const sim={};const nav={active:false};const view={s:6,ox:0,oy:0};
const layers={truth:false,fp:false,pdr:false,gps:false,nodes:false};
let Q={},tickets=[],favs=[],sel=new Set(),field=null,fieldAt=-1e9,disp={...window.LouliSession.bundle.map.start},follow=false,selId=null;
const ui={tab:'near',detail:null,filter:'all',q:'',plan:null,dirty:true};

function resetSim(){
  Object.assign(sim,{t:0,speed:sim.speed||1,paused:sim.paused||false,src:sim.src||'wifi',truth:{...window.LouliSession.bundle.map.start},walk:null,timers:[],lastStep:{...window.LouliSession.bundle.map.start,h:-Math.PI/2,t:0},
    gyroBias:(Math.random()<.5?-1:1)*rad(.35),pdr:null,gps:{bx:0,by:0,x:MAP.start.x,y:MAP.start.y},fix:null,raw:[],trail:{truth:[],pdr:[],ekf:[]},
    nextScan:.2,nextGps:0,nextErr:.5,hist:[],stats:{gps:[],fp:[],pdr:[],ekf:[]},lastRoam:null,roamWait:1.5});
  const a=Math.random()*Math.PI*2;sim.gps.bx=Math.cos(a)*24;sim.gps.by=Math.sin(a)*24;
  const h0=-Math.PI/2+gauss()*rad(12);sim.pdr={...window.LouliSession.bundle.map.start,h:h0};sim.h0=h0;
  ekf.ready=false;disp={...window.LouliSession.bundle.map.start};}
function later(sec,fn){sim.timers.push({t:sim.t+sec,fn});}

/* ============ simulation step ============ */
function walkTo(tx,ty){const r=astar(sim.truth.x,sim.truth.y,tx,ty);if(!r)return false;sim.walk={route:r,s:0,done:false};return true;}
function emitStep(){const T=sim.truth,ls=sim.lastStep;const L=hyp(T.x-ls.x,T.y-ls.y);const h=Math.atan2(T.y-ls.y,T.x-ls.x);
  const dpsi=wrap(h-ls.h),dt=sim.t-ls.t;const Lm=L*(1+gauss()*.06);const dPm=dpsi+gauss()*rad(1.2)+sim.gyroBias*dt;
  sim.lastStep={x:T.x,y:T.y,h,t:sim.t};
  const p=sim.pdr;p.h+=dPm;p.x+=Lm*Math.cos(p.h);p.y+=Lm*Math.sin(p.h);push(sim.trail.pdr,{x:p.x,y:p.y},400);
  if(ekf.ready)ekfPredict(Lm,dPm);push(sim.trail.truth,{x:T.x,y:T.y},400);}
function push(a,v,n){a.push(v);if(a.length>n)a.shift();}
function doScan(){const useB=sim.src==='fused';const m=scan(sim.truth.x,sim.truth.y);
  const fix=wknn(m,useB?ALL_IDX:AP_IDX,ekf.ready?{x:ekf.s[0],y:ekf.s[1]}:null);if(!fix)return;
  sim.fix=fix;push(sim.raw,{x:fix.x,y:fix.y,t:sim.t},16);
  if(!ekf.ready){ekfInit(fix.x,fix.y,sim.h0);disp={x:fix.x,y:fix.y};return;}
  ekfUpdate(fix.x,fix.y,clamp(fix.spread*.8+(useB?1.3:2.4),1.4,6));push(sim.trail.ekf,{x:ekf.s[0],y:ekf.s[1]},400);}
function stepSim(h){
  sim.t+=h;const W=sim.walk;
  if(W&&!W.done){W.s=Math.min(W.route.len,W.s+SPEED*h);const p=pointAt(W.route,W.s);sim.truth.x=p.x;sim.truth.y=p.y;
    const d=hyp(p.x-sim.lastStep.x,p.y-sim.lastStep.y);if(d>=STEP_L||(W.s>=W.route.len&&d>.2))emitStep();
    if(W.s>=W.route.len){W.done=true;onWalkDone();}}
  else if(!nav.active&&$('#roamChk').checked){sim.roamWait-=h;if(sim.roamWait<=0){roam();sim.roamWait=2.5;}}
  sim.gyroBias+=gauss()*rad(.01)*Math.sqrt(h);
  for(let i=sim.timers.length-1;i>=0;i--)if(sim.timers[i].t<=sim.t){const f=sim.timers[i].fn;sim.timers.splice(i,1);f();}
  sim.nextScan-=h;if(sim.nextScan<=0){sim.nextScan+=sim.src==='fused'?1:2;doScan();}
  sim.nextGps-=h;if(sim.nextGps<=0){sim.nextGps+=1;const g=sim.gps;g.bx+=-.03*g.bx+gauss()*2+(g.bx>0?.7:-.7);g.by+=-.03*g.by+gauss()*2;g.x=sim.truth.x+g.bx+gauss()*4;g.y=sim.truth.y+g.by+gauss()*4;}
  sim.nextErr-=h;if(sim.nextErr<=0&&ekf.ready){sim.nextErr+=.5;const T=sim.truth;
    const e={gps:hyp(sim.gps.x-T.x,sim.gps.y-T.y),fp:sim.fix?hyp(sim.fix.x-T.x,sim.fix.y-T.y):NaN,pdr:hyp(sim.pdr.x-T.x,sim.pdr.y-T.y),ekf:hyp(ekf.s[0]-T.x,ekf.s[1]-T.y)};
    push(sim.hist,e,120);for(const k in e)if(!isNaN(e[k]))push(sim.stats[k],e[k],6000);}
}
function roam(){const cand=SLOTS.filter(s=>s.id!==sim.lastRoam&&V.poi[s.id].c!=='fac');const s=cand[Math.random()*cand.length|0];sim.lastRoam=s.id;walkTo(s.tx,s.ty);}
function onWalkDone(){if(nav.active)arriveLeg();}

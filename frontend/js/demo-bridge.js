// The simulation scripts share a page scope; only this small facade is public.
const sourceLabel=TRACE?`${TRACE.floor} 导览照片数据 · 通路与定位演示`:window.LouliSession.bundle.venue.location?'真实室外地点 · 室内示意图':window.LouliSession.bundle.venue.source==='synthetic'?'虚构场馆':'用户提供的场馆数据';
const mapStatus=document.createElement('div');mapStatus.className='map-status';
mapStatus.textContent=`仿真位置 · ${sourceLabel} · ${window.LouliSession.connected?'接口已连接':'本地演示数据'}`;
document.querySelector('#app').append(mapStatus);
if(TRACE){document.querySelector('.eNow small').textContent=' 图上单位';document.querySelector('.con-sub').textContent='模拟误差 · 照片未标定比例';}
document.querySelector('#roamChk').checked=false;
sim.src='fused';sim.speed=4;
document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',layers[b.dataset.layer]));
document.querySelectorAll('[data-src]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.src===sim.src));
document.querySelectorAll('[data-spd]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.spd)===sim.speed));
function syncQueueRows(rows){
  const next={};
  for(const row of rows){
    const old=Q[row.poiId]?.n;
    next[row.poiId]={n:row.ahead,rate:row.minutesPerPerson,unit:row.unit,acc:0};
    for(const t of tickets.filter(t=>t.poi===row.poiId&&t.status!=='done')){
      if(old!==undefined)t.ahead=Math.max(0,t.ahead-(old-row.ahead));
      const previous=t.status;t.rate=row.minutesPerPerson;t.unit=row.unit;
      if(t.ahead===0)t.status='called';else if(t.ahead<=2)t.status='soon';else t.status='wait';
      if(previous!==t.status&&['soon','called'].includes(t.status))toast(`模拟队列提醒：「${V.poi[row.poiId].n}」${t.status==='called'?'已轮到本页号码':'快轮到了，可以准备返回'}`);
    }
    if(V.poi[row.poiId])V.poi[row.poiId].q=[row.ahead,row.minutesPerPerson,row.unit];
  }
  for(const id of Object.keys(Q))if(!next[id]&&V.poi[id])delete V.poi[id].q;
  Q=next;ui.dirty=true;
}
window.LouliDemo={
  bundle:window.LouliSession.bundle,
  select(id){if(!SL[id])return;selId=id;ui.detail=id;ui.dirty=true;drawMap(performance.now());},
  reset(){endNav(true);$('#toast').hidden=true;clearTimeout(toastTimer);sim.paused=!!(window.LouliCare?.manualSteps||window.LouliCare?.reduceMotion);resetSim();doScan();initVenue(vKey);ui.tab='plan';layers.nodes=false;resize();fit();follow=false;},
  pause(value){sim.paused=value;window.LouliSession.paintPlayback($('#pauseBtn'),!value,{playing:'暂停',paused:'继续'});},
  chapter(action,ids){
    endNav(true);$('#toast').hidden=true;clearTimeout(toastTimer);layers.nodes=action==='hardware';ui.plan=null;follow=false;
    if(action==='overview'){ui.tab='plan';sim.speed=4;fit();}
    if(action==='navigate'){
      const target=SL[ids[0]];
      if(target&&astar(sim.truth.x,sim.truth.y,target.tx,target.ty))startNav(ids);
      else toast('此地图暂无可通行路线，请补充连接走廊与门点');
      sim.speed=6;fit();follow=false;
    }
    if(action==='queue'){ui.tab='queue';const id=ids[0];takeTicket(id,true);const t=tickets.find(t=>t.poi===id);if(t){t.ahead=1;t.status='soon';}toast(`模拟提醒：快轮到「${P(id).n}」了，可以准备返回`);}
    if(action==='hardware'){ui.tab='near';}
    ui.dirty=true;renderPanel();updateBanner();resize();drawMap(performance.now());
  },
  updateQueues:syncQueueRows,
  setConnection(connected){window.LouliSession.connected=connected;mapStatus.textContent=`仿真位置 · ${sourceLabel} · ${connected?'接口已连接':'接口暂不可用，保留最近数据'}`;},
  snapshot(){return {time:sim.t,position:{...disp},truth:{...sim.truth},navigation:nav.active,destination:nav.legs[nav.i],venue:window.LouliSession.bundle.venue.id,queues:Q,beacons:layers.nodes?BCN.map(b=>({...b})):[]};}
};
if(window.LouliSession.bundle.venue.location){const floor=document.querySelector('.floor');if(floor){floor.textContent=TRACE?'1F':'示意';floor.setAttribute('aria-label',TRACE?'城西银泰1F照片轮廓':'示意楼层，非真实楼层图');}}
window.LouliDemo.reset();
if(window.LouliCare?.manualSteps||window.LouliCare?.reduceMotion)sim.paused=true;
window.LouliDemo.pause(sim.paused);
addEventListener('care-mode-change',()=>{
  if(window.LouliCare?.manualSteps){$('#roamChk').checked=false;window.LouliDemo.pause(true);}
  readTheme();ui.dirty=true;resize();drawMap(performance.now());
});
window.dispatchEvent(new Event('louli-ready'));

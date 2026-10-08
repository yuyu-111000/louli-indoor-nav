/* ============ main loop ============ */
let lastT=performance.now(),uiAcc=0,liveAcc=0,fieldAcc=0;
function frame(now){const dt=Math.min(.1,(now-lastT)/1000);lastT=now;
  if(!sim.paused){let r=dt*sim.speed;while(r>1e-6){const h=Math.min(.05,r);stepSim(h);r-=h;}}
  if(!sim.paused&&window.LouliSession.queueSource==='local')tickQueues(dt);
  // displayed position: EKF estimate, snapped to the route while navigating
  if(ekf.ready){let tx=ekf.s[0],ty=ekf.s[1];if(nav.active&&nav.route){const pr=project(nav.route,{x:tx,y:ty});if(pr.d<3){tx=pr.x;ty=pr.y;}
      if(pr.d>6&&sim.t-nav.lastReroute>3&&!nav.waiting){nav.lastReroute=sim.t;const s=SL[nav.legs[nav.i]];const route=astar(ekf.s[0],ekf.s[1],s.tx,s.ty);if(route){nav.route=route;toast('已偏离路线，已重新规划');}}}
    const k=Math.min(1,dt*8);disp.x+=(tx-disp.x)*k;disp.y+=(ty-disp.y)*k;}
  if(follow&&ekf.ready)centerOn(disp.x,disp.y,Math.min(1,dt*3));
  if(focusT){centerOn(focusT.x,focusT.y,Math.min(1,dt*6));focusT.k+=dt;if(focusT.k>.8)focusT=null;}
  fieldAcc+=dt;if(fieldAcc>2.5&&ekf.ready){fieldAcc=0;field=distField(disp.x,disp.y);}
  if(ui.dirty)renderPanel();
  uiAcc+=dt;if(uiAcc>.25){uiAcc=0;updateBanner();}
  liveAcc+=dt;if(liveAcc>.5){liveAcc=0;updateLive();updateMetrics();drawChart();}
  drawMap(now);requestAnimationFrame(frame);}

readTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',readTheme);
new MutationObserver(readTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
resetSim();initVenue(vKey);resize();fit();
new ResizeObserver(()=>{resize();}).observe(cv);
addEventListener('resize',()=>{resize();fit();});
if(document.fonts)document.fonts.ready.then(()=>{});
requestAnimationFrame(frame);

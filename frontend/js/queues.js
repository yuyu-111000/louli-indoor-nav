/* ============ queues & tickets ============ */
function initVenue(k){vKey=k;V=VENUES[k];Q={};for(const id in V.poi){const q=V.poi[id].q;if(q)Q[id]={n:q[0],rate:q[1],unit:q[2],acc:Math.random()*q[1]};}
  for(const row of window.LouliSession.bundle.queues){Q[row.poiId]={n:row.ahead,rate:row.minutesPerPerson,unit:row.unit,acc:0};}
  const savedFavs=store('louli.fav.'+window.LouliSession.bundle.venue.id);favs=(Array.isArray(savedFavs)?savedFavs:V.favs.slice()).filter(id=>V.poi[id]);if(savedFavs?.length&&!favs.length)favs=V.favs.slice();sel=new Set(favs);tickets=[];ui.plan=null;ui.detail=null;ui.tab='near';ui.filter='all';ui.q='';$('#q').value='';selId=null;
  if(nav.active)endNav(true);takeTicket(V.sample.poi,true,V.sample.num);
  $('#venueTitle').textContent=V.title;$('#venueSub').textContent=V.sub;
  document.querySelectorAll('#venueSeg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===k));
  $('#chips').innerHTML=V.chips.map(([c,l])=>`<button class="fchip" data-f="${esc(c)}" aria-pressed="${c==='all'}">${esc(l)}</button>`).join('');
  $('#q').placeholder=k==='mall'?'搜店铺、美食、卫生间':'搜科室、检查、药房';ui.dirty=true;}
function takeTicket(id,silent,num){const p=P(id);const q=Q[id];if(!q)return;if(tickets.some(t=>t.poi===id&&t.status!=='done'))return;
  const pre=vKey==='mall'?(q.unit==='单'?'C':'A'):catOf(p)[1];
  const t={tid:'t'+Date.now()+Math.random(),poi:id,num:num||`${pre}${vKey==='mall'?'':' '}${String(Math.random()*900+100|0)}`,ahead:q.n,total:Math.max(1,q.n),rate:q.rate,unit:q.unit,acc:0,status:'wait'};
  if(window.LouliSession.queueSource==='local')q.n++;tickets.push(t);ui.dirty=true;
  if(!silent)toast(`已取号 ${t.num}，前面 ${t.ahead} ${t.unit}。快轮到时会按你离店的距离提前提醒`);}
function walkMeters(id){const s=SL[id];if(field){const c=nearestCell(s.tx,s.ty);const v=field[c];if(isFinite(v))return v*RES;}return hyp(s.tx-disp.x,s.ty-disp.y)*1.3;}
function tickQueues(dt){const m=dt*QACC/60;
  for(const id in Q){const q=Q[id];q.acc+=m;if(q.acc>=q.rate){q.acc-=q.rate;if(q.n>0)q.n--;if(Math.random()<.8)q.n++;}}
  for(const t of tickets){if(t.status==='done')continue;t.acc+=m;if(t.acc>=t.rate&&t.ahead>0){t.acc-=t.rate;t.ahead--;}
    const p=P(t.poi);const waitMin=Math.max(0,t.ahead*t.rate-t.acc);const walkMin=walkMeters(t.poi)/1.1/60;
    if(t.status==='wait'&&waitMin<=walkMin*QACC/6+2.5){t.status='soon';ui.dirty=true;
      toast(`${t.num} 前面还剩 ${t.ahead} ${t.unit}，${TRACE?'演示返回提醒：可以前往「'+p.n+'」':`你离「${p.n}」${Math.round(walkMeters(t.poi))} 米，现在出发刚好`}`,nav.active&&nav.legs[nav.i]===t.poi?null:'现在过去',()=>startNav([t.poi]));}
    if(t.status!=='called'&&t.ahead===0&&t.acc>=t.rate*.6){t.status='called';ui.dirty=true;toast(`${t.num} 已叫号，请到「${p.n}」${vKey==='mall'?'入座':'就诊'}`,nav.active&&nav.legs[nav.i]===t.poi?null:'带我过去',()=>startNav([t.poi]));}}}

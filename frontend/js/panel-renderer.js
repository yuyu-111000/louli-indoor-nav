/* ============ rendering: panel ============ */
const fmtD=m=>m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1)} km`;
const fmtMin=m=>m<1?'不到 1 分钟':m<60?`${Math.round(m)} 分钟`:`${Math.floor(m/60)} 小时 ${Math.round(m%60)} 分`;
const clock=m=>{const d=new Date(Date.now()+m*60000);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
function qChip(id){const q=Q[id];if(!q)return '';const cls=q.n>4?'warn':'ok';return `<span class="qchip ${cls}" data-live="q:${id}">${q.n>0?`等 ${q.n} ${esc(q.unit)}`:'无需等位'}</span>`;}
function poiRow(p){const meta=[esc(p.s)];if(p.r)meta.push(`<span class="star">★</span>${p.r}`);if(p.p)meta.push(`¥${p.p}/人`);
  return `<button class="poi" data-act="open" data-id="${p.id}"><span class="glyph" style="${glyphStyle(p)}">${esc(catOf(p)[1])}</span><span class="pmain"><span class="pname">${esc(p.n)}</span><span class="pmeta">${meta.join(' · ')}</span></span><span class="pside"><span class="dist" data-live="d:${p.id}">${fmtD(walkMeters(p.id))}</span>${qChip(p.id)}</span></button>`;}
function nearHTML(){const qq=ui.q.trim();let items=Object.keys(V.poi).map(P).filter(p=>(ui.filter==='all'||p.c===ui.filter)&&(!qq||(p.n+p.s+(p.tags||[]).join('')+(p.menu||[]).join('')+catOf(p)[0]).toLowerCase().includes(qq.toLowerCase())));
  items.sort((a,b)=>walkMeters(a.id)-walkMeters(b.id));
  if(!items.length)return `<div class="empty">没有找到「${esc(qq)}」<br>试试“火锅”“咖啡”“卫生间”</div>`;
  return `<div class="sect-h">${qq?'搜索结果':'离你最近'}<span class="muted">按实际步行距离排序</span></div>`+items.map(poiRow).join('');}
function detailHTML(id){const p=P(id);const isFav=favs.includes(id);const t=tickets.find(t=>t.poi===id&&t.status!=='done');const q=Q[id];
  const meta=[];if(p.r)meta.push(`<span><span class="star">★★★★★</span> ${p.r}</span>`);if(p.p)meta.push(`<span>¥${p.p}/人</span>`);meta.push(`<span>${esc(p.s)}</span>`);
  meta.push(`<span>步行 <b data-live="d:${id}">${fmtD(walkMeters(id))}</b> · <span data-live="w:${id}">${fmtMin(walkMeters(id)/1.1/60)}</span></span>`);
  let h=`<div class="dhead"><button class="back" data-act="back"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>返回列表</button>
  <div class="dtitle"><span class="glyph" style="${glyphStyle(p)}">${esc(catOf(p)[1])}</span><h2>${esc(p.n)}</h2></div><div class="dmeta">${meta.join('')}</div>
  ${p.tags?`<div class="tags">${p.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div>`:''}</div>`;
  const qLabel=vKey==='mall'?'取号':'取号报到';
  h+=`<div class="actions"><button class="btn primary" data-act="go" data-id="${id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 21l8-4 8 4z"/></svg>到这去</button>
  <button class="btn ${isFav?'on':''}" data-act="fav" data-id="${id}">${isFav?'★ 已加清单':'☆ 加入清单'}</button>${q&&!t?`<button class="btn" data-act="take" data-id="${id}">${qLabel}</button>`:''}</div>`;
  if(t)h+=`<div class="qbox"><div class="qn">${esc(t.num)}</div><div class="qt">你的号码 · 前面 <b data-live="ta:${t.tid}">${t.ahead}</b> ${esc(t.unit)}<br>约 <span data-live="tw:${t.tid}">${fmtMin(t.ahead*t.rate)}</span>，快到时按你的位置提醒</div></div>`;
  else if(q)h+=`<div class="qbox ${q.n>4?'':'ok'}"><div class="qn" data-live="qn:${id}">${q.n}</div><div class="qt">${vKey==='mall'?'当前排队':'当前候诊'}（${esc(q.unit)}）<br>预计等待约 <span data-live="qw:${id}">${fmtMin(q.n*q.rate)}</span>，可以先取号再去别处</div></div>`;
  if(p.deals&&p.deals.length){h+=`<div class="sect-h">团购与优惠<span class="muted">示例数据</span></div>`+p.deals.map(([n,pr,o])=>`<div class="deal"><span class="tagx">${pr?'团':'惠'}</span><span class="dn">${esc(n)}</span>${pr?`<span class="do">¥${o}</span><span class="dp">¥${pr}</span>`:''}</div>`).join('');}
  if(p.menu)h+=`<div class="sect-h">${p.c==='food'?'招牌菜':'在售推荐'}</div><div class="menu">${p.menu.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`;
  if(p.docs)h+=`<div class="sect-h">今日坐诊</div><div class="menu">${p.docs.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`;
  if(p.info&&p.info.length)h+=`<div class="sect-h">就诊须知</div>`+p.info.map(x=>`<div class="rev"><p>${esc(x)}</p></div>`).join('');
  if(p.rev)h+=`<div class="sect-h">评价<span class="muted">示例数据</span></div>`+p.rev.map(([u,x])=>`<div class="rev"><span class="ava">${esc(u[0])}</span><p><b>${esc(u)}</b>${esc(x)}</p></div>`).join('');
  return h+`<div class="note">店铺、评价、团购均为演示数据。正式版通过开放平台接入真实商户信息。</div>`;}
function planHTML(){let h='';
  if(vKey==='hosp'&&V.flow){const f=V.flow;h+=`<div class="sect-h">今日就诊流程<span class="muted">示例流程，未连接挂号系统</span></div><div class="flow"><b style="font-size:13.5px">模拟就诊任务</b><ol>${f.phases.map((ph,i)=>`<li>${esc(f.labels[i])}：${ph.map(id=>esc(V.poi[id].n)).join('、')}${ph.length>1?'<span class="opt">顺序自动优化</span>':''}</li>`).join('')}</ol></div>
    <button class="btn primary block" data-act="hospplan">规划就诊路线</button>`;}
  h+=`<div class="sect-h">${vKey==='mall'?'我的逛街清单':'常去地点'}<span class="muted">勾选后规划</span></div>`;
  if(!favs.length)h+=`<div class="empty">清单是空的。在店铺详情里点“加入清单”。</div>`;
  else h+=favs.map(id=>{const p=P(id);return `<div class="fav"><input type="checkbox" id="sel-${id}" data-act="sel" data-id="${id}" ${sel.has(id)?'checked':''}><label for="sel-${id}"><span class="glyph" style="${glyphStyle(p)}">${esc(catOf(p)[1])}</span><span class="pmain"><span class="pname">${esc(p.n)}</span><span class="pmeta">${esc(p.s)} · 停留约 ${dwellOf(p)} 分钟</span></span></label>${qChip(id)}</div>`;}).join('');
  if(favs.length)h+=`<button class="btn ${vKey==='mall'?'primary ':''}block" data-act="plan">一键规划最优顺序（考虑排队）</button>`;
  if(ui.plan){const {best,base}=ui.plan;const save=base.t-best.t;
    h+=`<div class="plan"><div class="plan-h"><b>全部完成约需 ${fmtMin(best.t)}</b><div>步行 ${fmtD(best.walkM)} · 排队空等 ${fmtMin(best.wait)}${save>=1?` · <span class="save">比按${vKey==="mall"?"清单":"开单"}顺序省 ${Math.round(save)} 分钟</span>`:' · 已是最优顺序'}</div></div>`+
    best.rows.map((r,i)=>{const p=P(r.id);let sub=`步行 ${fmtD(r.walk)}`;if(r.wait>=1)sub+=` · 需等位 ${Math.round(r.wait)} 分钟`;else if(p.q&&r.leftAtArrive!==null)sub+=` · 到店时${r.leftAtArrive<=0?'正好叫号':`约剩 ${r.leftAtArrive} ${esc(p.q[2])}`}`;sub+=` · 停留 ${r.dwell} 分钟`;
      return `<div class="stop"><span class="sn">${i+1}</span><div><div class="st">${esc(p.n)}</div><div class="ss">${sub}</div></div><span class="tm">${clock(r.arrive)}</span></div>`;}).join('')+
    `<div style="padding:12px 14px;border-top:1px solid var(--line)"><button class="btn primary" style="width:100%" data-act="startplan">按此顺序开始导航</button><div class="note" style="margin:8px 0 0">出发时创建本页模拟号码；正式取号需要接入场馆系统。</div></div></div>`;}
  return h;}
function ticketHTML(t){const p=P(t.poi);const st={wait:['等待中',''],soon:['快到了','soon'],called:['已叫号','called']}[t.status]||['已完成',''];const pct=t.status==='called'?100:Math.round(100*(1-t.ahead/t.total));
  return `<div class="ticket"><div class="tk-top"><span class="tk-num">${esc(t.num)}</span><div class="tk-info"><b>${esc(p.n)}</b><span>${esc(p.s)}</span></div><span class="tk-state ${st[1]}">${st[0]}</span></div>
  <div class="tk-bar"><i data-live="tp:${t.tid}" style="width:${pct}%"></i></div>
  <div class="tk-grid"><div><small>前面还有</small><b><span data-live="ta:${t.tid}">${t.ahead}</span> ${esc(t.unit)}</b></div><div><small>预计等待</small><b data-live="tw:${t.tid}">${fmtMin(t.ahead*t.rate)}</b></div><div><small>离你</small><b data-live="td:${t.tid}">${fmtD(walkMeters(t.poi))}</b></div></div>
  <div class="tk-foot"><button class="btn primary" data-act="go" data-id="${t.poi}">导航到店</button><button class="btn" data-act="cancel" data-tid="${t.tid}">取消排号</button></div></div>`;}
function queueHTML(){const act=tickets.filter(t=>t.status!=='done');let h=`<div class="sect-h">我的排号<span class="muted">${window.LouliSession.queueSource==='api'?'接口队列 · 模拟号码':`演示时间加速 ×${QACC}`} </span></div>`;
  if(!act.length)h+=`<div class="empty">还没有排号。在${vKey==='mall'?'餐厅':'科室'}详情里点“取号”，可以先去别处，快轮到时会提醒你。</div>`;else h+=act.map(ticketHTML).join('');
  return h+`<div class="note">提醒时间按“你离店的步行时间 + 前面${vKey==='mall'?'桌数':'人数'} × 每${vKey==='mall'?'桌':'人'}用时”计算。离得越远，提醒越早。</div>`;}
function navHTML(){const dest=P(nav.legs[nav.i]);
  return `<div class="navsum"><div class="big num"><span data-live="nr">–</span><small>米</small></div><div class="big num"><span data-live="ne">–</span><small>分钟</small></div></div>
  <div class="sect-h" style="padding-top:2px">正在前往「${esc(dest.n)}」</div>
  <div class="legs">${nav.legs.map((id,i)=>`<div class="leg ${i<nav.i?'done':i===nav.i?'cur':''}"><span class="sn">${i+1}</span>${esc(V.poi[id].n)}${i<nav.i?' · 已到达':''}</div>`).join('')}</div>
  <button class="btn block" data-act="endnav">结束导航</button><div class="note">导航时蓝点会吸附到路线上，偏离超过 6 米自动重新规划。</div>`;}
function renderTabs(){const n=tickets.filter(t=>t.status!=='done').length;const tabs=[['near','附近'],['plan',vKey==='mall'?'清单':'就诊'],['queue','排队']];if(nav.active)tabs.unshift(['nav','导航中']);
  $('#tabs').innerHTML=tabs.map(([k,l])=>`<button class="tab ${k==='nav'?'navtab':''}" role="tab" data-tab="${k}" aria-selected="${ui.tab===k&&!ui.detail}">${l}${k==='queue'&&n?`<span class="badge">${n}</span>`:''}</button>`).join('');}
function renderPanel(){renderTabs();const b=$('#pbody');
  b.innerHTML=ui.detail?detailHTML(ui.detail):ui.tab==='near'?nearHTML():ui.tab==='plan'?planHTML():ui.tab==='queue'?queueHTML():nav.active?navHTML():nearHTML();ui.dirty=false;if(ui.scrollPlan){ui.scrollPlan=false;const p=b.querySelector(".plan");if(p)p.scrollIntoView({block:"start",behavior:"smooth"});}}
function updateLive(){document.querySelectorAll('[data-live]').forEach(el=>{const [k,id]=el.dataset.live.split(':');let v=null;
  if(k==='d')v=fmtD(walkMeters(id));else if(k==='w')v=fmtMin(walkMeters(id)/1.1/60);
  else if(k==='q'){const q=Q[id];if(q){v=q.n>0?`等 ${q.n} ${esc(q.unit)}`:'无需等位';el.className='qchip '+(q.n>4?'warn':'ok');}}
  else if(k==='qn')v=Q[id]?.n;else if(k==='qw')v=Q[id]?fmtMin(Q[id].n*Q[id].rate):null;
  else if(k[0]==='t'){const t=tickets.find(t=>t.tid===id);if(!t)return;if(k==='ta')v=t.ahead;else if(k==='tw')v=fmtMin(Math.max(0,t.ahead*t.rate-t.acc));else if(k==='td')v=fmtD(walkMeters(t.poi));else if(k==='tp'){el.style.width=(t.status==='called'?100:Math.round(100*(1-t.ahead/t.total)))+'%';return;}}
  else if(k==='nr'||k==='ne'){const I=navInstr();if(I)v=k==='nr'?Math.round(I.remain):Math.max(1,Math.round(I.remain/1.1/60));}
  if(v!==null&&v!==undefined&&el.textContent!==String(v))el.textContent=v;});}
function updateBanner(){const nb=$('#navbanner');if(!nav.active||nav.waiting||!nav.route){nb.hidden=true;return;}const I=navInstr();if(!I){nb.hidden=true;return;}nb.hidden=false;
  $('#nbIcon').innerHTML=ICONS[I.icon];$('#nbMain').textContent=I.main;$('#nbSub').textContent=I.sub;}
const MROWS=[['gps','手机 GPS'],['fp','指纹原始'],['pdr','纯惯导 PDR'],['ekf','EKF 融合']];
function updateMetrics(){const last=sim.hist[sim.hist.length-1];const f=v=>v===undefined||isNaN(v)?'–':v.toFixed(1);
  const st=k=>{const a=sim.stats[k];if(!a.length)return ['–','–'];const m=a.reduce((x,y)=>x+y,0)/a.length;const s=a.slice().sort((x,y)=>x-y);return [m.toFixed(1),s[Math.floor(s.length*.9)].toFixed(1)];};
  $('#mrows').innerHTML=MROWS.map(([k,l])=>{const [m,p]=st(k);return `<tr class="${k}"><td><i class="sw" style="background:var(--c-${k})"></i>${l}</td><td>${f(last&&last[k])}</td><td>${m}</td><td>${p}</td></tr>`;}).join('');
  const e=last?last.ekf.toFixed(1):'–';$('#eNow').textContent=e;$('#pillErr').textContent=e;}

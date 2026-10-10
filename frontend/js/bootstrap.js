import {loadVenue,readQueues} from './api.js';
import {enhanceSelects} from './glide-select.js';
import {paintPlayback} from './playback.js';
const params=new URLSearchParams(location.search);
const modules=['utils','geometry','routing','beacon-layout','positioning','catalog','simulation','navigation','queues','planner','map-renderer','panel-renderer','interactions','loop','demo-bridge'];
async function start() {
  const venue=params.get('venue')||'yintai-demo';
  const floors=['B1','1F','2F','3F','4F'];
  const floor=venue==='yintai-demo' && floors.includes(params.get('floor')) ? params.get('floor') : '1F';
  let session;
  if(venue==='yintai-demo' && floor!=='1F'){
    const response=await fetch('data/yintai-floors/'+floor+'.json');
    if(!response.ok)throw new Error('楼层资料未能加载');
    session={bundle:await response.json(),connected:false};
  }else session=await loadVenue(venue);
  const selector=document.querySelector('#floorSelect');
  if(venue==='yintai-demo'){
    selector.replaceChildren(...floors.map(id=>{const option=document.createElement('option');option.value=id;option.textContent=id;option.selected=id===floor;return option;}));
    selector.disabled=false;
    selector.onchange=()=>{const next=new URL(location.href);next.searchParams.set('floor',selector.value);location.href=next.href;};
  }
  enhanceSelects(document.querySelector('.floor-picker'));

  window.LouliSession={...session,queueSource:session.connected?'api':'local',embed:params.has('embed'),paintPlayback};
  document.body.classList.toggle('embedded',window.LouliSession.embed);
  for(const name of modules)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`js/${name}.js`;script.onload=resolve;script.onerror=()=>reject(new Error(`模块加载失败：${name}`));document.body.append(script);});
  if(session.connected)setInterval(async()=>{try{const data=await readQueues(session.bundle.venue.id);window.LouliDemo.updateQueues(data.queues);window.LouliDemo.setConnection(true);}catch{window.LouliDemo.setConnection(false);}},3000);
}
start().catch(error=>{const el=document.querySelector('#loadError');el.hidden=false;el.textContent=`场馆未能加载：${error.message}。请检查启动服务和数据包格式。`;});

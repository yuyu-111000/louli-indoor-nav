import {loadVenue,readQueues} from './api.js';
const params=new URLSearchParams(location.search);
const modules=['utils','geometry','routing','positioning','catalog','simulation','navigation','queues','planner','map-renderer','panel-renderer','interactions','loop','demo-bridge'];
async function start() {
  const session=await loadVenue(params.get('venue')||'hosp');
  window.LouliSession={...session,queueSource:session.connected?'api':'local',embed:params.has('embed')};
  document.body.classList.toggle('embedded',window.LouliSession.embed);
  for(const name of modules)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`js/${name}.js`;script.onload=resolve;script.onerror=()=>reject(new Error(`模块加载失败：${name}`));document.body.append(script);});
  if(session.connected)setInterval(async()=>{try{const data=await readQueues(session.bundle.venue.id);window.LouliDemo.updateQueues(data.queues);window.LouliDemo.setConnection(true);}catch{window.LouliDemo.setConnection(false);}},3000);
}
start().catch(error=>{const el=document.querySelector('#loadError');el.hidden=false;el.textContent=`场馆未能加载：${error.message}。请检查启动服务和数据包格式。`;});

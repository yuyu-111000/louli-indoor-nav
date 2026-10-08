import {loadVenue,writeQueues} from './api.js';
import {buildStory} from './story-data.js';
const $=s=>document.querySelector(s),frame=$('#demoFrame');
let bundle,chapters=[],chapter=0,playing=false,ready=false,timer,originalQueues,changedQueues=false;
const venueId=new URLSearchParams(location.search).get('venue')||'hosp';
function setPlaying(value){playing=value;$('#playBtn').textContent=value?'暂停演示':'播放功能演示';frame.contentWindow.LouliDemo?.pause(!value);clearInterval(timer);if(value)timer=setInterval(()=>{if(chapter===3){setPlaying(false);return;}selectChapter(chapter+1);},12000);}
function paintChapter(){
  const c=chapters[chapter];$('#chapterNumber').textContent=`0${chapter+1} / 04`;$('#chapterTitle').textContent=c.title;$('#chapterCaption').textContent=c.caption;
  $('#taskList').replaceChildren(...c.ids.slice(0,5).map((id,i)=>{const li=document.createElement('li'),n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');li.append(n,document.createTextNode(bundle.catalog.poi[id].n));return li;}));
  document.querySelectorAll('#progress button').forEach((b,i)=>{b.classList.toggle('active',i===chapter);b.setAttribute('aria-current',i===chapter?'step':'false');});
  $('#hardwareOverlay').hidden=c.action!=='hardware';$('.map-stage').classList.toggle('navigating',c.action==='navigate');
  $('#demoFeature').textContent=['任务清单 / 多点规划','地标指引 / 路线重规划','模拟队列 / 返回提醒','信标部署 / 地图约束'][chapter];
}
async function selectChapter(index){
  if(!ready)return;chapter=index;paintChapter();frame.contentWindow.LouliDemo.chapter(chapters[chapter].action,chapters[chapter].ids);
  if(chapters[chapter].action==='queue'){
    const id=chapters[chapter].ids[0];const queues=originalQueues.map(q=>({...q,ahead:q.poiId===id?1:q.ahead}));
    try {await writeQueues(bundle.venue.id,queues);changedQueues=true;$('#apiStatus').textContent='模拟队列已写入接口';}catch{$('#apiStatus').textContent='本地模拟队列';}
  }
}
async function restoreQueues(){if(changedQueues){try{await writeQueues(bundle.venue.id,originalQueues);changedQueues=false;}catch{$('#apiStatus').textContent='队列恢复失败，请在数据页重置';}}}
async function load(){
  try{
    const session=await loadVenue(venueId);bundle=session.bundle;originalQueues=structuredClone(bundle.queues);chapters=buildStory(bundle);
    $('#venueName').textContent=bundle.venue.name;$('#venueType').textContent=bundle.venue.type==='hospital'?'医院就诊流程':'商场路线规划';
    $('#apiStatus').textContent=session.connected?'数据接口已连接':'本地演示模式';
    $('#sourceNote').textContent=`${bundle.venue.source==='synthetic'?'示例场馆':'用户提供地图'} · 仿真位置与流程`;
    $('#exploreLink').href=`demo.html?venue=${encodeURIComponent(venueId)}`;
    document.querySelectorAll('[data-venue]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.venue===venueId));
    $('#progress').replaceChildren(...chapters.map((c,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',c.title);b.onclick=()=>{selectChapter(i);setPlaying(true);};return b;}));paintChapter();
    frame.onload=()=>{const finish=()=>{ready=true;$('#playBtn').disabled=false;$('#nextBtn').disabled=false;frame.contentWindow.LouliDemo.pause(true);selectChapter(0);};if(frame.contentWindow.LouliDemo)finish();else frame.contentWindow.addEventListener('louli-ready',finish,{once:true});};
    frame.src=`demo.html?embed=1&venue=${encodeURIComponent(venueId)}`;
  }catch(error){$('#chapterTitle').textContent='场馆数据未能加载';$('#chapterCaption').textContent=error.message;$('#apiStatus').textContent='请检查数据服务';}
}
$('#playBtn').onclick=()=>{if(chapter===3&&!playing)selectChapter(0);setPlaying(!playing);};
$('#nextBtn').onclick=()=>{selectChapter((chapter+1)%4);setPlaying(true);};
$('#restartBtn').onclick=async()=>{if(!ready)return;setPlaying(false);await restoreQueues();frame.contentWindow.LouliDemo.reset();frame.contentWindow.LouliDemo.pause(true);selectChapter(0);};
document.querySelectorAll('[data-venue]').forEach(b=>b.onclick=async()=>{await restoreQueues();location.href=`?venue=${b.dataset.venue}`;});
$('#materialsBtn').onclick=()=>$('#materials').showModal();$('#closeMaterials').onclick=()=>$('#materials').close();
$('#materials').addEventListener('click',e=>{if(e.target===$('#materials')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
load();

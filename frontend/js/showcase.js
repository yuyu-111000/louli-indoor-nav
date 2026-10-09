import {loadVenue,writeQueues} from './api.js';
import {setupNearby} from './nearby.js';
import {buildStory} from './story-data.js';
const $=s=>document.querySelector(s),frame=$('#demoFrame'),referenceFrame=$('#referenceFrame');
let bundle,chapters=[],chapter=0,playing=false,ready=false,timer,originalQueues,changedQueues=false;
const venueId=new URLSearchParams(location.search).get('venue')||'yintai-demo';
const publicViews={'yintai-demo':['PANDORA','LEGO乐高','星巴克臻选'],'xixi-demo':['丝芙兰Sephora','优衣库','泡泡玛特POP MART']};
const hasPublicView=Object.hasOwn(publicViews,venueId);
function setPlaying(value){playing=value;$('#playBtn').textContent=value?'暂停演示':'播放功能演示';frame.contentWindow.LouliDemo?.pause(!value);clearInterval(timer);if(value)timer=setInterval(()=>{if(chapter===3){setPlaying(false);return;}selectChapter(chapter+1);},12000);}
function paintChapter(){
  const c=chapters[chapter];$('#chapterNumber').textContent=`0${chapter+1} / 04`;$('#chapterTitle').textContent=c.title;$('#chapterCaption').textContent=c.caption;
  const names=c.labels||c.ids.slice(0,5).map(id=>bundle.catalog.poi[id].n);
  $('#taskList').replaceChildren(...names.map((name,i)=>{const li=document.createElement('li'),n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');li.append(n,document.createTextNode(name));return li;}));
  document.querySelectorAll('#progress button').forEach((b,i)=>{b.classList.toggle('active',i===chapter);b.setAttribute('aria-current',i===chapter?'step':'false');});
  const showPublic=hasPublicView&&chapter===0;referenceFrame.hidden=!showPublic;frame.hidden=showPublic;$('.map-stage').classList.toggle('public-map',showPublic);
  $('#hardwareOverlay').hidden=c.action!=='hardware';$('.map-stage').classList.toggle('navigating',c.action==='navigate');
  if(hasPublicView){$('#venueType').textContent=showPublic?'公开楼层图 · 可切换楼层':'商场路线与排队 · 仿真';$('#sourceNote').textContent=showPublic?'百度地图公开截图 · 图上商户待核实':'模拟室内布局 · 模拟路线与队列';$('#floorNote').textContent=showPublic?'公开截图 · 不是场馆官方平面图':'仿真路线 · 非实际楼层图与距离';}
  $('#demoFeature').textContent=['任务清单 / 多点规划','地标指引 / 路线重规划','模拟队列 / 返回提醒','信标部署 / 地图约束'][chapter];
}
async function selectChapter(index){
  if(!ready)return;chapter=index;paintChapter();frame.contentWindow.LouliDemo.chapter(chapters[chapter].action,chapters[chapter].ids);
  if(chapters[chapter].action==='queue'){
    const id=chapters[chapter].ids[0];const queues=originalQueues.map(q=>({...q,ahead:q.poiId===id?1:q.ahead}));
    try {await writeQueues(bundle.venue.id,queues);changedQueues=true;$('#apiStatus').textContent='模拟队列已写入接口';}catch{$('#apiStatus').textContent='本地模拟队列';}
  }
}
async function restoreQueues(){if(changedQueues){try{await writeQueues(bundle.venue.id,originalQueues);changedQueues=false;$('#apiStatus').textContent='模拟队列已恢复';}catch{$('#apiStatus').textContent='队列恢复失败，请在数据页重置';}}}
async function load(){
  try{
    const session=await loadVenue(venueId);bundle=session.bundle;originalQueues=structuredClone(bundle.queues);chapters=buildStory(bundle);
    if(hasPublicView){chapters[0].title='在公开楼层图上找店';chapters[0].caption='已接入 F1 公开地图截图，可点选图上商户；其它楼层的覆盖情况可逐层查看。路线与队列在后续章节仿真演示。';chapters[0].labels=publicViews[venueId];}
    $('#venueName').textContent=bundle.venue.name+(bundle.venue.location?' · 接入展示':'');$('#venueType').textContent=bundle.venue.type==='hospital'?'医院就诊流程':'商场路线规划';
    $('#apiStatus').textContent=session.connected?'数据接口已连接':'本地演示模式';
    $('#sourceNote').textContent=bundle.venue.location?'真实室外地点 · 室内示意图':`${bundle.venue.source==='synthetic'?'示例场馆':'用户提供地图'} · 仿真位置与流程`;
    $('#floorNote').textContent=bundle.venue.location?'室内示意 · 非实际楼层图与距离':'地图可拖动与缩放';
    if(bundle.venue.location){const loc=bundle.venue.location;$('#placeSummary').hidden=false;$('#placeSummaryText').textContent=`${loc.address} · 距紫金港约 ${(loc.distanceStraightM/1000).toFixed(2)} km（直线）`;$('#placeMapLink').href=loc.mapUrl;}
    $('#exploreLink').href=hasPublicView?`reference-map.html?venue=${encodeURIComponent(venueId)}`:`demo.html?venue=${encodeURIComponent(venueId)}`;$('#exploreLink').textContent=hasPublicView?'逐层看图':'自由体验';
    document.querySelectorAll('[data-venue]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.venue===venueId||(b.dataset.venue==='mall'&&bundle.venue.type==='mall')));
    $('#progress').replaceChildren(...chapters.map((c,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',c.title);b.onclick=()=>{selectChapter(i);setPlaying(true);};return b;}));paintChapter();
    frame.onload=()=>{const finish=()=>{ready=true;$('#playBtn').disabled=false;$('#nextBtn').disabled=false;frame.contentWindow.LouliDemo.pause(true);selectChapter(0);};if(frame.contentWindow.LouliDemo)finish();else frame.contentWindow.addEventListener('louli-ready',finish,{once:true});};
    if(hasPublicView)referenceFrame.src=`reference-map.html?embed=1&venue=${encodeURIComponent(venueId)}`;
    frame.src=`demo.html?embed=1&venue=${encodeURIComponent(venueId)}`;
  }catch(error){$('#chapterTitle').textContent='场馆数据未能加载';$('#chapterCaption').textContent=error.message;$('#apiStatus').textContent='请检查数据服务';}
}
$('#playBtn').onclick=()=>{if(chapter===3&&!playing)selectChapter(0);setPlaying(!playing);};
$('#nextBtn').onclick=()=>{selectChapter((chapter+1)%4);setPlaying(true);};
$('#restartBtn').onclick=async()=>{if(!ready)return;setPlaying(false);await restoreQueues();frame.contentWindow.LouliDemo.reset();frame.contentWindow.LouliDemo.pause(true);if(hasPublicView)referenceFrame.src=`reference-map.html?embed=1&venue=${encodeURIComponent(venueId)}&floor=F1`;selectChapter(0);};
document.querySelectorAll('[data-venue]').forEach(b=>b.onclick=async()=>{await restoreQueues();location.href=`?venue=${b.dataset.venue==='mall'?'yintai-demo':b.dataset.venue}`;});
setupNearby({currentId:venueId,beforeNavigate:restoreQueues});
$('#materialsBtn').onclick=()=>$('#materials').showModal();$('#closeMaterials').onclick=()=>$('#materials').close();
$('#materials').addEventListener('click',e=>{if(e.target===$('#materials')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
load();

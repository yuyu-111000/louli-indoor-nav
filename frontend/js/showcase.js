import {loadVenue,writeQueues,listVenues} from './api.js';
import {sitePages} from './site-pages.js';
import {enhanceSelects,syncSelect} from './glide-select.js';
import {paintPlayback} from './playback.js';
import {buildStory} from './story-data.js';
import {createStepperMotion} from './stepper-motion.js';
const $=s=>document.querySelector(s),frame=$('#demoFrame'),referenceFrame=$('#referenceFrame');
const stepperMotion=createStepperMotion($('.story-stepper'));
enhanceSelects($('.showcase-venue'));
let switchingVenue=false;
let choices=[],selectedChoice=-1,selectionTimer,originalChapterIds=[];
let bundle,guides=[],contentAnimation,chapters=[],chapter=0,playing=false,ready=false,timer,originalQueues,changedQueues=false;
let transitionTimer,transitioning=false,pressedChapter;
const venueId=new URLSearchParams(location.search).get('venue')||'yintai-demo';
const publicViews={'yintai-demo':['PANDORA','LEGO乐高','星巴克臻选'],'xixi-demo':['丝芙兰Sephora','优衣库','泡泡玛特POP MART']};
const hasSpatialView=venueId==='yintai-demo';
let hasPublicView=Object.hasOwn(publicViews,venueId);
function setPlaying(value){playing=value;paintPlayback($('#playBtn'),value);frame.contentWindow.LouliDemo?.pause(!value);clearInterval(timer);if(value)timer=setInterval(()=>{if(chapter===3){setPlaying(false);return;}selectChapter(chapter+1);},12000);}
function paintNavigation(){
  $('#backBtn').disabled=!ready||transitioning||chapter===0;
  $('#nextBtn').disabled=!ready||transitioning||(chapter===0&&selectedChoice<0);
}
function paintChapter(){
  const c=chapters[chapter];$('#chapterNumber').textContent=`0${chapter+1} / 04`;$('#chapterTitle').textContent=guides[chapter].title;$('#stepHint').textContent=guides[chapter].hint;$('#backBtn').disabled=!ready||chapter===0;$('#nextBtn').textContent=chapter===3?'回到开头 ↺':'下一步 →';
  $('#destinationChoices').hidden=chapter!==0;
  paintNavigation();
  if(chapter===0)$('#nextBtn').textContent='开始带路 →';
  stepperMotion.show($('#playSlot'),chapter>0);
  stepperMotion.show($('#restartSlot'),chapter>0);
  document.querySelectorAll('#progress button').forEach((button,i)=>{
    const state=i===chapter?'active':i<chapter?'complete':'upcoming';
    button.dataset.state=state;button.setAttribute('aria-current',i===chapter?'step':'false');
    button.querySelector('.step-number').hidden=state==='complete';
    button.querySelector('.step-check').hidden=state!=='complete';
  });
  const showPublic=(hasSpatialView||hasPublicView)&&chapter===0;
  for(const [map,visible] of [[referenceFrame,showPublic],[frame,!showPublic]]){
    map.classList.toggle('is-visible',visible);map.inert=!visible;map.setAttribute('aria-hidden',String(!visible));
  }
  $('.map-stage').classList.toggle('public-map',showPublic);
  $('.map-stage').classList.toggle('navigating',c.action==='navigate');
  if(hasPublicView){$('#venueType').textContent=showPublic?'公开楼层图 · 可切换楼层':'商场路线与排队 · 仿真';$('#floorNote').textContent=showPublic?'公开截图 · 不是场馆官方平面图':'仿真路线 · 非实际楼层图与距离';}
  $('#demoFeature').textContent=['任务清单 / 多点规划','地标指引 / 路线重规划','模拟队列 / 返回提醒','橙色闪点 / 模拟信标'][chapter];
}
async function selectChapter(index){
  if(!ready)return;clearTimeout(selectionTimer);if(index===0&&playing)setPlaying(false);const previous=chapter;chapter=index;
  if(previous!==chapter){
    clearTimeout(transitionTimer);transitioning=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(transitioning)transitionTimer=setTimeout(()=>{transitioning=false;paintNavigation();},400);
  }
  paintChapter();
  if(previous!==chapter){contentAnimation?.cancel();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)contentAnimation=$('#stepContent').animate([{opacity:0,transform:`translateX(${chapter>previous?22:-22}px)`},{opacity:1,transform:'translateX(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});}frame.contentWindow.LouliDemo.chapter(chapters[chapter].action,chapters[chapter].ids);
  if(chapters[chapter].action==='queue'){
    const id=chapters[chapter].ids[0];const queues=originalQueues.map(q=>({...q,ahead:q.poiId===id?1:q.ahead}));
    try {await writeQueues(bundle.venue.id,queues);changedQueues=true;$('#apiStatus').textContent='模拟队列已写入接口';}catch{$('#apiStatus').textContent='本地模拟队列';}
  }
}
async function restoreQueues(){if(changedQueues){try{await writeQueues(bundle.venue.id,originalQueues);changedQueues=false;$('#apiStatus').textContent='模拟队列已恢复';}catch{$('#apiStatus').textContent='队列恢复失败，请在数据页重置';}}}
async function loadSceneChoices(){
  let venues;
  try {({venues}=await listVenues());}
  catch {venues=(await Promise.all(['hosp','mall','xixi-demo','yintai-demo'].map(async id=>{
    try {const response=await fetch('data/'+id+'.json');if(!response.ok)return null;return (await response.json()).venue;}catch{return null;}
  }))).filter(Boolean);}
  if(!venues.some(v=>v.id===venueId))venues.push({id:venueId,name:bundle?.venue.name||'当前场馆'});
  $('#venueSelect').replaceChildren(...venues.map(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=v.name;option.selected=v.id===venueId;return option;}));
  $('#venueSelect').disabled=false;syncSelect($('#venueSelect'));
}
async function switchVenue(id){
  if(switchingVenue||!id||id===venueId)return;
  switchingVenue=true;clearTimeout(selectionTimer);setPlaying(false);
  $('#venueSelect').disabled=true;syncSelect($('#venueSelect'));
  document.querySelectorAll('[data-venue]').forEach(b=>b.disabled=true);
  await restoreQueues();location.href='?venue='+encodeURIComponent(id)+'#showcase';
}
$('#venueSelect').addEventListener('change',()=>switchVenue($('#venueSelect').value));
async function load(){
  try{
    const session=await loadVenue(venueId);bundle=session.bundle;originalQueues=structuredClone(bundle.queues);chapters=buildStory(bundle);originalChapterIds=chapters.map(c=>[...c.ids]);
    hasPublicView=hasPublicView&&!bundle.map.trace;
    const hospital=bundle.venue.type==='hospital';
    guides=[
      {label:hasPublicView||bundle.map.trace?'找店':hospital?'安排':'清单',title:hasPublicView?'图上找店，一眼找到':hospital?'就诊安排，一目了然':'想去的地方，放进清单',hint:hasPublicView?'切换楼层，点选店铺标记。':'看看今天要去的几个地方。'},
      {label:'带路',title:'下一站，跟着路线走',hint:'用店名和路口作地标，演示逐步指引。'},
      {label:hospital?'候诊':'候位',title:'快到号，提醒你返回',hint:'看看模拟叫号后的返回提醒。'},
      {label:'定位',title:'在室内，也知道在哪',hint:bundle.map.trace?'橙色闪点是模拟信标，沿图上留白与店铺附近布置。':'橙色闪点是模拟信标，分布在入口、路口和服务点附近。'}
    ];
    const routeChoices=chapters[1].ids.slice(0,3);
    choices=hasPublicView?publicViews[venueId].map(name=>({name,id:Object.keys(bundle.catalog.poi).find(id=>name.includes('星巴克')?bundle.catalog.poi[id].c==='food':bundle.catalog.poi[id].c==='shop')||routeChoices[0]})):routeChoices.map(id=>({id,name:bundle.catalog.poi[id].n}));
    guides[0].title=hospital?'选好下一站，开始就诊':'想去哪里？你来选';
    guides[0].hint='选一个地点，接着体验路线指引。';
    const legend=document.createElement('legend');legend.textContent=hospital?'选择就诊地点':'选择想去的店';
    $('#destinationChoices').replaceChildren(legend,...choices.map((choice,i)=>{
      const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span'),arrow=document.createElement('span');
      input.type='radio';input.name='destination';input.value=String(i);input.disabled=true;input.onchange=()=>chooseDestination(i);
      name.textContent=choice.name;arrow.textContent='→';arrow.setAttribute('aria-hidden','true');label.append(input,name,arrow);return label;
    }));
    if(hasPublicView){chapters[0].title='在公开楼层图上找店';chapters[0].labels=publicViews[venueId];}
    $('#venueName').textContent=bundle.venue.name+(bundle.map.trace?(hasSpatialView?' · B1—4F':' · 1F'):bundle.venue.location?' · 接入展示':'');$('#venueType').textContent=bundle.venue.type==='hospital'?'医院就诊流程':'商场路线规划';
    $('#apiStatus').textContent=session.connected?'数据接口已连接':'本地演示模式';
    $('#floorNote').textContent=bundle.venue.location?'室内示意 · 非实际楼层图与距离':'地图可拖动与缩放';
    if(bundle.map.trace)$('#floorNote').textContent='1F · 导览照片轮廓 · 路线与候位演示';
    if(bundle.venue.location){const loc=bundle.venue.location;$('#placeSummary').hidden=false;$('#placeSummaryText').textContent=loc.address.replace(/\s*\d{6}\b/g,'').split(/[，,]/).map(part=>part.trim()).filter(part=>part&&!/(街道|社区|村)$/.test(part)).reverse().join(' · ');$('#placeMapLink').href=loc.mapUrl;}
    sitePages(venueId).slice(1).forEach((page,i)=>{const link=$('#showcase nav').children[i];link.href=page.href;link.textContent=page.label;});
    document.querySelectorAll('[data-venue]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.venue===venueId||(b.dataset.venue==='mall'&&bundle.venue.type==='mall')));
    $('#progress').replaceChildren(...guides.map((guide,i)=>{
      const button=document.createElement('button');button.type='button';button.disabled=true;
      button.setAttribute('aria-label',`第${i+1}步：${guide.label}`);
      button.innerHTML='<span class="step-circle" aria-hidden="true"><span class="step-number"></span><svg class="step-check" viewBox="0 0 24 24" hidden><path d="M5 12l4 4 10-10"/></svg></span><span class="step-label"></span>';
      button.querySelector('.step-number').textContent=String(i+1);button.querySelector('.step-label').textContent=guide.label;
      button.onclick=()=>{setPlaying(false);selectChapter(i);};return button;
    }));paintChapter();
    frame.onload=()=>{const finish=()=>{ready=true;$('#playBtn').disabled=false;$('#nextBtn').disabled=false;$('#restartBtn').disabled=false;$('#destinationChoices').querySelectorAll('input').forEach(input=>input.disabled=false);document.querySelectorAll('#progress button').forEach(button=>button.disabled=false);frame.contentWindow.LouliDemo.pause(true);selectChapter(0);};if(frame.contentWindow.LouliDemo)finish();else frame.contentWindow.addEventListener('louli-ready',finish,{once:true});};
    if(hasSpatialView)referenceFrame.src='spatial-map.html?embed=1';
    else if(hasPublicView)referenceFrame.src=`reference-map.html?embed=1&showcase=1&venue=${encodeURIComponent(venueId)}`;
    frame.src=`demo.html?embed=1&venue=${encodeURIComponent(venueId)}`;
  }catch(error){$('#chapterTitle').textContent=`场馆数据未能加载：${error.message}`;$('#apiStatus').textContent='请检查数据服务';}
}
function chooseDestination(index,preview=true){
  if(!ready||chapter!==0||!choices[index])return;
  clearTimeout(selectionTimer);selectedChoice=index;
  const choice=choices[index];
  $('#destinationChoices').querySelectorAll('input').forEach((input,i)=>input.checked=i===index);
  chapters[1].ids=[choice.id];
  const queue=originalQueues.find(q=>q.poiId===choice.id);
  chapters[2].ids=queue?[choice.id]:[...originalChapterIds[2]];
  guides[1].hint=hasPublicView?`以${bundle.catalog.poi[choice.id].n}体验示意路线。`:`前往${choice.name}，跟着地标走。`;
  guides[0].hint=`已选${choice.name}，接下来体验路线指引。`;
  paintChapter();
  if(preview&&hasPublicView)referenceFrame.contentWindow.LouliReference?.selectByName(choice.name);
  if(preview&&!hasPublicView)frame.contentWindow.LouliDemo?.select(choice.id);
  selectionTimer=setTimeout(startGuidedRoute,650);
}
function startGuidedRoute(){
  if(!ready||chapter!==0||selectedChoice<0)return;
  clearTimeout(selectionTimer);selectChapter(1);setPlaying(true);
  $('#chapterTitle').tabIndex=-1;$('#chapterTitle').focus({preventScroll:true});
}
window.addEventListener('message',event=>{
  if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='louli-map-selected'&&chapter===0){
    const id=event.data.id;if(!bundle.catalog.poi[id])return;let index=choices.findIndex(choice=>choice.id===id);
    if(index<0){choices.push({id,name:bundle.catalog.poi[id].n});index=choices.length-1;}
    if(index!==selectedChoice)chooseDestination(index,false);return;
  }
  if(event.origin!==location.origin||event.source!==referenceFrame.contentWindow||event.data?.type!=='louli-reference-selected'||chapter!==0)return;
  const index=choices.findIndex(choice=>choice.name===event.data.name);
  if(index>=0&&index!==selectedChoice)chooseDestination(index,false);
});
$('#playBtn').onclick=()=>{if(chapter>0)setPlaying(!playing);};
// A press begun on the first step must never advance a newly displayed step.
$('#nextBtn').onpointerdown=()=>{pressedChapter=chapter;};
$('#nextBtn').onkeydown=event=>{if(event.key==='Enter'||event.key===' ')pressedChapter=chapter;};
$('#nextBtn').onclick=()=>{
  const expected=pressedChapter;pressedChapter=undefined;
  if(transitioning||(expected!==undefined&&expected!==chapter))return;
  if(chapter===0){startGuidedRoute();return;}
  setPlaying(false);selectChapter((chapter+1)%4);
};
$('#backBtn').onclick=()=>{setPlaying(false);selectChapter(Math.max(0,chapter-1));};
$('#restartBtn').onclick=async()=>{if(!ready)return;clearTimeout(selectionTimer);selectedChoice=-1;chapters.forEach((c,i)=>c.ids=[...originalChapterIds[i]]);guides[1].hint='用店名和路口作地标，演示逐步指引。';$('#destinationChoices').querySelectorAll('input').forEach(input=>input.checked=false);guides[0].hint='选一个地点，接着体验路线指引。';setPlaying(false);await restoreQueues();frame.contentWindow.LouliDemo.reset();frame.contentWindow.LouliDemo.pause(true);if(hasSpatialView)referenceFrame.src='spatial-map.html?embed=1';else if(hasPublicView)referenceFrame.src=`reference-map.html?embed=1&showcase=1&venue=${encodeURIComponent(venueId)}&floor=F1`;selectChapter(0);};
document.querySelectorAll('[data-venue]').forEach(b=>b.onclick=()=>switchVenue(b.dataset.venue==='mall'?'yintai-demo':b.dataset.venue));
$('#showcase nav').addEventListener('click',async event=>{
  const link=event.target.closest('a');
  if(!link||!changedQueues||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();await restoreQueues();location.href=link.href;
});
paintPlayback($('#playBtn'),false);
loadSceneChoices();
load();

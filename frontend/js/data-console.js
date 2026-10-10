import {listVenues,loadVenue,importBundle,readQueues,writeQueues,request} from './api.js';
import {enhanceSelects} from './glide-select.js';
enhanceSelects();
const $=s=>document.querySelector(s);let current=new URLSearchParams(location.search).get('venue')||'hosp',downloadURL;
function result(id,message,error=false){const p=$(id);p.textContent=message;p.className=error?'error':'success';}
async function refresh(selected=current){const {venues}=await listVenues();$('#venueSelect').replaceChildren(...venues.map(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.name;o.selected=v.id===selected;return o;}));current=$('#venueSelect').value;await choose();}
async function choose(){current=$('#venueSelect').value;$('#openVenue').href=`./?venue=${encodeURIComponent(current)}`;const data=await readQueues(current);$('#queueText').value=JSON.stringify(data,null,2);const {bundle}=await loadVenue(current);if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));$('#downloadVenue').href=downloadURL;$('#downloadVenue').download=`${current}.json`;}
$('#venueSelect').onchange=()=>choose().catch(e=>result('#queueResult',e.message,true));
$('#upload').onchange=async()=>{const file=$('#upload').files[0];if(!file)return;if(file.size>2*1024*1024){result('#importResult','文件超过 2 MB，请精简场馆包。',true);return;}$('#packageText').value=await file.text();result('#importResult',`已读取 ${file.name}，点击“验证并导入”保存。`);};
$('#importBtn').onclick=async()=>{const b=$('#importBtn');b.disabled=true;try{const bundle=JSON.parse($('#packageText').value);const data=await importBundle(bundle);await refresh(data.venueId);result('#importResult','已验证并保存。可打开产品展示查看新场馆。');}catch(e){result('#importResult',e instanceof SyntaxError?'JSON 语法错误，请检查括号和引号。':e.message,true);}finally{b.disabled=false;}};
$('#saveQueues').onclick=async()=>{try{const data=JSON.parse($('#queueText').value);await writeQueues(current,data.queues);await choose();result('#queueResult','队列已保存，演示界面将在约 3 秒内同步。');}catch(e){result('#queueResult',e.message,true);}};
$('#resetData').onclick=async()=>{try{await request('/api/v1/reset',{method:'POST',body:'{}'});await refresh();result('#queueResult','内置医院和商场数据已恢复。');}catch(e){result('#queueResult',e.message,true);}};
refresh().catch(e=>result('#importResult',`数据服务未连接：${e.message}。请启动后端后刷新。`,true));

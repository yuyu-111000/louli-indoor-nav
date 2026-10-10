import {request} from './api.js';
const form=document.querySelector('#feedbackForm'),message=form.elements.message,status=document.querySelector('#feedbackStatus');
const button=form.querySelector('button[type=submit]'),count=document.querySelector('#messageCount');
let pending=false;
message.addEventListener('input',()=>{message.setCustomValidity('');count.textContent=`${message.value.length} / 2000`;});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;
  if(!message.value.trim())message.setCustomValidity('请填写反馈内容。');
  if(!form.reportValidity())return;
  pending=true;button.disabled=true;button.firstChild.textContent='正在提交… ';status.textContent='';status.dataset.state='pending';
  try{
    const result=await request('/api/v1/feedback',{method:'POST',body:JSON.stringify({topic:form.elements.topic.value,message:message.value.trim(),contact:form.elements.contact.value.trim()})});
    status.dataset.state='success';status.textContent=`反馈已保存，谢谢你的分享。编号：${result.feedbackId}`;
    form.reset();count.textContent='0 / 2000';
  }catch{
    status.dataset.state='error';status.textContent='暂时未能提交，内容已保留，请稍后重试。';
  }finally{pending=false;button.disabled=false;button.firstChild.textContent='提交反馈 ';}
});

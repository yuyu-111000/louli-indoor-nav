// Shared care preferences are available before page modules and embedded maps load.
(()=>{
  const key='louli-care-mode-v1';
  const defaults={enabled:false,largeText:true,reduceMotion:true,manualSteps:true};
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,typeof value?.[k]==='boolean'?value[k]:v]));}catch{return {...defaults};}};
  let settings=read(),dialog,opener;
  const buttons=[];
  const value=k=>settings.enabled&&settings[k];
  window.LouliCare={get enabled(){return settings.enabled;},get reduceMotion(){return value('reduceMotion');},get largeText(){return value('largeText');},get manualSteps(){return value('manualSteps');}};
  function apply(next,persist=false){
    const previous={enabled:settings.enabled,largeText:value('largeText'),reduceMotion:value('reduceMotion'),manualSteps:value('manualSteps')};
    settings={...defaults,...next};
    const root=document.documentElement;
    root.classList.toggle('care-mode',settings.enabled);
    for(const [k,c] of [['largeText','care-large-text'],['reduceMotion','care-reduce-motion'],['manualSteps','care-manual-steps']])root.classList.toggle(c,value(k));
    buttons.forEach(button=>{button.textContent=settings.enabled?'关怀模式 · 已开启':'关怀模式';button.setAttribute('aria-pressed',String(settings.enabled));});
    dialog?.querySelectorAll('[data-care-option]').forEach(input=>input.checked=settings[input.dataset.careOption]);
    if(persist)try{localStorage.setItem(key,JSON.stringify(settings));}catch{}
    dispatchEvent(new CustomEvent('care-mode-change',{detail:{...settings,previous}}));
    document.querySelectorAll('iframe').forEach(frame=>{try{frame.contentWindow.postMessage({type:'louli-care-settings',settings},location.origin);}catch{}});
  }
  apply(settings);
  addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(read());});
  addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&parent!==window&&event.data?.type==='louli-care-settings')apply(event.data.settings);});
  function mount(){
    if(new URLSearchParams(location.search).has('embed'))return;
    const hosts=[document.querySelector('.site-header,.demo-site-header,.reference-header,.spatial-header'),document.querySelector('.launch-topline')].filter(Boolean);
    if(!hosts.length)return;
    dialog=document.createElement('dialog');dialog.id='careSettings';dialog.className='care-settings';dialog.setAttribute('aria-labelledby','careTitle');
    dialog.innerHTML='<div class="care-heading"><h2 id="careTitle">关怀模式</h2><button type="button" class="care-close" aria-label="关闭关怀设置">×</button></div><p class="care-description">已开启以下辅助功能，可按需要单独调整。</p><div class="care-options"><label><input type="checkbox" data-care-option="largeText"><span><b>大字与高对比</b><small>放大文字和控件，让路线与选中状态更清楚。</small></span></label><label><input type="checkbox" data-care-option="reduceMotion"><span><b>减少动态效果</b><small>关闭像素过渡、闪烁和自动播放。</small></span></label><label><input type="checkbox" data-care-option="manualSteps"><span><b>按自己的节奏操作</b><small>确认后开始，引导不自动跳步，可随时暂停。</small></span></label></div><div class="care-actions"><button type="button" class="care-reset">恢复普通模式</button><button type="button" class="care-done">完成设置</button></div>';
    document.body.append(dialog);
    const close=()=>dialog.close();
    dialog.querySelector('.care-close').onclick=close;dialog.querySelector('.care-done').onclick=close;
    dialog.querySelector('.care-reset').onclick=()=>{apply({...settings,enabled:false},true);close();};
    dialog.querySelectorAll('[data-care-option]').forEach(input=>input.onchange=()=>apply({...settings,[input.dataset.careOption]:input.checked},true));
    dialog.addEventListener('close',()=>{buttons.forEach(b=>b.setAttribute('aria-expanded','false'));opener?.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
    hosts.forEach(host=>{
      const button=document.createElement('button');button.type='button';button.className='care-toggle';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);button.setAttribute('aria-expanded','false');
      button.onclick=()=>{opener=button;if(!settings.enabled)apply({...settings,enabled:true},true);dialog.showModal();button.setAttribute('aria-expanded','true');};
      if(host.classList.contains('launch-topline'))host.querySelector('.launch-skip').before(button);
      else if(host.querySelector('[data-site-nav]'))host.querySelector('[data-site-nav]').before(button);
      else host.append(button);
      buttons.push(button);
    });
    apply(settings);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

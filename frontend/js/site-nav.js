// FlowingMenu's directional solid reveal and looping text, with a circular opener.
import {sitePages} from './site-pages.js';
const slot = document.querySelector('[data-site-nav]');
if (slot && !new URLSearchParams(location.search).has('embed')) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.createElement('button');
  button.className='site-nav-toggle';button.type='button';
  button.setAttribute('aria-label','打开页面导航');button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','pageNavigation');
  button.innerHTML='<span aria-hidden="true"></span><span aria-hidden="true"></span>';
  slot.append(button);
  const dialog = document.createElement('dialog');
  dialog.id='pageNavigation';dialog.className='flow-nav';dialog.setAttribute('aria-labelledby','pageNavTitle');
  dialog.innerHTML='<div class="flow-nav-head"><span id="pageNavTitle" class="flow-nav-title">LOULI · 页面导航</span><button type="button" class="flow-nav-close" aria-label="关闭页面导航">×</button></div><nav aria-label="网站页面"></nav><p class="flow-nav-note">在楼里，知道下一步去哪里。</p>';
  document.body.append(dialog);
  const items=sitePages();
  const links=[];
  const animations=new WeakMap();
  function reveal(row, visible, event) {
    const overlay=row.querySelector('.flow-nav-overlay');
    const rect=row.getBoundingClientRect();
    const edge=event && event.clientY < rect.top+rect.height/2 ? '-101%' : '101%';
    const current=getComputedStyle(overlay).transform;
    const inFlight=animations.get(row)?.playState==='running';
    animations.get(row)?.cancel();
    row.dataset.flow=visible?'on':'off';
    const destination=visible?'translateY(0)':`translateY(${edge})`;
    overlay.style.transform=destination;
    if (!(preference.matches||window.LouliCare?.reduceMotion)) animations.set(row,overlay.animate([
      {transform:visible && !inFlight?`translateY(${edge})`:current},
      {transform:destination}
    ],{duration:450,easing:'cubic-bezier(.23,1,.32,1)'}));
  }
  items.forEach(({href:path,label:text},index)=>{
    const row=document.createElement('div');row.className='flow-nav-row';
    const link=document.createElement('a');link.className='flow-nav-link';link.href=path;
    const label=document.createElement('span');label.textContent=text;
    const number=document.createElement('small');number.textContent=`0${index+1}`;
    link.append(number,label);
    if (new URL(path,location.href).pathname===location.pathname) link.setAttribute('aria-current','page');
    const overlay=document.createElement('div');overlay.className='flow-nav-overlay';overlay.setAttribute('aria-hidden','true');
    const track=document.createElement('div');track.className='flow-nav-track';
    for (let group=0;group<2;group++) {
      const repeat=document.createElement('div');repeat.className='flow-nav-group';
      for(let copy=0;copy<4;copy++) {
        const part=document.createElement('span');part.className='flow-nav-part';part.textContent=text;
        const fill=document.createElement('i');fill.className='flow-nav-fill';part.append(fill);repeat.append(part);
      }
      track.append(repeat);
    }
    overlay.append(track);row.append(link,overlay);dialog.querySelector('nav').append(row);links.push(link);
    row.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')reveal(row,true,event);});
    row.addEventListener('pointerleave',event=>{if(!row.contains(document.activeElement))reveal(row,false,event);});
    link.addEventListener('focus',()=>reveal(row,true));
    link.addEventListener('blur',()=>reveal(row,false));
    link.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowDown')next=(index+1)%items.length;
      if(event.key==='ArrowUp')next=(index+items.length-1)%items.length;
      if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;
      if(next!==undefined){event.preventDefault();links[next].focus();}
    });
  });
  function refreshLinks() {
    const venue=document.querySelector('#venueSelect')?.value || new URLSearchParams(location.search).get('venue') || 'yintai-demo';
    sitePages(venue).forEach((page,i)=>{links[i].href=page.href;});
    document.querySelector('.louli-brand').href=links[0].href;
  }
  button.addEventListener('click',()=>{
    refreshLinks();dialog.showModal();button.setAttribute('aria-expanded','true');
  });
  dialog.querySelector('.flow-nav-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    button.setAttribute('aria-expanded','false');
    dialog.querySelectorAll('.flow-nav-row').forEach(row=>reveal(row,false));
    button.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  addEventListener('care-mode-change',()=>{if(window.LouliCare?.reduceMotion)dialog.querySelectorAll('.flow-nav-row').forEach(row=>animations.get(row)?.cancel());});
  refreshLinks();
  document.querySelector('#venueSelect')?.addEventListener('change',refreshLinks);
}

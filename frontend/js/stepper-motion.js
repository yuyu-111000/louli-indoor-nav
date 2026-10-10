// Keep the container's size responsive while its content and controls change.
export function createStepperMotion(card) {
  const inner=card.querySelector('.stepper-inner');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const visibility=new Map();
  let heightAnimation, measured=false,lastHeight;
  function resize() {
    const style=getComputedStyle(card);
    const height=inner.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
    if(lastHeight!==undefined&&Math.abs(lastHeight-height)<1)return;
    lastHeight=height;
    const from=card.getBoundingClientRect().height;
    heightAnimation?.cancel();
    card.style.height=`${height}px`;
    if(measured&&!(preference.matches||window.LouliCare?.reduceMotion)&&Math.abs(from-height)>1)heightAnimation=card.animate([{height:`${from}px`},{height:`${height}px`}],{duration:380,easing:'cubic-bezier(.22,1.12,.36,1)'});
    measured=true;
  }
  let resizeFrame=0;
  const observer=new ResizeObserver(()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});});
  observer.observe(inner);
  function show(node,visible) {
    if(node.dataset.visible===String(visible))return;
    node.dataset.visible=String(visible);
    visibility.get(node)?.cancel();
    node.inert=!visible;
    if(!visible&&node.contains(document.activeElement))card.querySelector('#progress button[aria-current=step]')?.focus({preventScroll:true});
    if(preference.matches||window.LouliCare?.reduceMotion){node.hidden=!visible;return;}
    if(visible)node.hidden=false;
    else if(node.hidden)return;
    const animation=node.animate(visible?[
      {opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}
    ]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(5px)'}],{duration:visible?280:180,easing:'ease-out'});
    visibility.set(node,animation);
    animation.onfinish=()=>{if(visibility.get(node)!==animation)return;node.hidden=!visible;visibility.delete(node);};
  }
  function reduce() {
    if(!(preference.matches||window.LouliCare?.reduceMotion))return;
    heightAnimation?.cancel();
    visibility.forEach((animation,node)=>{animation.cancel();node.hidden=node.dataset.visible!=='true';});
    visibility.clear();resize();
  }
  preference.addEventListener('change',reduce);
  addEventListener('care-mode-change',reduce);
  addEventListener('pagehide',()=>{observer.disconnect();heightAnimation?.cancel();visibility.forEach(animation=>animation.cancel());preference.removeEventListener('change',reduce);},{once:true});
  return {show};
}

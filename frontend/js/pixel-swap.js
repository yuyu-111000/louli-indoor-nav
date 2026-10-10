// PixelSwap-style windows reveal the live page instead of cloning its map frames.
export function smoothSwap(options) {
  pixelSwap({...options, smooth: true});
}

export function pixelSwap({source, swap, complete, smooth = false}) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !source || (!smooth && !CSS.supports('clip-path', 'url(#pixel-swap-clip)'))) {
    swap(); complete(); return;
  }
  const width = innerWidth, height = innerHeight;
  let size = 64;
  while (Math.ceil(width/size)*Math.ceil(height/size) > 220) size += 4;
  const columns = Math.ceil(width/size), rows = Math.ceil(height/size);
  const originX = (width-columns*size)/2, originY = (height-rows*size)/2;
  const pixels = Array.from({length:columns*rows}, (_,i)=>({
    x:originX+(i%columns)*size, y:originY+Math.floor(i/columns)*size,
    delay:Math.random()*950
  }));
  const cover = document.createElement('div');
  cover.className='launch pixel-swap-cover';
  cover.setAttribute('aria-hidden','true');cover.inert=true;
  const outgoing = source.cloneNode(true);
  outgoing.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
  outgoing.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  outgoing.querySelectorAll('a,button,input').forEach(node=>node.tabIndex=-1);
  cover.append(outgoing);
  const namespace='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(namespace,'svg');
  svg.classList.add('pixel-swap-defs');svg.setAttribute('aria-hidden','true');
  const defs=document.createElementNS(namespace,'defs');
  const clip=document.createElementNS(namespace,'clipPath');
  const id=`pixel-swap-${Math.random().toString(36).slice(2)}`;
  clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');
  const path=document.createElementNS(namespace,'path');
  path.setAttribute('clip-rule','evenodd');
  const outer=`M0 0H${width}V${height}H0Z`;
  path.setAttribute('d',outer);clip.append(path);defs.append(clip);svg.append(defs);
  if (!smooth) cover.style.clipPath=`url(#${id})`;
  else cover.classList.add('launch-smooth-cover');
  document.body.append(svg,cover);
  const blocker=document.createElement('div');
  blocker.className='pixel-swap-blocker';blocker.setAttribute('aria-hidden','true');
  document.body.append(blocker);
  const inertStates=[...document.body.children].filter(node=>![svg,cover,blocker].includes(node)).map(node=>[node,node.inert]);
  inertStates.forEach(([node])=>node.inert=true);
  const oldOverflow=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';
  let raf=0, finished=false;
  const start=performance.now();
  function finish(navigating=false) {
    if(finished)return;
    finished=true;cancelAnimationFrame(raf);
    window.removeEventListener('resize',resize);
    window.removeEventListener('pagehide',leave);
    preference.removeEventListener('change',reduced);
    document.removeEventListener('keydown',blockKeys,true);
    inertStates.forEach(([node,value])=>node.inert=value);
    document.documentElement.style.overflow=oldOverflow;
    cover.remove();svg.remove();blocker.remove();
    if(!navigating)complete();
  }
  const resize=()=>finish();
  const leave=()=>finish(true);
  const reduced=()=>{if(preference.matches)finish();};
  function blockKeys(event) {
    if(['Tab',' ','ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key))event.preventDefault();
  }
  function draw(time) {
    const elapsed=time-start;
    if (smooth) {
      const progress=Math.max(0,Math.min(1,elapsed/600));
      const eased=progress*progress*(3-2*progress);
      cover.style.opacity=String(1-eased);
      outgoing.style.transform=`translate3d(0, ${-24*eased}px, 0)`;
      if(progress<1)raf=requestAnimationFrame(draw);
      else finish();
      return;
    }
    let holes='';
    for(const pixel of pixels) {
      const progress=Math.max(0,Math.min(1,(elapsed-pixel.delay)/450));
      if(!progress)continue;
      const eased=1-Math.pow(1-progress,3);
      // A short fade-like opening avoids a hard pop at the initial .35 scale.
      const scale=(.35+.65*eased)*Math.min(1,progress*5);
      const edge=size*scale, inset=(size-edge)/2;
      holes+=`M${pixel.x+inset} ${pixel.y+inset}h${edge}v${edge}h${-edge}Z`;
    }
    path.setAttribute('d',outer+holes);
    if(elapsed<1400)raf=requestAnimationFrame(draw);
    else finish();
  }
  window.addEventListener('resize',resize);
  window.addEventListener('pagehide',leave,{once:true});
  preference.addEventListener('change',reduced);
  document.addEventListener('keydown',blockKeys,true);
  try { swap(); raf=requestAnimationFrame(draw); }
  catch(error) {finish();throw error;}
}

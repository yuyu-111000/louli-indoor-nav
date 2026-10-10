// The supplied JellyRadio spring behaviour adapted to links and dialog buttons.
// Keep navigation semantics; these actions are not mutually exclusive form values.
const group = document.querySelector('#showcase nav');
if (group) {
  group.classList.add('jelly-nav');
  const chips = [...group.children];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:700px)');
  const states = chips.map(() => ({x:0, sx:1, sy:1, vx:0, vsx:0, vsy:0, targetX:0, targetS:1, delay:0}));
  let selected = 0, raf = 0, lastTime = 0;

  function paint() {
    states.forEach((state, i) => {
      chips[i].style.transform = `translateX(${state.x}px) scale(${state.sx}, ${state.sy})`;
    });
  }
  function settle() {
    cancelAnimationFrame(raf); raf = 0; lastTime = 0;
    states.forEach(s => { s.x=s.targetX; s.sx=s.sy=s.targetS; s.vx=s.vsx=s.vsy=0; });
    paint();
  }
  function spring(s, key, velocity, goal, stiffness, bounce, dt) {
    const damping = 2 * Math.sqrt(stiffness * .9) * (1 - bounce);
    s[velocity] += (stiffness * (goal - s[key]) - damping * s[velocity]) / .9 * dt;
    s[key] += s[velocity] * dt;
  }
  function tick(time) {
    const elapsed = Math.min(32, lastTime ? time-lastTime : 16.7);
    lastTime = time;
    let moving = false;
    states.forEach((s, i) => {
      s.delay = Math.max(0, s.delay-elapsed);
      if (s.delay) { moving = true; return; }
      const distance = Math.abs(i-selected), k = 580 * (1-.12*Math.min(distance,3));
      // Small steps keep the spring stable when frames arrive slowly.
      for (let n=0; n<4; n++) {
        const dt = elapsed / 4000;
        spring(s,'x','vx',s.targetX,k,.25,dt);
        spring(s,'sx','vsx',s.targetS,k*1.24,.55,dt);
        spring(s,'sy','vsy',s.targetS,k*.86,.25,dt);
      }
      if (Math.abs(s.x-s.targetX)>.015 || Math.abs(s.sx-s.targetS)>.001 || Math.abs(s.sy-s.targetS)>.001 || Math.abs(s.vx)>.05 || Math.abs(s.vsx)>.005 || Math.abs(s.vsy)>.005) moving=true;
    });
    paint();
    if (moving) raf=requestAnimationFrame(tick);
    else settle();
  }
  function apply(index, instant=false) {
    const inFlight=!!raf;
    selected=index;
    const swell = mobile.matches ? .08 : .12;
    const push=chips[index].offsetWidth*swell/2+(mobile.matches?2:4);
    states.forEach((s,i)=>{
      chips[i].dataset.on=String(i===index);
      s.targetX=Math.sign(i-index)*push;
      s.targetS=i===index?1+swell:.98;
      s.delay=instant||inFlight?0:Math.abs(i-index)*22+(i===index?0:10);
    });
    if (instant||reduce.matches||window.LouliCare?.reduceMotion) settle();
    else if (!raf) {lastTime=0;raf=requestAnimationFrame(tick);}
  }
  chips.forEach((chip,i)=>{
    chip.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')apply(i);});
    chip.addEventListener('focus',()=>apply(i));
    chip.addEventListener('click',()=>apply(i));
    chip.addEventListener('keydown',event=>{
      const rtl=getComputedStyle(group).direction==='rtl';
      let next;
      if(event.key==='ArrowRight')next=(i+(rtl?-1:1)+chips.length)%chips.length;
      if(event.key==='ArrowLeft')next=(i+(rtl?1:-1)+chips.length)%chips.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=chips.length-1;
      if(next!==undefined){event.preventDefault();chips[next].focus();}
    });
  });
  function reset() {
    apply(0);
  }
  group.addEventListener('pointerleave',()=>{if(!group.contains(document.activeElement))reset();});
  group.addEventListener('focusout',()=>queueMicrotask(()=>{if(!group.contains(document.activeElement))reset();}));
  const measure=()=>apply(selected,true);
  let measureFrame=0;
  const resize=new ResizeObserver(()=>{if(!measureFrame)measureFrame=requestAnimationFrame(()=>{measureFrame=0;measure();});});
  resize.observe(group);
  document.fonts.ready.then(measure);
  reduce.addEventListener('change',measure);
  addEventListener('care-mode-change',measure);
  mobile.addEventListener('change',measure);
  apply(0,true);
}

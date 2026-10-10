// ClickSpark's eight radial lines, adapted to pointer input and this static site.
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.createElement('canvas');
canvas.className = 'click-spark-layer';
canvas.setAttribute('aria-hidden', 'true');
canvas.hidden = true;
canvas.style.cssText = 'position:fixed;inset:0;margin:0;padding:0;border:0;max-width:none;max-height:none;background:transparent;pointer-events:none;user-select:none;z-index:2147483647;';
if ('showPopover' in canvas) canvas.setAttribute('popover', 'manual');
document.body.append(canvas);
const context = canvas.getContext('2d');
const pointers = new Map();
let bursts = [], raf = 0;

function sizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(innerWidth * ratio);
  canvas.height = Math.round(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function hide() {
  if (canvas.hasAttribute('popover') && canvas.matches(':popover-open')) canvas.hidePopover();
  canvas.hidden = true;
}

function clear() {
  cancelAnimationFrame(raf);
  raf = 0;
  bursts = [];
  pointers.clear();
  context?.clearRect(0, 0, innerWidth, innerHeight);
  hide();
}

function sparkColor(target) {
  // Use mint over forest surfaces, and green over pale surfaces.
  for (let element = target instanceof Element ? target : null; element; element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor;
    const channels = color.match(/[\d.]+/g)?.map(Number);
    if (channels?.length >= 3 && (channels[3] ?? 1) > .7) {
      const luminance = .2126*channels[0] + .7152*channels[1] + .0722*channels[2];
      return luminance < 125 ? '#c7ecda' : '#087b62';
    }
  }
  return '#087b62';
}

function draw(time) {
  context.clearRect(0, 0, innerWidth, innerHeight);
  bursts = bursts.filter(burst => time - burst.time < 400);
  for (const burst of bursts) {
    const progress = Math.max(0, (time - burst.time) / 400);
    const eased = progress * (2 - progress);
    const distance = eased * burst.radius;
    const length = 10 * (1 - eased);
    context.strokeStyle = burst.color;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.globalAlpha = 1 - progress * .45;
    for (let i=0; i<8; i++) {
      const angle = 2*Math.PI*i/8;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      context.beginPath();
      context.moveTo(burst.x+distance*dx, burst.y+distance*dy);
      context.lineTo(burst.x+(distance+length)*dx, burst.y+(distance+length)*dy);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
  if (bursts.length) raf = requestAnimationFrame(draw);
  else { raf = 0; hide(); }
}

document.addEventListener('pointerdown', event => {
  if ((preference.matches || window.LouliCare?.reduceMotion) || !context || event.button !== 0) return;
  const pointer = {x:event.clientX, y:event.clientY, time:performance.now(), moved:false};
  pointers.set(event.pointerId, pointer);
  // A pinch or a multi-touch gesture is not a tap.
  if (pointers.size > 1) pointers.forEach(point => point.moved = true);
}, {capture:true, passive:true});

document.addEventListener('pointermove', event => {
  const pointer = pointers.get(event.pointerId);
  if (pointer && Math.hypot(event.clientX-pointer.x, event.clientY-pointer.y) > 10) pointer.moved = true;
}, {capture:true, passive:true});

document.addEventListener('pointerup', event => {
  const pointer = pointers.get(event.pointerId);
  pointers.delete(event.pointerId);
  if (!pointer || pointer.moved || preference.matches || event.button !== 0 || performance.now()-pointer.time > 650) return;
  if (Math.hypot(event.clientX-pointer.x, event.clientY-pointer.y) > 10) return;
  if (canvas.hidden) sizeCanvas();
  hide();
  canvas.hidden = false;
  if (canvas.hasAttribute('popover')) canvas.showPopover();
  bursts.push({x:event.clientX, y:event.clientY, time:performance.now(), radius:event.pointerType==='touch'?26:22, color:sparkColor(event.target)});
  bursts = bursts.slice(-24);
  if (!raf) raf = requestAnimationFrame(draw);
}, {capture:true, passive:true});

document.addEventListener('pointercancel', event => pointers.delete(event.pointerId), {capture:true, passive:true});
document.addEventListener('scroll', clear, {capture:true, passive:true});
document.addEventListener('visibilitychange', () => {if (document.hidden) clear();});
window.addEventListener('pagehide', clear);
window.addEventListener('resize', clear);
preference.addEventListener('change', clear);
window.addEventListener('care-mode-change',clear);

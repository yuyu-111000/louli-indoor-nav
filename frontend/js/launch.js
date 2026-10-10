// ScrollExpand's clip-path, zoom and text handoff adapted to this static site.
import {pixelSwap, smoothSwap} from './pixel-swap.js';
const root = document.querySelector('#launch');
const showcase = document.querySelector('#showcase');
if (root && showcase) {
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  let alreadyVisited = false;
  try {
    alreadyVisited = sessionStorage.getItem('louli-home-visited') === '1';
    sessionStorage.setItem('louli-home-visited', '1');
  } catch { /* Navigation metadata still works when storage is unavailable. */ }
  let internalReturn = false;
  try { internalReturn = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch {}
  const showLaunch = navigationType === 'reload' || (navigationType !== 'back_forward' && !alreadyVisited && !internalReturn);
  if (!showLaunch) {
    root.hidden = true;
  } else {
    root.hidden = false;
    if (location.hash === '#showcase') history.replaceState(history.state, '', location.pathname + location.search);
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    window.addEventListener('pageshow', () => { if (!root.hidden) { window.scrollTo(0, 0); measure(); } }, {once: true});
    const stage = root.querySelector('.launch-stage');
    const track = root.querySelector('.launch-track');
    const frame = root.querySelector('.launch-frame');
    const media = root.querySelector('.launch-media');
    const title = root.querySelector('.launch-wordmark');
    const overlay = root.querySelector('.launch-overlay');
    const scrim = root.querySelector('.launch-scrim');
    const hint = root.querySelector('.launch-hint');
    const topline = root.querySelector('.launch-topline');
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width:700px)');
    const clamp = value => Math.max(0, Math.min(1, value));
    const smoothstep = (start, end, value) => {
      const t = clamp((value - start) / (end - start));
      return t * t * (3 - 2 * t);
    };
    let stageHeight = 1;
    let current = 0;
    let raf = 0;
    let animationStart = 0;
    let animationFrom = 0;
    let animationTo = 0;
    let messageTime = 0;
    const expansionDuration = 1050;
    let entering = false;
    let messageReached = false;
    let lastWheel = 0;
    let touchGesture = null;

    const messageTop = () => stageHeight * 1.05;
    function showMain() {
      dismiss();
      history.replaceState(history.state, '', '#showcase');
      showcase.scrollIntoView({behavior: 'instant', block: 'start'});
      showcase.focus({preventScroll: true});
    }

    function transitionToMain(pixel = false) {
      if (entering || root.hidden) return;
      entering = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const transition = pixel ? pixelSwap : smoothSwap;
      transition({source: stage, swap: showMain, complete: () => showcase.focus({preventScroll: true})});
    }

    function finishExpansion() {
      raf = 0;
      current = animationTo;
      messageReached = current === 1;
      if (messageReached) messageTime = performance.now();
      paint(current);
      window.scrollTo({top: messageTop() * current, behavior: 'instant'});
    }

    function expand(to = 1) {
      if (raf || entering || current === to) return;
      animationFrom = current;
      animationTo = to;
      animationStart = performance.now();
      messageReached = false;
      if (motionPreference.matches) finishExpansion();
      else raf = requestAnimationFrame(tick);
    }

    function advance() {
      if (raf || entering) return;
      if (messageReached) {
        // Ignore the tail of the gesture that opened the message.
        if (performance.now() - messageTime >= 350) transitionToMain();
      } else expand();
    }

    function onWheel(event) {
      if (root.hidden || entering || event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      const now = performance.now();
      const newGesture = now - lastWheel > 280;
      lastWheel = now;
      if (!newGesture || raf) return;
      if (event.deltaY > 0) advance();
      else expand(0);
    }

    function onTouchStart(event) {
      touchGesture = event.touches.length === 1 ? {
        startY: event.touches[0].clientY,
        eligible: !raf && !entering,
        consumed: false
      } : null;
    }

    function onTouchMove(event) {
      if (!touchGesture || root.hidden || entering || event.touches.length !== 1) return;
      // Native momentum must never drive the timeline or pass the message.
      event.preventDefault();
      const delta = touchGesture.startY - event.touches[0].clientY;
      if (Math.abs(delta) < 12 || touchGesture.consumed) return;
      touchGesture.consumed = true;
      if (!touchGesture.eligible) return;
      if (delta > 0) advance();
      else expand(0);
    }
    function onTouchEnd() { touchGesture = null; }

    function onScrollKey(event) {
      if (root.hidden || entering || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!['ArrowDown','PageDown','End',' ','ArrowUp','PageUp','Home'].includes(event.key)) return;
      if (event.target.closest?.('a,button,input,textarea,select,[contenteditable]')) return;
      event.preventDefault();
      if (event.repeat) return;
      if (['ArrowUp','PageUp','Home'].includes(event.key) || (event.key === ' ' && event.shiftKey)) expand(0);
      else advance();
    }

    function paint(progress) {
      const eased = smoothstep(0, 1, progress);
      const startWidth = mobile.matches ? 74 : 42;
      const startHeight = mobile.matches ? 56 : 58;
      const insetX = (100 - startWidth) / 2 * (1 - eased);
      const insetY = (100 - startHeight) / 2 * (1 - eased);
      const radius = (mobile.matches ? 20 : 24) * (1 - eased);
      frame.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
      media.style.transform = `scale(${1.35 - .35 * eased})`;
      scrim.style.opacity = String(.45 * eased);
      const out = smoothstep(.4, .88, progress);
      title.style.opacity = String(1 - out);
      title.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + .06 * out})`;
      title.setAttribute('aria-hidden', String(out > .99));
      const incoming = smoothstep(.68, 1, progress);
      overlay.style.opacity = String(incoming);
      overlay.style.transform = `translate3d(0, ${18 * (1 - incoming)}px, 0)`;
      overlay.inert = progress < .92;
      overlay.setAttribute('aria-hidden', String(progress < .92));
      const hintOut = smoothstep(0, .12, progress);
      hint.style.opacity = String(1 - hintOut);
      hint.style.transform = `translate3d(0, ${8 * hintOut}px, 0)`;
      // The frame reaches the corner navigation near the end of expansion.
      topline.style.color = progress > .86 ? '#f5f9f5' : 'var(--ink)';
    }

    function tick(time) {
      const elapsed = clamp((time - animationStart) / expansionDuration);
      current = animationFrom + (animationTo - animationFrom) * elapsed;
      paint(current);
      window.scrollTo({top: messageTop() * current, behavior: 'instant'});
      if (elapsed < 1) raf = requestAnimationFrame(tick);
      else finishExpansion();
    }

    function onScroll() {
      if (root.hidden || entering) return;
      const expected = messageTop() * current;
      // Scrollbar/assistive scrolling uses the same fixed timeline as gestures.
      const delta = scrollY - expected;
      if (Math.abs(delta) < 2) return;
      window.scrollTo({top: expected, behavior: 'instant'});
      if (!raf) {
        if (delta > 0) advance();
        else expand(0);
      }
    }

    function measure() {
      stageHeight = stage.clientHeight || innerHeight;
      track.style.height = `${stageHeight * 2.27}px`;
      if (raf && motionPreference.matches) {
        cancelAnimationFrame(raf);
        finishExpansion();
      } else {
        paint(current);
        window.scrollTo({top: messageTop() * current, behavior: 'instant'});
      }
    }

    function dismiss() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      root.hidden = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      motionPreference.removeEventListener('change', measure);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onScrollKey);
    }

    function enter(event) {
      event.preventDefault();
      if (entering) return;
      transitionToMain(event.currentTarget.classList.contains('launch-enter'));
    }

    root.querySelectorAll('a[href="#showcase"]').forEach(link => link.addEventListener('click', enter));
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', measure);
    window.addEventListener('wheel', onWheel, {passive: false});
    window.addEventListener('touchstart', onTouchStart, {passive: true});
    window.addEventListener('touchmove', onTouchMove, {passive: false});
    window.addEventListener('touchend', onTouchEnd, {passive: true});
    window.addEventListener('touchcancel', onTouchEnd, {passive: true});
    window.addEventListener('keydown', onScrollKey);
    motionPreference.addEventListener('change', measure);
    window.addEventListener('pagehide', dismiss, {once: true});
    measure();
  }
}

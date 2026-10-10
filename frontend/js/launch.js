// ScrollExpand's clip-path, zoom and text handoff adapted to this static site.
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
    let target = 0;
    let raf = 0;
    let previousTime = 0;

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

    function readProgress() {
      return clamp(-track.getBoundingClientRect().top / (stageHeight * 1.05));
    }

    function tick(time) {
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 16.7;
      previousTime = time;
      current += (target - current) * (1 - Math.exp(-elapsed / 100));
      if (Math.abs(target - current) < .0004) current = target;
      paint(current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else { raf = 0; previousTime = 0; }
    }

    function onScroll() {
      if (showcase.getBoundingClientRect().top <= 1) {
        const remaining = Math.max(0, scrollY - root.offsetHeight);
        dismiss();
        window.scrollTo(0, remaining);
        return;
      }
      target = readProgress();
      if (motionPreference.matches) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        current = target;
        paint(current);
      } else if (!raf && current !== target) {
        raf = requestAnimationFrame(tick);
      }
    }

    function measure() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
      stageHeight = stage.clientHeight || innerHeight;
      track.style.height = `${stageHeight * 2.27}px`;
      current = target = readProgress();
      paint(current);
    }

    function dismiss() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      root.hidden = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      motionPreference.removeEventListener('change', measure);
    }

    function enter(event) {
      event.preventDefault();
      dismiss();
      history.replaceState(history.state, '', '#showcase');
      showcase.scrollIntoView({behavior: 'instant', block: 'start'});
      showcase.focus({preventScroll: true});
    }

    root.querySelectorAll('a[href="#showcase"]').forEach(link => link.addEventListener('click', enter));
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', measure);
    motionPreference.addEventListener('change', measure);
    window.addEventListener('pagehide', dismiss, {once: true});
    measure();
  }
}

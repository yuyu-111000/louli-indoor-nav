// GlideSelect-style interaction for the existing native select data sources.
const controllers = new WeakMap();
let opened = null;
let nextId = 0;

export function syncSelect(select) { controllers.get(select)?.sync(); }

export function enhanceSelects(scope = document) {
  for (const select of scope.querySelectorAll('select:not([multiple])')) {
    if (!controllers.has(select)) controllers.set(select, createSelect(select));
  }
}

function createSelect(select) {
  const wrapper = document.createElement('span');
  wrapper.className = 'glide-select';
  select.before(wrapper);
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'glide-select__trigger';
  trigger.dataset.selectId = select.id;
  const label = document.createElement('span');
  label.className = 'glide-select__label';
  const arrow = document.createElement('span');
  arrow.className = 'glide-select__chevron';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  trigger.append(label, arrow);
  wrapper.append(select, trigger);
  select.hidden = true;
  const accessibleName = select.getAttribute('aria-label') || select.labels?.[0]?.firstChild?.textContent.trim() || '选择';
  const id = `glide-list-${++nextId}`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-label', accessibleName);
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  const menu = document.createElement('div');
  menu.className = 'glide-select__menu';
  menu.hidden = true;
  if ('showPopover' in menu) menu.setAttribute('popover', 'manual');
  const list = document.createElement('div');
  list.className = 'glide-select__list';
  list.id = id;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', accessibleName);
  const pill = document.createElement('span');
  pill.className = 'glide-select__pill';
  pill.setAttribute('aria-hidden', 'true');
  menu.append(list);
  document.body.append(menu);
  let items = [], rows = [], active = -1, isOpen = false, closeTimer, swapTimer;
  let dragId = null, search = '', searchTime = 0;
  let parentDocument;
  try { if (parent !== window) parentDocument = parent.document; } catch { /* Cross-origin embed. */ }

  function highlight(index, instant = false, reveal = false) {
    if (!rows[index] || items[index].disabled) return;
    active = index;
    trigger.setAttribute('aria-activedescendant', rows[index].id);
    pill.style.transitionDuration = instant ? '0ms' : '';
    pill.style.transform = `translateY(${rows[index].offsetTop}px)`;
    pill.style.opacity = '1';
    rows.forEach((row, i) => row.dataset.active = String(i === index));
    if (reveal) {
      const row = rows[index];
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
      }
    }
  }

  function position() {
    if (!isOpen) return;
    const rect = trigger.getBoundingClientRect();
    const above = rect.top - 14, below = innerHeight - rect.bottom - 14;
    const side = below >= Math.min(260, items.length * 41 + 8) || below >= above ? 'bottom' : 'top';
    const available = Math.max(40, side === 'bottom' ? below : above);
    const width = Math.min(Math.max(180, rect.width), innerWidth - 16);
    menu.style.width = `${width}px`;
    list.style.maxHeight = `${Math.min(260, available) - 8}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
    menu.style.top = `${side === 'bottom' ? rect.bottom + 6 : Math.max(8, rect.top - menu.offsetHeight - 6)}px`;
    menu.dataset.side = side;
  }

  function close(instant = false) {
    isOpen = false;
    if (opened === controller) opened = null;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    menu.dataset.state = 'closed';
    document.removeEventListener('pointerdown', outside, true);
    parentDocument?.removeEventListener('pointerdown', parentOutside, true);
    window.removeEventListener('resize', position);
    document.removeEventListener('scroll', scrollOutside, true);
    clearTimeout(closeTimer);
    const hide = () => {
      if (menu.matches(':popover-open')) menu.hidePopover();
      menu.hidden = true;
    };
    if (instant) hide();
    else closeTimer = setTimeout(hide, 140);
  }

  function open() {
    sync();
    if (trigger.disabled) return;
    opened?.close(true);
    opened = controller;
    clearTimeout(closeTimer);
    isOpen = true;
    menu.hidden = false;
    menu.dataset.state = 'closed';
    if (menu.hasAttribute('popover')) menu.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    position();
    highlight(select.selectedIndex >= 0 ? select.selectedIndex : items.findIndex(i => !i.disabled), true, true);
    void menu.offsetHeight;
    menu.dataset.state = 'open';
    document.addEventListener('pointerdown', outside, true);
    parentDocument?.addEventListener('pointerdown', parentOutside, true);
    window.addEventListener('resize', position);
    document.addEventListener('scroll', scrollOutside, true);
  }

  function pick(index) {
    if (!items[index] || items[index].disabled) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    close(true);
    sync();
    if (changed) {
      wrapper.dataset.swap = '';
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => delete wrapper.dataset.swap, 180);
      select.dispatchEvent(new Event('input', {bubbles: true}));
      select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    trigger.focus({preventScroll: true});
  }

  function sync() {
    items = [...select.options];
    trigger.disabled = select.disabled || !items.some(option => !option.disabled);
    label.textContent = select.selectedOptions[0]?.textContent || '请选择';
    if (trigger.disabled && isOpen) close(true);
    rows = items.map((option, index) => {
      const row = document.createElement('div');
      row.className = 'glide-select__option';
      row.id = `${id}-${index}`;
      row.dataset.index = String(index);
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(index === select.selectedIndex));
      row.setAttribute('aria-disabled', String(option.disabled));
      const name = document.createElement('span');
      name.className = 'glide-select__name';
      const [main, ...tags] = option.textContent.split(' · ');
      name.textContent = main;
      row.append(name);
      if (tags.length) {
        const tag = document.createElement('span');
        tag.className = 'glide-select__tag';
        tag.textContent = tags.join(' · ');
        row.append(tag);
      }
      const check = document.createElement('span');
      check.className = 'glide-select__check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      row.append(check);
      row.addEventListener('click', () => { if (isOpen) pick(index); });
      return row;
    });
    list.replaceChildren(pill, ...rows);
    if (isOpen) { position(); highlight(select.selectedIndex, true, true); }
  }

  function outside(event) { if (!wrapper.contains(event.target) && !menu.contains(event.target)) close(); }
  function parentOutside() { close(); }
  function scrollOutside(event) { if (!menu.contains(event.target)) close(true); }
  function nextEnabled(index, direction) {
    for (let i = index + direction; i >= 0 && i < items.length; i += direction) {
      if (!items[i].disabled) return i;
    }
    return index;
  }
  function rowAt(event) {
    const rect = list.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return -1;
    return rows.findIndex(row => {
      const box = row.getBoundingClientRect();
      return event.clientY >= box.top && event.clientY <= box.bottom;
    });
  }

  trigger.addEventListener('click', () => isOpen ? close() : open());
  trigger.addEventListener('keydown', event => {
    const key = event.key;
    if (key === 'Tab') { close(true); return; }
    if (key === 'Escape') { if (isOpen) {event.preventDefault(); close(true);} return; }
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      if (!isOpen) { open(); return; }
      if (key === 'Enter' || key === ' ') { pick(active); return; }
      const direction = key === 'ArrowUp' || key === 'End' ? -1 : 1;
      const start = key === 'Home' ? -1 : key === 'End' ? items.length : active;
      highlight(nextEnabled(start, direction), true, true);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!isOpen) open();
      search = Date.now() - searchTime < 600 ? search + key.toLowerCase() : key.toLowerCase();
      searchTime = Date.now();
      let index = items.findIndex(option => !option.disabled && option.textContent.toLowerCase().startsWith(search));
      if (index < 0) { search = key.toLowerCase(); index = items.findIndex(option => !option.disabled && option.textContent.toLowerCase().startsWith(search)); }
      highlight(index, true, true);
    }
  });
  trigger.addEventListener('blur', () => { if (dragId === null) close(true); });
  list.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || dragId !== null) return;
    const row = event.target.closest('[data-index]');
    if (row) highlight(Number(row.dataset.index));
  });
  list.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    event.preventDefault();
    dragId = event.pointerId;
    list.setPointerCapture(dragId);
    highlight(rowAt(event));
  });
  list.addEventListener('pointermove', event => { if (dragId === event.pointerId) highlight(rowAt(event)); });
  list.addEventListener('pointerup', event => {
    if (dragId !== event.pointerId) return;
    dragId = null;
    const index = rowAt(event);
    if (list.hasPointerCapture(event.pointerId)) list.releasePointerCapture(event.pointerId);
    if (index >= 0) pick(index);
  });
  list.addEventListener('pointercancel', () => { dragId = null; });
  list.addEventListener('lostpointercapture', () => { dragId = null; });
  // Keep touch taps on the menu from moving focus away from the combobox.
  menu.addEventListener('mousedown', event => event.preventDefault());
  select.addEventListener('change', sync);
  const observer = new MutationObserver(sync);
  observer.observe(select, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label', 'selected']});
  const controller = {sync, close};
  window.addEventListener('pagehide', () => { close(true); observer.disconnect(); clearTimeout(swapTimer); }, {once: true});
  sync();
  return controller;
}

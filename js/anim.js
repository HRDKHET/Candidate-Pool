// Thin wrapper over anime.js v4. Every helper is a no-op when the library failed
// to load or the viewer prefers reduced motion, so the UI always works without it.
import { loadLib } from './cdn.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lib = null;
let loading = null;

export function loadAnime(timeoutMs = 2000) {
  if (reduce) return Promise.resolve(null);
  if (!loading) {
    loading = loadLib('anime').then((m) => (lib = m)).catch(() => null);
  }
  return Promise.race([loading, new Promise((r) => setTimeout(() => r(null), timeoutMs))]);
}

const has = (t) => lib && t && (!(t instanceof NodeList) || t.length) && (!Array.isArray(t) || t.length);

// Cards / sections rise into place, staggered.
export function enter(targets, { y = 24, step = 50, start = 0, duration = 650 } = {}) {
  if (!has(targets)) return;
  lib.animate(targets, {
    opacity: { from: 0 },
    y: { from: y },
    delay: lib.stagger(step, { start }),
    duration,
    ease: 'outQuint'
  });
}

export function rise(el, y = 24) { enter(el, { y, step: 0, duration: 400 }); }

// Geometric tiles / dialogs pop in with a little overshoot.
export function pop(targets, { step = 0, from = 'first', start = 0 } = {}) {
  if (!has(targets)) return;
  lib.animate(targets, {
    opacity: { from: 0 },
    scale: { from: 0.6 },
    delay: lib.stagger(step, { from, start }),
    duration: 600,
    ease: 'outBack(1.6)'
  });
}

export function float(el, { y = -14, duration = 2600, delay = 0 } = {}) {
  if (!has(el)) return;
  lib.animate(el, { y, duration, delay, loop: true, alternate: true, ease: 'inOutSine' });
}

export function spin(el, duration = 8000) {
  if (!has(el)) return;
  lib.animate(el, { rotate: '1turn', duration, loop: true, ease: 'linear' });
}

// KPI numbers count up from zero.
export function countUp(els) {
  if (!lib) return;
  els.forEach((el) => {
    const end = Number(el.dataset.value || el.textContent) || 0;
    // The real value stays in place until the first frame runs, so a background
    // tab never shows a stale zero.
    const o = { v: 0 };
    lib.animate(o, {
      v: end,
      duration: 800,
      ease: 'outQuart',
      onUpdate: () => { el.textContent = String(Math.round(o.v)); },
      onComplete: () => { el.textContent = String(end); }
    });
  });
}

// Bars grow from zero to their inline width.
export function grow(targets, step = 70) {
  if (!has(targets)) return;
  lib.animate(targets, { width: { from: '0%' }, delay: lib.stagger(step), duration: 900, ease: 'outQuart' });
}

// Element slides out, then the callback runs (e.g. re-render without it).
// The callback always runs once: browsers pause animations in background tabs, so a
// timer backs up onComplete and the user's action is never left waiting.
export function leave(el, done) {
  let called = false;
  const once = () => { if (!called) { called = true; done(); } };
  if (!has(el)) { once(); return; }
  lib.animate(el, { opacity: 0, x: 40, scale: 0.96, duration: 280, ease: 'inQuad', onComplete: once });
  setTimeout(once, 400);
}

export function press(el) {
  if (!has(el)) return;
  lib.animate(el, { scale: [{ to: 0.96, duration: 90 }, { to: 1, duration: 260, ease: 'outBack(2)' }] });
}

// Radar polygons grow out of the chart centre, one after another.
export function radar(targets) {
  if (!has(targets)) return;
  lib.animate(targets, { scale: { from: 0 }, opacity: { from: 0 }, delay: lib.stagger(120), duration: 700, ease: 'outBack(1.2)' });
}

export function switchIn(el) { enter(el, { y: 12, step: 0, duration: 380 }); }

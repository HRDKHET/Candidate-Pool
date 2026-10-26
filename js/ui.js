// Shared constants, formatting helpers, modal and toast.
import { CONFIG } from './config.js';

export const POOL = 'HR';
export const UNITS = CONFIG.units;
export const LOCATIONS = [POOL, ...UNITS];

export const DECISIONS = ['รอพิจารณา', 'เรียกสัมภาษณ์', 'นัดสัมภาษณ์แล้ว', 'สำรอง', 'ไม่พิจารณา'];
export const DECISION_STYLE = {
  'รอพิจารณา': { color: '#FFD84D', bg: '#FFF1C2', fg: '#5C4300' },
  'เรียกสัมภาษณ์': { color: '#C8F169', bg: '#E8FBC4', fg: '#2E4A00' },
  'นัดสัมภาษณ์แล้ว': { color: '#5B3DF5', bg: '#5B3DF5', fg: '#FFFFFF' },
  'สำรอง': { color: '#8EC5FF', bg: '#DCE8FF', fg: '#1D3A7A' },
  'ไม่พิจารณา': { color: '#111111', bg: '#ECEBE7', fg: '#3D3C38' }
};
export const RECOMMENDATIONS = ['Strongly Recommend', 'Recommend', 'Consider', 'Review'];

const LOC_STYLE = [
  { color: '#FF7A3D', shape: '999px' },
  { color: '#5B3DF5', shape: '999px' },
  { color: '#2F9E44', shape: '12px 12px 0 0' },
  { color: '#1C7ED6', shape: '0 0 0 12px' },
  { color: '#111111', shape: '3px' }
];
export function locStyle(loc) {
  const i = LOCATIONS.indexOf(loc);
  return LOC_STYLE[i < 0 ? 0 : i % LOC_STYLE.length];
}
export function locLabel(loc) {
  return loc === POOL ? 'คลังกลาง (HR)' : loc;
}

const AVATARS = [
  { bg: '#5B3DF5', fg: '#FFFFFF', shape: '999px' },
  { bg: '#FF7A3D', fg: '#111111', shape: '26px 26px 8px 26px' },
  { bg: '#C8F169', fg: '#111111', shape: '999px' },
  { bg: '#111111', fg: '#FFFFFF', shape: '8px 26px 26px 26px' },
  { bg: '#8EC5FF', fg: '#111111', shape: '999px' },
  { bg: '#FFB3D1', fg: '#111111', shape: '26px 8px 26px 26px' },
  { bg: '#FFD84D', fg: '#111111', shape: '999px' }
];
export function avatarFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function recommendationFor(c) {
  if (c.recommendation) return c.recommendation;
  if (c.match == null) return '';
  return c.match >= 0.9 ? 'Strongly Recommend' : c.match >= 0.8 ? 'Recommend' : 'Consider';
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return '—';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;
}
export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const t = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmtDate(iso)} · ${t} น.`;
}
// ISO string -> value for <input type="datetime-local">
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function baht(n) {
  return n == null || n === '' ? '—' : Number(n).toLocaleString('th-TH') + ' ฿';
}
export function pct(m) {
  return m == null ? '—' : Math.round(m * 100) + '%';
}

export const ICONS = {
  calendar: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
  arrow: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  logout: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  search: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F5E58" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  close: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  doc: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  info: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
  shield: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B23C9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  refresh: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/></svg>'
};

export const LOGO = '<div class="logo-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></div>';

/* ---------- toast ---------- */
export function toast(message, { action, onAction, error = false, timeout = 6000 } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' error' : '');
  el.innerHTML = `<span>${esc(message)}</span>` + (action ? `<button type="button">${esc(action)}</button>` : '');
  root.appendChild(el);
  const remove = () => el.remove();
  if (action) el.querySelector('button').onclick = () => { remove(); onAction && onAction(); };
  import('./anim.js').then((a) => a.rise(el, 16));
  setTimeout(remove, timeout);
}

/* ---------- modal ---------- */
// Renders html into a dialog. `bind(dialogEl, close)` wires events. Returns close().
export function openModal(html, bind, { wide = false } = {}) {
  const root = document.getElementById('modal-root');
  const opener = document.activeElement;
  root.innerHTML = `<div class="modal-backdrop"><div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div></div>`;
  const backdrop = root.firstElementChild;
  const dialog = backdrop.firstElementChild;
  const close = () => {
    root.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    if (opener && opener.focus) opener.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = dialog.querySelectorAll('button, [href], input, select, textarea');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  bind && bind(dialog, close);
  const focusable = dialog.querySelector('input, select, textarea, button:not([data-close])');
  (focusable || dialog).focus();
  import('./anim.js').then((a) => a.pop(dialog));
  return close;
}

export function confirmDialog({ title, body, confirm = 'ยืนยัน', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const close = openModal(`
      <div class="modal-head"><h2 id="modal-title">${esc(title)}</h2></div>
      <p class="muted" style="font-size:15px;line-height:1.7">${esc(body)}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>ยกเลิก</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-ok>${esc(confirm)}</button>
      </div>`, (dlg, closeFn) => {
      dlg.querySelector('[data-ok]').onclick = () => { done = true; closeFn(); resolve(true); };
      const obs = new MutationObserver(() => {
        if (!dlg.isConnected) { obs.disconnect(); if (!done) resolve(false); }
      });
      obs.observe(document.getElementById('modal-root'), { childList: true });
    });
    return close;
  });
}

export function errorMessage(e) {
  return (e && (e.message || e.error_description)) || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

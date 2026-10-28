// Shared constants, formatting helpers, modal and toast.
import { CONFIG } from './config.js';

export const POOL = 'HR';
export const HRS = CONFIG.hrsName;
// Filled from the database at start-up (setOrg); every module shares these same arrays.
export const DIVISIONS = [];
export const UNITS = [];
export const LOCATIONS = [POOL];

export function setOrg(divisions) {
  DIVISIONS.splice(0, DIVISIONS.length, ...divisions);
  UNITS.splice(0, UNITS.length, ...divisions.flatMap((d) => d.units));
  LOCATIONS.splice(1, LOCATIONS.length - 1, ...UNITS);
}
setOrg(CONFIG.divisions);

export function divisionOf(unit) {
  return DIVISIONS.find((d) => d.units.includes(unit)) || null;
}
export function unitFullLabel(unit) {
  const d = divisionOf(unit);
  return d ? `${d.name} · ${unit}` : unit;
}

export const MODE_LABEL = { online: 'Online', onsite: 'Onsite' };
export const INTERVIEW_STATUS = {
  requested: { label: `รอ ${CONFIG.hrsName} ยืนยันนัด`, color: '#FF7A3D', bg: '#FFF1E8', fg: '#7A2E00' },
  confirmed: { label: 'ยืนยันนัดแล้ว', color: '#5B3DF5', bg: '#5B3DF5', fg: '#FFFFFF' }
};
export function interviewerText(list) {
  return (list || []).map((p) => [p.name, [p.position, p.department].filter(Boolean).join(', ')].filter(Boolean).join(' — ')).join('; ');
}

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
  return loc === POOL ? 'Candidate Pool' : loc;
}

// "New" = entered the system within CONFIG.newDays.
export function isNew(c) {
  return !!c.createdAt && Date.now() - new Date(c.createdAt).getTime() < CONFIG.newDays * 86400000;
}
export const NEW_BADGE = '<span class="new-badge">New</span>';
// Same badge pinned to the top-left corner of a card (the card is position: relative).
export const NEW_TAG = '<span class="new-badge new-tag">New</span>';

// Time left before a picked candidate returns to the Candidate Pool, or null.
// clock = "HH:MM:SS" counting down in hours; share = fraction of the window left.
export function holdLeft(c) {
  if (!c.holdUntil || c.decision !== 'รอพิจารณา') return null;
  const ms = new Date(c.holdUntil).getTime() - Date.now();
  const left = Math.max(0, ms);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const two = (n) => String(n).padStart(2, '0');
  return {
    ms, urgent: ms < 12 * 3600000,
    text: ms <= 0 ? 'หมดเวลาแล้ว' : h ? `${h} ชม. ${m} นาที` : `${m} นาที`,
    clock: `${two(h)}:${two(m)}:${two(s)}`,
    share: Math.min(1, left / (CONFIG.holdHours * 3600000))
  };
}

// Logo: back to the start page of this account with a full reload (fresh data).
export function goHome(hash) {
  history.replaceState(null, '', hash);
  location.reload();
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
// Only http(s) links may become an href: blocks javascript:, data: and similar.
export const isWebUrl = (u) => /^https?:\/\/[^\s]+$/i.test(String(u || '').trim());
export const safeUrl = (u) => (isWebUrl(u) ? String(u).trim() : '');

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
// HR Match scale, high to low: red ≥ 90, orange ≥ 80, yellow ≥ 70, green below.
// text = readable on white, fill = bar colour.
export function matchColor(m) {
  if (m == null) return { text: '#5F5E58', fill: '#CFCDC6' };
  if (m >= 0.9) return { text: '#C92A2A', fill: '#E03131' };
  if (m >= 0.8) return { text: '#D9480F', fill: '#FD7E14' };
  if (m >= 0.7) return { text: '#946200', fill: '#FAB005' };
  return { text: '#2B8A3E', fill: '#40C057' };
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
  bell: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  video: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>',
  pin: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  radar: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 6.5-3.5 10.5h-11L3 8.5z"/><path d="M12 7l4.5 3.3-1.7 5.2H9.2l-1.7-5.2z"/></svg>',
  trash: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  chevL: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  chevR: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
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

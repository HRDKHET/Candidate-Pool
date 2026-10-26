// In-app notifications: bell button, list dialog and polling.
import { esc, ICONS, fmtDateTime, openModal, toast } from './ui.js';

export function bellHTML(list) {
  const unread = list.filter((n) => !n.readAt).length;
  return `<button type="button" class="bell" data-bell aria-label="การแจ้งเตือน${unread ? ' ' + unread + ' รายการใหม่' : ''}">
    ${ICONS.bell}${unread ? `<span class="bell-count" aria-hidden="true">${unread > 9 ? '9+' : unread}</span>` : ''}
  </button>`;
}

const KIND = {
  interview_requested: { color: '#FF7A3D', label: 'คำขอนัด' },
  interview_confirmed: { color: '#5B3DF5', label: 'ยืนยันนัด' },
  interview_cancelled: { color: '#8C8A83', label: 'ยกเลิกนัด' }
};

// onItem(candidateId) lets the view jump to the related interview.
export function openNotifications(list, { onItem } = {}) {
  openModal(`
    <div class="modal-head">
      <h2 id="modal-title">การแจ้งเตือน</h2>
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
    </div>
    ${list.length ? `<ul class="notif-list">${list.map((n) => {
      const k = KIND[n.kind] || { color: '#111', label: '' };
      return `<li class="notif${n.readAt ? '' : ' unread'}">
        <span class="notif-dot" aria-hidden="true" style="background:${k.color}"></span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
          <span class="muted" style="font-size:12px">${esc(k.label)} · ${esc(fmtDateTime(n.createdAt))}${n.readAt ? '' : ' · <strong style="color:#B42318">ใหม่</strong>'}</span>
          <strong>${esc(n.title)}</strong>
          ${n.body ? `<span class="muted" style="font-size:14px">${esc(n.body)}</span>` : ''}
          <span style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            ${n.link ? `<a class="btn btn-sm btn-violet" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer">${ICONS.video} เข้าห้องสัมภาษณ์</a>` : ''}
            ${n.candidateId && onItem ? `<button type="button" class="btn btn-sm" data-item="${esc(n.candidateId)}">ดูนัดหมาย</button>` : ''}
          </span>
        </div>
      </li>`;
    }).join('')}</ul>` : '<p class="muted">ยังไม่มีการแจ้งเตือน</p>'}`, (dlg, close) => {
    dlg.querySelectorAll('[data-item]').forEach((b) => b.addEventListener('click', () => { close(); onItem(b.dataset.item); }));
  });
}

// Polls every minute and when the tab regains focus. Returns stop().
export function watchNotifications(store, onChange) {
  let last = null;
  const load = async () => {
    try {
      const list = await store.listNotifications();
      const unread = list.filter((n) => !n.readAt).length;
      if (last != null && unread > last) toast(`มีการแจ้งเตือนใหม่ ${unread - last} รายการ`);
      last = unread;
      onChange(list);
    } catch (e) { /* offline or signed out: try again next tick */ }
  };
  const timer = setInterval(load, 60000);
  const onFocus = () => load();
  window.addEventListener('focus', onFocus);
  load();
  return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
}

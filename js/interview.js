// Interview form (unit request or HRS confirmation) and the read-only detail view.
import {
  esc, ICONS, HRS, DIVISIONS, MODE_LABEL, INTERVIEW_STATUS, toLocalInput, fmtDateTime,
  unitFullLabel, openModal, errorMessage, safeUrl
} from './ui.js';

let rowSeq = 0;
const personRow = (p = {}) => {
  const i = ++rowSeq;
  return `
  <div class="person-row" data-person>
    <div class="field"><label for="pn-${i}">ชื่อ-สกุล</label><input id="pn-${i}" class="input" data-k="name" autocomplete="off" value="${esc(p.name || '')}"></div>
    <div class="field"><label for="pp-${i}">ตำแหน่ง</label><input id="pp-${i}" class="input" data-k="position" autocomplete="off" value="${esc(p.position || '')}"></div>
    <div class="field"><label for="pd-${i}">ฝ่าย</label><input id="pd-${i}" class="input" data-k="department" list="dep-list" autocomplete="off" value="${esc(p.department || '')}"></div>
    <button type="button" class="icon-btn person-remove" data-remove-person aria-label="ลบผู้สัมภาษณ์คนนี้">${ICONS.trash}</button>
  </div>`;
};

// asHrs: HRS books/confirms (needs a link for Online). Otherwise the unit sends a request.
export function openInterviewForm(c, { asHrs = false, onSubmit }) {
  let mode = c.interviewMode || 'online';
  const people = c.interviewers && c.interviewers.length ? c.interviewers : [{}];
  const deps = [...DIVISIONS.map((d) => d.name), HRS];
  const requested = c.interviewStatus === 'requested' && c.requestedBy;

  openModal(`
    <div class="modal-head">
      <div style="display:flex;flex-direction:column;gap:4px">
        <h2 id="modal-title">${asHrs ? (requested ? 'ยืนยันนัดสัมภาษณ์' : 'จัดนัดสัมภาษณ์') : 'ขอนัดสัมภาษณ์'}</h2>
        <p class="muted" style="font-size:15px">${esc(c.id)} · ${esc(c.name)} · ${esc(c.position || '')}</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
    </div>
    ${asHrs && requested ? `<div class="info-box" style="font-size:14px">${ICONS.info}<span>คำขอจาก <strong>${esc(c.requestedBy)}</strong> เมื่อ ${esc(fmtDateTime(c.requestedAt))} ตรวจสอบแล้วแก้ไขได้ก่อนยืนยัน</span></div>` : ''}
    ${!asHrs ? `<div class="info-box" style="font-size:14px">${ICONS.info}<span>คำขอจะถูกส่งไปที่ ${esc(HRS)} เพื่อดำเนินการนัดหมาย เมื่อ ${esc(HRS)} ยืนยันแล้ว คุณจะได้รับการแจ้งเตือนพร้อมลิงก์ (กรณี Online)</span></div>` : ''}
    <form data-iform class="form-grid" novalidate>
      <div class="field span-2"><label for="i-at">วันและเวลาสัมภาษณ์</label><input id="i-at" class="input" type="datetime-local" required value="${esc(toLocalInput(c.interviewAt))}"></div>
      <div class="field span-2">
        <span class="label" id="mode-label">รูปแบบการสัมภาษณ์</span>
        <div class="seg" role="group" aria-labelledby="mode-label">
          <button type="button" data-mode="online" aria-pressed="${mode === 'online'}">${ICONS.video} Online</button>
          <button type="button" data-mode="onsite" aria-pressed="${mode === 'onsite'}">${ICONS.pin} Onsite</button>
        </div>
      </div>
      <div class="field span-2" data-when="onsite" ${mode === 'onsite' ? '' : 'hidden'}><label for="i-loc">สถานที่สัมภาษณ์</label><input id="i-loc" class="input" placeholder="เช่น ห้องประชุม 3 อาคาร A" value="${esc(c.interviewLocation || '')}"></div>
      ${asHrs
        ? `<div class="field span-2" data-when="online" ${mode === 'online' ? '' : 'hidden'}><label for="i-link">ลิงก์เข้าสัมภาษณ์ Online</label><input id="i-link" class="input" type="url" placeholder="https://" value="${esc(c.meetingLink || '')}"></div>`
        : `<p class="muted span-2" data-when="online" ${mode === 'online' ? '' : 'hidden'} style="font-size:14px">${esc(HRS)} จะสร้างลิงก์เข้าสัมภาษณ์และส่งให้หลังยืนยันนัด</p>`}

      <fieldset class="span-2" style="margin:0;padding:0;border:0;display:flex;flex-direction:column;gap:12px">
        <legend class="label" style="padding:0;margin-bottom:10px;font-size:14px;font-weight:600">ผู้สัมภาษณ์</legend>
        <div data-people style="display:flex;flex-direction:column;gap:12px">${people.map(personRow).join('')}</div>
        <button type="button" class="btn btn-sm" data-add-person style="align-self:flex-start">${ICONS.plus} เพิ่มผู้สัมภาษณ์</button>
        <datalist id="dep-list">${deps.map((d) => `<option value="${esc(d)}"></option>`).join('')}</datalist>
      </fieldset>

      <div class="field"><label for="i-proj">ชื่อโครงการ</label><input id="i-proj" class="input" value="${esc(c.projectName || '')}"></div>
      <div class="field"><label for="i-note">หมายเหตุ</label><input id="i-note" class="input" value="${esc(c.remark || '')}"></div>
      ${asHrs ? `<div class="field span-2"><label for="i-cnote">ข้อความถึงหน่วยงาน (แสดงในการแจ้งเตือน)</label><input id="i-cnote" class="input" value="${esc(c.confirmNote || '')}"></div>` : ''}
      <div class="error-box span-2" data-err hidden role="alert"></div>
      <div class="modal-actions span-2">
        <button type="button" class="btn" data-close>ยกเลิก</button>
        <button type="submit" class="btn ${asHrs ? 'btn-violet' : 'btn-dark'}">${asHrs ? 'ยืนยันนัดและแจ้งหน่วยงาน' : `ส่งคำขอถึง ${esc(HRS)}`}</button>
      </div>
    </form>`, (dlg, close) => {
    const list = dlg.querySelector('[data-people]');
    const err = dlg.querySelector('[data-err]');
    dlg.addEventListener('click', (e) => {
      const m = e.target.closest('[data-mode]');
      if (m) {
        mode = m.dataset.mode;
        dlg.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === m)));
        dlg.querySelectorAll('[data-when]').forEach((el) => { el.hidden = el.dataset.when !== mode; });
      }
      if (e.target.closest('[data-add-person]')) {
        if (list.children.length >= 8) return;
        list.insertAdjacentHTML('beforeend', personRow());
        list.lastElementChild.querySelector('input').focus();
      }
      const rm = e.target.closest('[data-remove-person]');
      if (rm) {
        if (list.children.length > 1) rm.closest('[data-person]').remove();
        else rm.closest('[data-person]').querySelectorAll('input').forEach((i) => { i.value = ''; });
      }
    });
    dlg.querySelector('[data-iform]').onsubmit = async (e) => {
      e.preventDefault();
      const at = dlg.querySelector('#i-at').value;
      const val = (sel) => (dlg.querySelector(sel) ? dlg.querySelector(sel).value.trim() : '');
      const data = {
        interviewAt: at ? new Date(at).toISOString() : null,
        interviewMode: mode,
        interviewLocation: val('#i-loc'),
        meetingLink: val('#i-link'),
        interviewers: [...list.querySelectorAll('[data-person]')].map((row) => ({
          name: row.querySelector('[data-k=name]').value.trim(),
          position: row.querySelector('[data-k=position]').value.trim(),
          department: row.querySelector('[data-k=department]').value.trim()
        })),
        projectName: val('#i-proj'), remark: val('#i-note'), confirmNote: val('#i-cnote')
      };
      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true;
      try { await onSubmit(data); close(); }
      catch (ex) { err.hidden = false; err.textContent = errorMessage(ex); btn.disabled = false; }
    };
  }, { wide: true });
}

// Read-only view of a booked or requested interview. `actions` = [{ id, label, primary }].
export function showInterviewDetail(c, { actions = [], onAction } = {}) {
  const st = INTERVIEW_STATUS[c.interviewStatus];
  openModal(`
    <div class="modal-head">
      <div style="display:flex;flex-direction:column;gap:6px">
        ${st ? `<span class="pill" style="align-self:flex-start;background:${st.bg};color:${st.fg}">${esc(st.label)}</span>` : ''}
        <h2 id="modal-title">${esc(c.name)}</h2>
        <p class="muted" style="font-size:15px">${esc(c.id)} · ${esc(c.position || '')} · ${esc(unitFullLabel(c.location))}</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
    </div>
    <dl class="facts" style="font-size:15px">
      <div><dt>วันและเวลา</dt><dd>${esc(fmtDateTime(c.interviewAt))}</dd></div>
      <div><dt>รูปแบบ</dt><dd>${esc(MODE_LABEL[c.interviewMode] || '—')}</dd></div>
      ${c.interviewMode === 'onsite' ? `<div class="span-2" style="grid-column:span 2"><dt>สถานที่</dt><dd>${esc(c.interviewLocation || '—')}</dd></div>` : ''}
      ${c.interviewMode === 'online' ? `<div style="grid-column:span 2"><dt>ลิงก์เข้าสัมภาษณ์</dt><dd>${safeUrl(c.meetingLink) ? `<a href="${esc(safeUrl(c.meetingLink))}" target="_blank" rel="noopener noreferrer">${esc(c.meetingLink)}</a>` : `<span class="muted">รอ ${esc(HRS)} ส่งลิงก์</span>`}</dd></div>` : ''}
      <div><dt>ชื่อโครงการ</dt><dd>${esc(c.projectName || '—')}</dd></div>
      <div><dt>หมายเหตุ</dt><dd>${esc(c.remark || '—')}</dd></div>
      ${c.confirmNote ? `<div style="grid-column:span 2"><dt>ข้อความจาก ${esc(HRS)}</dt><dd>${esc(c.confirmNote)}</dd></div>` : ''}
    </dl>
    <div style="display:flex;flex-direction:column;gap:8px">
      <span class="label" style="font-size:14px;font-weight:600">ผู้สัมภาษณ์</span>
      <ul class="people-list">${(c.interviewers || []).map((p) => `<li><strong>${esc(p.name)}</strong><span class="muted">${esc([p.position, p.department].filter(Boolean).join(' · '))}</span></li>`).join('') || '<li class="muted">—</li>'}</ul>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>ปิด</button>
      ${actions.map((a) => `<button type="button" class="btn ${a.primary ? 'btn-violet' : ''}" data-act="${esc(a.id)}">${esc(a.label)}</button>`).join('')}
    </div>`, (dlg, close) => {
    dlg.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { close(); onAction && onAction(b.dataset.act); }));
  });
}

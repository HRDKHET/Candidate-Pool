// Candidate profile popup: everything about one candidate in one place.
// `actions` = [{ id, label, primary, danger }]; the popup closes before onAction runs.
import {
  esc, ICONS, HRS, POOL, DECISION_STYLE, INTERVIEW_STATUS, MODE_LABEL, avatarFor, recommendationFor, recLabel,
  fmtDate, fmtDateTime, baht, pct, openModal, isNew, NEW_BADGE, holdLeft, safeUrl, locLabel, unitFullLabel, matchColor
} from './ui.js';

const fact = (label, value, wide = false) =>
  `<div${wide ? ' style="grid-column:1 / -1"' : ''}><dt>${esc(label)}</dt><dd>${value}</dd></div>`;

function salaryFacts(c, showSalary) {
  if (!showSalary) {
    return fact('เงินเดือน', `<span class="muted" style="font-weight:500">${esc(HRS)} ยังไม่เปิดให้เห็นเงินเดือนของผู้สมัครรายนี้</span>`, true);
  }
  const raise = c.salaryCurrent && c.salaryExpected != null
    ? Math.round(((c.salaryExpected - c.salaryCurrent) / c.salaryCurrent) * 100) : null;
  return fact('เงินเดือนปัจจุบัน', baht(c.salaryCurrent)) +
    fact('เงินเดือนคาดหวัง', `${baht(c.salaryExpected)}${raise == null ? '' : ` <span class="muted" style="font-weight:500">(${raise >= 0 ? '+' : ''}${raise}%)</span>`}`);
}

function interviewSection(c) {
  const ist = INTERVIEW_STATUS[c.interviewStatus];
  if (!ist) return '';
  const link = safeUrl(c.meetingLink);
  return `
    <section class="profile-section" aria-labelledby="pf-iv">
      <h3 id="pf-iv">นัดสัมภาษณ์ <span class="pill" style="background:${ist.bg};color:${ist.fg}">${esc(ist.label)}</span></h3>
      <dl class="facts">
        ${fact('วันและเวลา', esc(fmtDateTime(c.interviewAt)))}
        ${fact('รูปแบบ', esc(MODE_LABEL[c.interviewMode] || '—'))}
        ${c.interviewMode === 'onsite' ? fact('สถานที่', esc(c.interviewLocation || '—'), true) : ''}
        ${c.interviewMode === 'online' ? fact('ลิงก์เข้าสัมภาษณ์', link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(c.meetingLink)}</a>` : `<span class="muted">รอ ${esc(HRS)} ส่งลิงก์</span>`, true) : ''}
        ${c.projectName ? fact('ชื่อโครงการ', esc(c.projectName)) : ''}
        ${c.remark ? fact('หมายเหตุ', esc(c.remark)) : ''}
        ${c.confirmNote ? fact(`ข้อความจาก ${HRS}`, esc(c.confirmNote), true) : ''}
      </dl>
      <ul class="people-list">${(c.interviewers || []).map((p) => `<li><strong>${esc(p.name)}</strong><span class="muted">${esc([p.position, p.department].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul>
    </section>`;
}

export function openProfile(c, { actions = [], onAction, showSalary = true } = {}) {
  const av = avatarFor(c.id);
  const rec = recommendationFor(c);
  const m = c.match ?? 0;
  const ds = DECISION_STYLE[c.decision] || DECISION_STYLE['รอพิจารณา'];
  const hold = holdLeft(c);
  const cv = safeUrl(c.cvUrl);
  const where = c.location === POOL ? locLabel(POOL) : unitFullLabel(c.location);

  openModal(`
    <div class="profile-head">
      <span class="avatar profile-avatar" aria-hidden="true" style="border-radius:${av.shape};background:${av.bg};color:${av.fg}">${esc(c.name.charAt(0))}</span>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
        <span class="card-id">${esc(c.id)} ${isNew(c) ? NEW_BADGE : ''}</span>
        <h2 id="modal-title" style="font-size:28px;font-weight:700">${esc(c.name)}</h2>
        <span class="muted" style="font-size:16px">${esc(c.position || 'ไม่ระบุตำแหน่ง')}</span>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
    </div>

    <div class="profile-status">
      <span class="pill" style="background:var(--soft);color:var(--ink)">อยู่ที่ ${esc(where)}</span>
      <span class="pill" style="background:${ds.bg};color:${ds.fg}">${esc(c.decision || 'รอพิจารณา')}</span>
      ${hold ? `<span class="pill" style="background:${hold.urgent ? '#FDECEA' : '#FFF6D6'};color:${hold.urgent ? '#8A1C12' : '#5C4300'}">เด้งกลับ Candidate Pool ใน ${esc(hold.text)}</span>` : ''}
    </div>

    <section class="profile-match" aria-label="HR Match">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">
        <span style="font-weight:600">HR Match</span>
        <strong style="font-size:32px;line-height:1;color:${matchColor(c.match).text}">${pct(c.match)}</strong>
      </div>
      <div class="bar" aria-hidden="true"><div style="width:${Math.round(m * 100)}%;background:${matchColor(c.match).fill}"></div></div>
    </section>

    <section class="profile-section" aria-labelledby="pf-info">
      <h3 id="pf-info">ข้อมูลผู้สมัคร</h3>
      <dl class="facts">
        ${fact('อายุ', c.age == null ? '—' : esc(c.age) + ' ปี')}
        ${fact('ประสบการณ์รวม', c.experience == null ? '—' : esc(c.experience) + ' ปี')}
        ${fact('การศึกษา', esc(c.education || '—'))}
        ${fact('บริษัทล่าสุด', esc(c.company || '—'))}
        ${fact('วันที่ Prescreen', esc(fmtDate(c.prescreenDate)))}
        ${fact('เข้าระบบเมื่อ', esc(fmtDate(c.createdAt)))}
        ${salaryFacts(c, showSalary)}
      </dl>
    </section>

    <section class="profile-section" aria-labelledby="pf-hr">
      <h3 id="pf-hr">ความเห็น ${esc(HRS)} ${rec ? `<span class="pill" style="background:#E4DDFF;color:#2A1A8C">${esc(recLabel(rec))}</span>` : ''}</h3>
      <p style="font-size:15px;line-height:1.7">${esc(c.hrNote || `ยังไม่มีความเห็นจาก ${HRS}`)}</p>
      ${cv ? `<a class="btn btn-sm" style="align-self:flex-start" href="${esc(cv)}" target="_blank" rel="noopener noreferrer">${ICONS.doc} เปิด Resume / CV</a>` : '<span class="muted" style="font-size:14px">ไม่มีลิงก์ Resume / CV</span>'}
    </section>

    ${interviewSection(c)}

    <div class="modal-actions">
      <button type="button" class="btn" data-close>ปิด</button>
      ${actions.map((a) => `<button type="button" class="btn ${a.primary ? 'btn-dark' : a.danger ? 'btn-danger' : ''}" data-act="${esc(a.id)}">${a.icon || ''}${esc(a.label)}</button>`).join('')}
    </div>`, (dlg, close) => {
    dlg.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { close(); onAction && onAction(b.dataset.act); }));
  }, { wide: true });
}

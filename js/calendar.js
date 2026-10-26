// Month calendar of interviews (requested + confirmed) with an agenda list below.
// Wire clicks with: [data-cal] = prev | next | today, [data-event] = candidate id.
import { esc, ICONS, INTERVIEW_STATUS, MODE_LABEL } from './ui.js';

const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const time = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });

export function monthStart(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function shiftMonth(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

export function calendarHTML(cursor, candidates, { showUnit = false } = {}) {
  const events = candidates
    .filter((c) => c.interviewAt && c.interviewStatus)
    .map((c) => ({ c, at: new Date(c.interviewAt) }))
    .sort((a, b) => a.at - b.at);
  const byDay = new Map();
  events.forEach((e) => { const k = key(e.at); byDay.set(k, [...(byDay.get(k) || []), e]); });

  const first = monthStart(cursor);
  const offset = (first.getDay() + 6) % 7;
  const today = key(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 - offset + i);
    const inMonth = d.getMonth() === first.getMonth();
    const list = byDay.get(key(d)) || [];
    cells.push(`
      <div class="cal-cell${inMonth ? '' : ' out'}${key(d) === today ? ' today' : ''}">
        <span class="cal-day">${d.getDate()}</span>
        ${list.slice(0, 3).map(({ c, at }) => {
          const st = INTERVIEW_STATUS[c.interviewStatus];
          return `<button type="button" class="cal-event ${c.interviewStatus}" data-event="${esc(c.id)}" title="${esc(st.label)}"><span class="cal-time">${time(at)}</span> ${esc(c.name)}</button>`;
        }).join('')}
        ${list.length > 3 ? `<span class="cal-more">+${list.length - 3} นัด</span>` : ''}
      </div>`);
  }
  const monthEvents = events.filter((e) => e.at.getMonth() === first.getMonth() && e.at.getFullYear() === first.getFullYear());

  return `
  <section class="panel cal" aria-labelledby="cal-title">
    <div class="cal-head">
      <h2 id="cal-title">${TH_MONTHS_FULL[first.getMonth()]} ${first.getFullYear() + 543}</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="legend-item"><span class="dot" style="background:${INTERVIEW_STATUS.requested.color}" aria-hidden="true"></span>${esc(INTERVIEW_STATUS.requested.label)}</span>
        <span class="legend-item"><span class="dot" style="background:${INTERVIEW_STATUS.confirmed.color}" aria-hidden="true"></span>${esc(INTERVIEW_STATUS.confirmed.label)}</span>
        <button type="button" class="icon-btn" data-cal="prev" aria-label="เดือนก่อนหน้า">${ICONS.chevL}</button>
        <button type="button" class="btn btn-sm" data-cal="today">เดือนนี้</button>
        <button type="button" class="icon-btn" data-cal="next" aria-label="เดือนถัดไป">${ICONS.chevR}</button>
      </div>
    </div>
    <div class="cal-grid" role="grid" aria-label="ปฏิทินนัดสัมภาษณ์">
      ${WEEKDAYS.map((w) => `<div class="cal-wd" role="columnheader">${w}</div>`).join('')}
      ${cells.join('')}
    </div>
  </section>
  <section class="panel" aria-labelledby="agenda-title">
    <h2 id="agenda-title">นัดหมายเดือนนี้ · ${monthEvents.length} นัด</h2>
    ${monthEvents.length ? `<ul class="agenda">${monthEvents.map(({ c, at }) => {
      const st = INTERVIEW_STATUS[c.interviewStatus];
      return `<li><button type="button" class="agenda-item" data-event="${esc(c.id)}">
        <span class="agenda-date"><strong>${at.getDate()}</strong><span>${TH_MONTHS_FULL[at.getMonth()].slice(0, 3)}.</span></span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left">
          <strong>${esc(c.name)} <span class="muted" style="font-weight:500">· ${esc(c.position || '')}</span></strong>
          <span class="muted" style="font-size:13px">${time(at)} น. · ${esc(MODE_LABEL[c.interviewMode] || '')}${showUnit ? ' · ' + esc(c.location) : ''} · ผู้สัมภาษณ์ ${(c.interviewers || []).length} คน</span>
        </span>
        <span class="pill" style="background:${st.bg};color:${st.fg}">${esc(st.label)}</span>
      </button></li>`;
    }).join('')}</ul>` : '<p class="muted">ยังไม่มีนัดสัมภาษณ์ในเดือนนี้</p>'}
  </section>`;
}

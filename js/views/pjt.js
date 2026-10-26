// แผนก workspace: own pool (decide, request interviews, return), the Candidate Pool (pick),
// interview calendar, candidate comparison and notifications.
import {
  esc, ICONS, LOGO, POOL, HRS, MODE_LABEL, avatarFor, recommendationFor, unitFullLabel,
  fmtDate, fmtDateTime, baht, pct, toast, confirmDialog, errorMessage, isNew, NEW_BADGE, holdLeft
} from '../ui.js';
import { CONFIG } from '../config.js';
import * as anim from '../anim.js';
import { newFilterState, positionsOf, applyFilters, groupByPosition, filterBarHTML, updateFilter } from '../filters.js';
import { openInterviewForm, showInterviewDetail } from '../interview.js';
import { calendarHTML, monthStart, shiftMonth } from '../calendar.js';
import { openCompare } from '../compare.js';
import { bellHTML, openNotifications, watchNotifications } from '../notify.js';

const DECIDE = ['เรียกสัมภาษณ์', 'สำรอง', 'ไม่พิจารณา'];
const FILTERS = ['all', 'รอพิจารณา', 'เรียกสัมภาษณ์', 'นัดสัมภาษณ์แล้ว', 'สำรอง', 'ไม่พิจารณา'];

export function mountPjt(root, { store, session, signOut, onCleanup }) {
  const unit = session.unit;
  const st = {
    list: [], notifs: [], view: 'mine', filter: 'all', q: '', loading: true, error: '', animate: true,
    month: monthStart(), f: newFilterState()
  };

  async function reload({ animate = false } = {}) {
    try { st.list = await store.listCandidates(); st.error = ''; }
    catch (e) { st.error = errorMessage(e); }
    // Listing may have released expired holds, which creates notifications.
    try { st.notifs = await store.listNotifications(); } catch (e) { /* keep previous */ }
    st.loading = false;
    st.animate = animate;
    render();
  }

  const mine = () => st.list.filter((c) => c.location === unit);
  const pool = () => st.list.filter((c) => c.location === POOL);
  const byId = (id) => st.list.find((c) => c.id === id);
  const calledLike = (d) => d === 'เรียกสัมภาษณ์' || d === 'นัดสัมภาษณ์แล้ว';

  function interviewBlock(c) {
    if (c.interviewStatus === 'requested') {
      return `<div class="interview-box requested">
        <span style="display:flex;flex-direction:column;gap:2px">
          <strong style="font-size:15px">รอ ${esc(HRS)} ยืนยันนัด</strong>
          <span>${esc(fmtDateTime(c.interviewAt))} · ${esc(MODE_LABEL[c.interviewMode])} · ผู้สัมภาษณ์ ${(c.interviewers || []).length} คน</span>
        </span>
        <button type="button" class="btn btn-sm" data-request="${esc(c.id)}">แก้ไขคำขอ</button>
      </div>`;
    }
    if (c.interviewStatus === 'confirmed') {
      return `<div class="interview-box confirmed">
        <span style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <strong style="font-size:15px">ยืนยันนัดแล้ว · ${esc(fmtDateTime(c.interviewAt))}</strong>
          <span>${c.interviewMode === 'online'
            ? (c.meetingLink ? `${ICONS.video} <a href="${esc(c.meetingLink)}" target="_blank" rel="noopener noreferrer">เข้าห้องสัมภาษณ์ Online</a>` : 'Online')
            : `${ICONS.pin} ${esc(c.interviewLocation || 'Onsite')}`}</span>
        </span>
        <button type="button" class="btn btn-sm" data-detail="${esc(c.id)}">รายละเอียด</button>
      </div>`;
    }
    if (c.decision === 'เรียกสัมภาษณ์') {
      return `<button type="button" class="btn btn-dark" data-request="${esc(c.id)}"><span style="color:#C8F169;display:flex">${ICONS.calendar}</span>ขอนัดสัมภาษณ์</button>`;
    }
    return '';
  }

  // Countdown for candidates this unit picked and has not decided on yet.
  function holdBlock(c) {
    const h = holdLeft(c);
    if (!h) return '';
    return `<div class="hold${h.urgent ? ' urgent' : ''}" role="note">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>
      <span>เหลือเวลาพิจารณา <strong data-hold="${esc(c.holdUntil)}">${esc(h.text)}</strong> · ถ้ายังไม่ตัดสินใจภายใน ${esc(fmtDateTime(c.holdUntil))} จะกลับเข้า Candidate Pool</span>
    </div>`;
  }

  function candidateCard(c) {
    const av = avatarFor(c.id);
    const rec = recommendationFor(c);
    const m = c.match ?? 0;
    const bar = m >= 0.9 ? '#5B3DF5' : m >= 0.8 ? '#FF7A3D' : '#8C8A83';
    const recStyle = rec === 'Strongly Recommend' ? 'background:#111;color:#fff' : rec === 'Recommend' ? 'background:#E4DDFF;color:#2A1A8C' : 'background:#ECEBE7;color:#3D3C38';
    return `
    <article class="card" data-card="${esc(c.id)}">
      <div class="card-head">
        <span class="avatar" aria-hidden="true" style="border-radius:${av.shape};background:${av.bg};color:${av.fg}">${esc(c.name.charAt(0))}</span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
          <span class="card-id">${esc(c.id)} · Prescreen ${esc(fmtDate(c.prescreenDate))}</span>
          <h2>${esc(c.name)} ${isNew(c) ? NEW_BADGE : ''}</h2>
          <span class="muted" style="font-size:15px">${esc(c.position || '—')} · ${esc(c.experience ?? '—')} ปี · อายุ ${esc(c.age ?? '—')}</span>
        </div>
        <div class="match"><strong>${pct(c.match)}</strong><span>HR Match</span></div>
      </div>
      ${holdBlock(c)}
      <div class="bar" aria-hidden="true"><div data-grow style="width:${Math.round(m * 100)}%;background:${bar}"></div></div>
      <dl class="facts">
        <div><dt>บริษัทล่าสุด</dt><dd>${esc(c.company || '—')}</dd></div>
        <div><dt>การศึกษา</dt><dd>${esc(c.education || '—')}</dd></div>
        <div><dt>เงินเดือนปัจจุบัน</dt><dd>${baht(c.salaryCurrent)}</dd></div>
        <div><dt>เงินเดือนคาดหวัง</dt><dd>${baht(c.salaryExpected)}</dd></div>
      </dl>
      <div class="note">
        ${rec ? `<span class="pill" style="align-self:flex-start;${recStyle}">${esc(rec)}</span>` : ''}
        <p>${esc(c.hrNote || `ยังไม่มีความเห็นจาก ${HRS}`)}</p>
      </div>
      <div class="decide" role="group" aria-label="Executive Decision ของ ${esc(c.name)}">
        ${DECIDE.map((d) => {
          const on = d === 'เรียกสัมภาษณ์' ? calledLike(c.decision) : c.decision === d;
          return `<button type="button" data-decide="${esc(d)}" data-value="${esc(d)}" data-id="${esc(c.id)}" aria-pressed="${on}">${esc(d)}</button>`;
        }).join('')}
      </div>
      ${interviewBlock(c)}
      <div class="card-foot">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          ${c.cvUrl ? `<a href="${esc(c.cvUrl)}" target="_blank" rel="noopener noreferrer" style="min-height:44px;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600">${ICONS.doc} CV</a>` : ''}
          <button type="button" class="btn btn-sm" data-compare="${esc(c.id)}">${ICONS.radar} เทียบ</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
          <span class="muted" style="font-size:13px">${c.assignedBy === unit ? 'คุณเลือกจาก Candidate Pool' : `${esc(HRS)} ส่งเข้า Pool นี้`}</span>
          <button type="button" class="btn btn-sm" data-return="${esc(c.id)}">${ICONS.back} คืน Candidate Pool</button>
        </div>
      </div>
    </article>`;
  }

  function poolCard(c) {
    const av = avatarFor(c.id);
    return `
    <article class="card" data-card="${esc(c.id)}" style="gap:16px">
      <div class="card-head">
        <span class="avatar" aria-hidden="true" style="border-radius:${av.shape};background:${av.bg};color:${av.fg}">${esc(c.name.charAt(0))}</span>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
          <span class="card-id">${esc(c.id)} · Prescreen ${esc(fmtDate(c.prescreenDate))}</span>
          <h2>${esc(c.name)} ${isNew(c) ? NEW_BADGE : ''}</h2>
          <span class="muted" style="font-size:15px">${esc(c.position || '—')} · ${esc(c.experience ?? '—')} ปี · คาดหวัง ${baht(c.salaryExpected)}</span>
        </div>
        <div class="match"><strong style="font-size:26px">${pct(c.match)}</strong><span>HR Match</span></div>
      </div>
      <p class="note">${esc(c.hrNote || `ยังไม่มีความเห็นจาก ${HRS}`)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn" data-compare="${esc(c.id)}">${ICONS.radar} เทียบ</button>
        <button type="button" class="btn btn-dark" style="flex:1" data-pick="${esc(c.id)}"><span style="color:#C8F169;display:flex">${ICONS.plus}</span>เลือกเข้า Pool ของ ${esc(unit)}</button>
      </div>
    </article>`;
  }

  const groupsHTML = (list, card, label) => groupByPosition(list, st.f.group).map(([pos, items]) => `
    <section class="group" aria-label="${esc(pos || label)}">
      ${pos ? `<h3 class="group-title">${esc(pos)} <span class="count">${items.length}</span>${items.some(isNew) ? ` ${NEW_BADGE}` : ''}</h3>` : ''}
      <div class="card-grid">${items.map(card).join('')}</div>
    </section>`).join('');

  const searchBox = () => `
    <div class="search">
      <label for="pjt-search" class="sr-only">ค้นหาผู้สมัคร</label>${ICONS.search}
      <input id="pjt-search" class="input" type="search" placeholder="ค้นหาชื่อ, ID หรือตำแหน่ง" value="${esc(st.q)}">
    </div>`;
  const emptyState = (title, sub) => `
    <div class="empty"><span aria-hidden="true" style="width:64px;height:64px;border-radius:64px 64px 0 0;background:#C8F169"></span>
    <p style="font-size:16px;font-weight:600">${esc(title)}</p><p class="muted" style="font-size:14px">${esc(sub)}</p></div>`;

  function render() {
    const m = mine();
    const p = pool();
    const count = (fn) => m.filter(fn).length;
    const kpis = [
      { label: 'รอพิจารณา', v: count((c) => c.decision === 'รอพิจารณา'), bg: '#FFD84D', fg: '#111', deco: '#fff', shape: '999px' },
      { label: `รอ ${HRS} ยืนยันนัด`, v: count((c) => c.interviewStatus === 'requested'), bg: '#FF7A3D', fg: '#111', deco: '#FFB3D1', shape: '88px 0 0 0' },
      { label: 'นัดสัมภาษณ์แล้ว', v: count((c) => c.interviewStatus === 'confirmed'), bg: '#5B3DF5', fg: '#fff', deco: '#C8F169', shape: '999px' },
      { label: 'สำรอง', v: count((c) => c.decision === 'สำรอง'), bg: '#8EC5FF', fg: '#111', deco: '#111', shape: '0 88px 0 0' }
    ];
    const q = st.q.trim().toLowerCase();
    const matchQ = (c) => !q || `${c.id} ${c.name} ${c.position}`.toLowerCase().includes(q);
    const shownMine = applyFilters(m, st.f).filter((c) => (st.filter === 'all' || c.decision === st.filter) && matchQ(c));
    const shownPool = applyFilters(p, st.f).filter(matchQ);
    const V = st.view;
    const bar = filterBarHTML(st.f, positionsOf(V === 'mine' ? m : p), { prefix: 'pf' });
    const HEAD = {
      mine: [`Pool ของ ${unit}`, `เลือกการตัดสินใจภายใน ${CONFIG.holdHours} ชม. หลังดึงเข้า Pool แล้วส่งคำขอนัดสัมภาษณ์ถึง ${HRS}`],
      market: ['Candidate Pool', `ผู้สมัครที่ ${HRS} คัดกรองแล้วและยังไม่อยู่ใน Pool ของแผนกใด`],
      calendar: ['ปฏิทินสัมภาษณ์', `นัดสัมภาษณ์ของ ${unit} ทั้งที่รอยืนยันและยืนยันแล้ว`]
    };

    root.innerHTML = `
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div class="logo">${LOGO}<span>Candidate Pool</span></div>
        <span class="unit-badge">${esc(unitFullLabel(unit))}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        ${bellHTML(st.notifs)}
        <span style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600"><span class="avatar-sm" aria-hidden="true">${esc((session.username || 'U').charAt(0).toUpperCase())}</span>${esc(session.username)}</span>
        <button type="button" class="btn btn-sm" data-signout>${ICONS.logout} ออกจากระบบ</button>
      </div>
    </header>
    <main class="page">
      <section class="page-head" aria-labelledby="page-title">
        <div style="display:flex;flex-direction:column;gap:10px;flex:1 1 520px;min-width:0" data-enter>
          <h1 id="page-title">${esc(HEAD[V][0])}</h1>
          <p class="muted" style="font-size:16px">${esc(HEAD[V][1])}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${V !== 'calendar' ? `<button type="button" class="btn btn-sm" data-compare-open>${ICONS.radar} เปรียบเทียบผู้สมัคร</button>` : ''}
          <button type="button" class="btn btn-sm" data-refresh>${ICONS.refresh} รีเฟรช</button>
        </div>
      </section>

      <div class="view-switch" role="group" aria-label="มุมมอง">
        <button type="button" data-view="mine" aria-pressed="${V === 'mine'}"><span class="dot" style="background:#5B3DF5;width:12px;height:12px" aria-hidden="true"></span>Pool ของ ${esc(unit)} <span class="count">${m.length}</span></button>
        <button type="button" data-view="market" aria-pressed="${V === 'market'}"><span class="dot" style="background:#FF7A3D;width:12px;height:12px;border-radius:12px 12px 0 0" aria-hidden="true"></span>Candidate Pool <span class="count">${p.length}</span></button>
        <button type="button" data-view="calendar" aria-pressed="${V === 'calendar'}">${ICONS.calendar} ปฏิทิน <span class="count">${m.filter((c) => c.interviewStatus).length}</span></button>
      </div>

      ${st.error ? `<div class="error-box" role="alert">${esc(st.error)}</div>` : ''}
      ${st.loading ? '<div class="loading" style="min-height:200px"><div class="spinner" role="img" aria-label="กำลังโหลด"></div></div>'
        : V === 'calendar' ? calendarHTML(st.month, m)
        : V === 'mine' ? `
        <section class="kpis" aria-label="สรุปสถานะ">
          ${kpis.map((k) => `<div class="kpi" style="background:${k.bg};color:${k.fg}"><span class="kpi-label">${esc(k.label)}</span><span class="kpi-value" data-count data-value="${k.v}">${k.v}</span><span class="kpi-deco" aria-hidden="true" style="border-radius:${k.shape};background:${k.deco}"></span></div>`).join('')}
        </section>
        <div class="toolbar">
          <div class="chip-row" role="group" aria-label="กรองตามสถานะ">
            ${FILTERS.map((f) => {
              const n = f === 'all' ? m.length : count((c) => c.decision === f);
              return `<button type="button" class="chip" data-filter="${esc(f)}" aria-pressed="${st.filter === f}">${f === 'all' ? 'ทั้งหมด' : esc(f)} · ${n}</button>`;
            }).join('')}
          </div>
          ${searchBox()}
        </div>
        ${bar}
        ${shownMine.length ? groupsHTML(shownMine, candidateCard, 'ผู้สมัครใน Pool')
          : emptyState(m.length ? 'ไม่มีผู้สมัครในมุมมองนี้' : 'ยังไม่มีผู้สมัครใน Pool ของคุณ', m.length ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' : 'ไปที่แท็บ Candidate Pool เพื่อเลือกผู้สมัคร')}`
        : `
        <div class="info-box">${ICONS.info}<p>คุณเลือกผู้สมัครได้เฉพาะเข้า <strong>Pool ของ ${esc(unit)}</strong> หลังเลือกแล้วมีเวลาพิจารณา <strong>${CONFIG.holdHours} ชม.</strong> ถ้ายังไม่ตัดสินใจ ผู้สมัครจะกลับเข้า Candidate Pool อัตโนมัติ การย้ายไปแผนกอื่นทำได้โดย ${esc(HRS)}</p></div>
        <div class="toolbar"><span></span>${searchBox()}</div>
        ${bar}
        ${shownPool.length ? groupsHTML(shownPool, poolCard, 'Candidate Pool')
          : emptyState(p.length ? 'ไม่มีผู้สมัครตามตัวกรองนี้' : 'Candidate Pool ยังไม่มีผู้สมัครที่ว่างอยู่', p.length ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' : `เมื่อ ${HRS} เพิ่มผู้สมัครใหม่ จะแสดงที่นี่`)}`}
    </main>`;

    if (st.animate && !st.loading) {
      anim.enter(root.querySelectorAll('[data-enter]'));
      anim.pop(root.querySelectorAll('.kpi'), { step: 60 });
      anim.countUp(root.querySelectorAll('[data-count]'));
      anim.enter(root.querySelectorAll('.card, .panel'), { step: 50, start: 120 });
      anim.grow(root.querySelectorAll('[data-grow]'), 40);
      anim.pop(root.querySelectorAll('.cal-event'), { step: 20, start: 200 });
      st.animate = false;
    }
  }

  async function run(action, okMsg, opts) {
    try { await action(); await reload(); if (okMsg) toast(okMsg, opts); }
    catch (e) { toast(errorMessage(e), { error: true }); await reload(); }
  }

  const requestForm = (c) => openInterviewForm(c, {
    onSubmit: async (data) => {
      await store.requestInterview(c.id, data);
      await reload();
      toast(`ส่งคำขอนัดสัมภาษณ์ ${c.id} ถึง ${HRS} แล้ว`);
    }
  });
  const detail = (c) => showInterviewDetail(c, {
    actions: [{ id: 'change', label: c.interviewStatus === 'confirmed' ? 'ขอเปลี่ยนนัด' : 'แก้ไขคำขอ' }],
    onAction: () => requestForm(c)
  });
  const visibleForCompare = () => [...mine(), ...pool()];

  root.onclick = async (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if ((el = t('[data-signout]'))) return signOut();
    if ((el = t('[data-bell]'))) {
      const list = st.notifs;
      openNotifications(list, { onItem: (id) => { const c = byId(id); if (c && c.interviewStatus) detail(c); } });
      const unread = list.filter((n) => !n.readAt).map((n) => n.id);
      if (unread.length) {
        try { await store.markNotificationsRead(unread); } catch (ex) { /* retry next poll */ }
        st.notifs = list.map((n) => (unread.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n));
        const bell = root.querySelector('[data-bell]');
        if (bell) bell.outerHTML = bellHTML(st.notifs);
      }
      return;
    }
    if ((el = t('[data-refresh]'))) { anim.press(el); return reload({ animate: true }); }
    if ((el = t('[data-compare-open]'))) return openCompare(visibleForCompare(), [], { pos: st.f.pos });
    if ((el = t('[data-compare]'))) return openCompare(visibleForCompare(), [el.dataset.compare]);
    if ((el = t('[data-view]'))) { st.view = el.dataset.view; st.q = ''; st.animate = true; return render(); }
    if ((el = t('[data-filter]'))) { st.filter = el.dataset.filter; st.animate = true; return render(); }
    if ((el = t('[data-cal]'))) {
      const a = el.dataset.cal;
      st.month = a === 'today' ? monthStart() : shiftMonth(st.month, a === 'prev' ? -1 : 1);
      st.animate = true;
      return render();
    }
    if ((el = t('[data-event]')) || (el = t('[data-detail]'))) return detail(byId(el.dataset.event || el.dataset.detail));
    if ((el = t('[data-request]'))) return requestForm(byId(el.dataset.request));
    if ((el = t('[data-decide]'))) {
      const c = byId(el.dataset.id);
      const d = el.dataset.decide;
      const on = el.getAttribute('aria-pressed') === 'true';
      anim.press(el);
      const next = on ? 'รอพิจารณา' : d;
      if (c.interviewStatus && next !== 'เรียกสัมภาษณ์') {
        const ok = await confirmDialog({
          title: c.interviewStatus === 'confirmed' ? 'ยกเลิกนัดสัมภาษณ์?' : 'ยกเลิกคำขอนัด?',
          body: `นัดของ ${c.name} จะถูกล้าง สถานะเปลี่ยนเป็น "${next}" และ ${HRS} จะได้รับการแจ้งเตือน`,
          confirm: 'ยกเลิกนัด'
        });
        if (!ok) return;
      }
      return run(() => store.setDecision(c.id, next));
    }
    if ((el = t('[data-pick]'))) {
      const c = byId(el.dataset.pick);
      return anim.leave(el.closest('[data-card]'), () => run(() => store.pick(c.id), `เลือก ${c.id} ${c.name} เข้า Pool ของ ${unit} แล้ว · มีเวลาพิจารณา ${CONFIG.holdHours} ชม.`, {
        action: 'เลิกทำ', onAction: () => run(() => store.returnToPool(c.id), `คืน ${c.id} กลับ Candidate Pool แล้ว`)
      }));
    }
    if ((el = t('[data-return]'))) {
      const c = byId(el.dataset.return);
      const ok = await confirmDialog({
        title: `คืน ${c.name} กลับ Candidate Pool?`,
        body: `ผู้สมัครจะออกจาก Pool ของคุณ และแผนกอื่นเลือกได้ การตัดสินใจและนัดสัมภาษณ์ของคุณจะถูกล้าง${c.interviewStatus ? ` (${HRS} จะได้รับการแจ้งเตือน)` : ''}`,
        confirm: 'คืน Candidate Pool'
      });
      if (!ok) return;
      const card = root.querySelector(`[data-card="${CSS.escape(c.id)}"]`);
      return anim.leave(card, () => run(() => store.returnToPool(c.id), `ส่ง ${c.id} ${c.name} กลับ Candidate Pool แล้ว`));
    }
    if ((el = t('[data-f-group]'))) { st.f.group = !st.f.group; st.animate = true; return render(); }
  };
  root.onchange = (e) => {
    if (updateFilter(st.f, e.target)) {
      const id = e.target.id;
      st.animate = true;
      render();
      const back = root.querySelector('#' + id);
      if (back) back.focus();
    }
  };
  // Keep countdowns current without re-rendering the page.
  const ticker = setInterval(() => {
    let expired = false;
    root.querySelectorAll('[data-hold]').forEach((el) => {
      const h = holdLeft({ holdUntil: el.dataset.hold, decision: 'รอพิจารณา' });
      el.textContent = h.text;
      if (h.ms <= 0) expired = true;
    });
    if (expired) reload();
  }, 30000);
  root.oninput = (e) => {
    if (e.target.id === 'pjt-search') {
      st.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const s = root.querySelector('#pjt-search');
      s.focus(); s.setSelectionRange(pos, pos);
    }
  };
  window.onfocus = () => { if (!document.getElementById('modal-root').children.length) reload(); };
  const stopNotifs = watchNotifications(store, (list) => {
    const grew = list.some((n) => n.kind === 'hold_expired' && !n.readAt && !st.notifs.some((o) => o.id === n.id));
    st.notifs = list;
    if (grew && !st.loading) return reload();
    const bell = root.querySelector('[data-bell]');
    if (bell) bell.outerHTML = bellHTML(list);
  });
  onCleanup(() => { stopNotifs(); clearInterval(ticker); });

  render();
  reload({ animate: true });
}

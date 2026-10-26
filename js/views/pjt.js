// Line manager workspace: own pool (decide, schedule, return) and the central pool (pick).
import {
  esc, ICONS, LOGO, POOL, DECISION_STYLE, avatarFor, recommendationFor,
  fmtDate, fmtDateTime, toLocalInput, baht, pct, toast, openModal, confirmDialog, errorMessage
} from '../ui.js';
import * as anim from '../anim.js';

const DECIDE = ['เรียกสัมภาษณ์', 'สำรอง', 'ไม่พิจารณา'];
const FILTERS = ['all', 'รอพิจารณา', 'เรียกสัมภาษณ์', 'นัดสัมภาษณ์แล้ว', 'สำรอง', 'ไม่พิจารณา'];

export function mountPjt(root, { store, session, signOut }) {
  const unit = session.unit;
  const st = { list: [], view: 'mine', filter: 'all', q: '', loading: true, error: '', animate: true };

  async function reload({ animate = false } = {}) {
    try {
      st.list = await store.listCandidates();
      st.error = '';
    } catch (e) {
      st.error = errorMessage(e);
    }
    st.loading = false;
    st.animate = animate;
    render();
  }

  const mine = () => st.list.filter((c) => c.location === unit);
  const pool = () => st.list.filter((c) => c.location === POOL);
  const byId = (id) => st.list.find((c) => c.id === id);
  const calledLike = (d) => d === 'เรียกสัมภาษณ์' || d === 'นัดสัมภาษณ์แล้ว';

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
          <h2>${esc(c.name)}</h2>
          <span class="muted" style="font-size:15px">${esc(c.position || '—')} · ${esc(c.experience ?? '—')} ปี · อายุ ${esc(c.age ?? '—')}</span>
        </div>
        <div class="match"><strong>${pct(c.match)}</strong><span>HR Match</span></div>
      </div>
      <div class="bar" aria-hidden="true"><div data-grow style="width:${Math.round(m * 100)}%;background:${bar}"></div></div>
      <dl class="facts">
        <div><dt>บริษัทล่าสุด</dt><dd>${esc(c.company || '—')}</dd></div>
        <div><dt>การศึกษา</dt><dd>${esc(c.education || '—')}</dd></div>
        <div><dt>เงินเดือนปัจจุบัน</dt><dd>${baht(c.salaryCurrent)}</dd></div>
        <div><dt>เงินเดือนคาดหวัง</dt><dd>${baht(c.salaryExpected)}</dd></div>
      </dl>
      <div class="note">
        ${rec ? `<span class="pill" style="align-self:flex-start;${recStyle}">${esc(rec)}</span>` : ''}
        <p>${esc(c.hrNote || 'ยังไม่มีความเห็นจาก HR')}</p>
      </div>
      <div class="decide" role="group" aria-label="Executive Decision ของ ${esc(c.name)}">
        ${DECIDE.map((d) => {
          const on = d === 'เรียกสัมภาษณ์' ? calledLike(c.decision) : c.decision === d;
          return `<button type="button" data-decide="${esc(d)}" data-value="${esc(d)}" data-id="${esc(c.id)}" aria-pressed="${on}">${esc(d)}</button>`;
        }).join('')}
      </div>
      ${c.decision === 'เรียกสัมภาษณ์' ? `<button type="button" class="btn btn-dark" data-schedule="${esc(c.id)}"><span style="color:#C8F169;display:flex">${ICONS.calendar}</span>นัดวันสัมภาษณ์</button>` : ''}
      ${c.decision === 'นัดสัมภาษณ์แล้ว' ? `
        <div class="scheduled">
          <span style="display:flex;flex-direction:column;gap:2px">
            <strong style="font-size:15px">นัดสัมภาษณ์แล้ว · ${esc(fmtDateTime(c.interviewAt))}</strong>
            <span>ผู้สัมภาษณ์: ${esc(c.interviewer || '—')}${c.projectName ? ' · ' + esc(c.projectName) : ''}</span>
          </span>
          <button type="button" class="btn btn-sm" data-schedule="${esc(c.id)}">แก้ไข</button>
        </div>` : ''}
      <div class="card-foot">
        ${c.cvUrl ? `<a href="${esc(c.cvUrl)}" target="_blank" rel="noopener noreferrer" style="min-height:44px;display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600">${ICONS.doc} ดู Resume / CV</a>` : '<span class="muted" style="font-size:13px">ไม่มีไฟล์ CV</span>'}
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
          <span class="muted" style="font-size:13px">${c.assignedBy === unit ? 'คุณเลือกจากคลังกลาง' : 'HR ส่งเข้า Pool นี้'}</span>
          <button type="button" class="btn btn-sm" data-return="${esc(c.id)}">${ICONS.back} คืนคลังกลาง (HR)</button>
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
          <h2>${esc(c.name)}</h2>
          <span class="muted" style="font-size:15px">${esc(c.position || '—')} · ${esc(c.experience ?? '—')} ปี · คาดหวัง ${baht(c.salaryExpected)}</span>
        </div>
        <div class="match"><strong style="font-size:26px">${pct(c.match)}</strong><span>HR Match</span></div>
      </div>
      <p class="note">${esc(c.hrNote || 'ยังไม่มีความเห็นจาก HR')}</p>
      <button type="button" class="btn btn-dark" data-pick="${esc(c.id)}"><span style="color:#C8F169;display:flex">${ICONS.plus}</span>เลือกเข้า Pool ของ ${esc(unit)}</button>
    </article>`;
  }

  function render() {
    const m = mine();
    const p = pool();
    const count = (fn) => m.filter(fn).length;
    const kpis = [
      { label: 'รอพิจารณา', v: count((c) => c.decision === 'รอพิจารณา'), bg: '#FFD84D', fg: '#111', deco: '#fff', shape: '999px' },
      { label: 'เรียกสัมภาษณ์', v: count((c) => calledLike(c.decision)), bg: '#C8F169', fg: '#111', deco: '#5B3DF5', shape: '88px 0 0 0' },
      { label: 'นัดสัมภาษณ์แล้ว', v: count((c) => c.decision === 'นัดสัมภาษณ์แล้ว'), bg: '#5B3DF5', fg: '#fff', deco: '#FFB3D1', shape: '999px' },
      { label: 'สำรอง', v: count((c) => c.decision === 'สำรอง'), bg: '#8EC5FF', fg: '#111', deco: '#111', shape: '0 88px 0 0' }
    ];
    const q = st.q.trim().toLowerCase();
    const matchQ = (c) => !q || `${c.id} ${c.name} ${c.position}`.toLowerCase().includes(q);
    const shownMine = m.filter((c) => (st.filter === 'all' || c.decision === st.filter) && matchQ(c));
    const shownPool = p.filter(matchQ);
    const isMine = st.view === 'mine';

    root.innerHTML = `
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div class="logo">${LOGO}<span>Candidate Pool</span></div>
        <span class="unit-badge">${esc(unit)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600"><span class="avatar-sm" aria-hidden="true">${esc((session.username || 'U').charAt(0).toUpperCase())}</span>${esc(session.username)}</span>
        <button type="button" class="btn btn-sm" data-signout>${ICONS.logout} ออกจากระบบ</button>
      </div>
    </header>
    <main class="page">
      <section class="page-head" aria-labelledby="page-title">
        <div style="display:flex;flex-direction:column;gap:10px;flex:1 1 520px;min-width:0" data-enter>
          <h1 id="page-title">${isMine ? 'Pool ของ ' + esc(unit) : 'คลังผู้สมัครกลาง'}</h1>
          <p class="muted" style="font-size:16px">${isMine ? 'เลือกการตัดสินใจ แล้วนัดวันสัมภาษณ์ได้ทันที' : 'ผู้สมัครที่ HR คัดกรองแล้วและยังไม่อยู่ใน Pool ของหน่วยงานใด'}</p>
        </div>
        <button type="button" class="btn btn-sm" data-refresh>${ICONS.refresh} รีเฟรช</button>
      </section>

      <div class="view-switch" role="group" aria-label="มุมมอง">
        <button type="button" data-view="mine" aria-pressed="${isMine}"><span class="dot" style="background:#5B3DF5;width:12px;height:12px" aria-hidden="true"></span>Pool ของ ${esc(unit)} <span class="count">${m.length}</span></button>
        <button type="button" data-view="market" aria-pressed="${!isMine}"><span class="dot" style="background:#FF7A3D;width:12px;height:12px;border-radius:12px 12px 0 0" aria-hidden="true"></span>คลังกลาง (HR) <span class="count">${p.length}</span></button>
      </div>

      ${st.error ? `<div class="error-box" role="alert">${esc(st.error)}</div>` : ''}
      ${st.loading ? '<div class="loading" style="min-height:200px"><div class="spinner" role="img" aria-label="กำลังโหลด"></div></div>' : isMine ? `
        <section class="kpis" aria-label="สรุปสถานะ">
          ${kpis.map((k) => `<div class="kpi" style="background:${k.bg};color:${k.fg}"><span class="kpi-label">${k.label}</span><span class="kpi-value" data-count data-value="${k.v}">${k.v}</span><span class="kpi-deco" aria-hidden="true" style="border-radius:${k.shape};background:${k.deco}"></span></div>`).join('')}
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
        ${shownMine.length ? `<section class="card-grid" aria-label="ผู้สมัครใน Pool">${shownMine.map(candidateCard).join('')}</section>`
          : emptyState(m.length ? 'ไม่มีผู้สมัครในมุมมองนี้' : 'ยังไม่มีผู้สมัครใน Pool ของคุณ', m.length ? 'ลองเปลี่ยนตัวกรองหรือคำค้นหา' : 'ไปที่แท็บคลังกลาง (HR) เพื่อเลือกผู้สมัคร')}
      ` : `
        <div class="info-box">${ICONS.info}<p>คุณเลือกผู้สมัครได้เฉพาะเข้า <strong>Pool ของ ${esc(unit)}</strong> เท่านั้น และส่งผู้สมัครใน Pool ของคุณกลับคลังกลางได้ทุกเมื่อ การย้ายไปหน่วยงานอื่นทำได้โดย Admin (HR)</p></div>
        <div class="toolbar"><span></span>${searchBox()}</div>
        ${shownPool.length ? `<section class="card-grid" aria-label="คลังผู้สมัครกลาง">${shownPool.map(poolCard).join('')}</section>`
          : emptyState('คลังกลางไม่มีผู้สมัครที่ว่างอยู่', 'เมื่อ HR เพิ่มผู้สมัครใหม่ จะแสดงที่นี่')}
      `}
    </main>`;

    if (st.animate && !st.loading) {
      anim.enter(root.querySelectorAll('[data-enter]'));
      anim.pop(root.querySelectorAll('.kpi'), { step: 60 });
      anim.countUp(root.querySelectorAll('[data-count]'));
      anim.enter(root.querySelectorAll('.card'), { step: 50, start: 120 });
      anim.grow(root.querySelectorAll('[data-grow]'), 40);
      st.animate = false;
    }
  }

  const searchBox = () => `
    <div class="search">
      <label for="pjt-search" class="sr-only">ค้นหาผู้สมัคร</label>${ICONS.search}
      <input id="pjt-search" class="input" type="search" placeholder="ค้นหาชื่อ, ID หรือตำแหน่ง" value="${esc(st.q)}">
    </div>`;
  const emptyState = (title, sub) => `
    <div class="empty"><span aria-hidden="true" style="width:64px;height:64px;border-radius:64px 64px 0 0;background:#C8F169"></span>
    <p style="font-size:16px;font-weight:600">${esc(title)}</p><p class="muted" style="font-size:14px">${esc(sub)}</p></div>`;

  async function run(action, okMsg, opts) {
    try {
      await action();
      await reload();
      if (okMsg) toast(okMsg, opts);
    } catch (e) {
      toast(errorMessage(e), { error: true });
      await reload();
    }
  }

  function openSchedule(c) {
    openModal(`
      <div class="modal-head">
        <div style="display:flex;flex-direction:column;gap:4px">
          <h2 id="modal-title">นัดวันสัมภาษณ์</h2>
          <p class="muted" style="font-size:15px">${esc(c.id)} · ${esc(c.name)} · ${esc(c.position || '')}</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
      </div>
      <form data-sched class="form-grid" novalidate>
        <div class="field span-2"><label for="s-at">วันและเวลาสัมภาษณ์</label><input id="s-at" class="input" type="datetime-local" required value="${esc(toLocalInput(c.interviewAt))}"></div>
        <div class="field"><label for="s-who">ชื่อผู้สัมภาษณ์</label><input id="s-who" class="input" type="text" value="${esc(c.interviewer || '')}"></div>
        <div class="field"><label for="s-proj">ชื่อโครงการ</label><input id="s-proj" class="input" type="text" value="${esc(c.projectName || '')}"></div>
        <div class="field span-2"><label for="s-note">หมายเหตุ</label><textarea id="s-note" class="input" rows="3">${esc(c.remark || '')}</textarea></div>
        <div class="error-box span-2" data-err hidden role="alert"></div>
        <div class="modal-actions span-2">
          <button type="button" class="btn" data-close>ยกเลิก</button>
          <button type="submit" class="btn btn-violet">ยืนยันนัดสัมภาษณ์</button>
        </div>
      </form>`, (dlg, close) => {
      dlg.querySelector('[data-sched]').onsubmit = async (e) => {
        e.preventDefault();
        const at = dlg.querySelector('#s-at').value;
        const err = dlg.querySelector('[data-err]');
        if (!at) { err.hidden = false; err.textContent = 'กรุณาระบุวันและเวลาสัมภาษณ์'; return; }
        try {
          await store.schedule(c.id, {
            interviewAt: new Date(at).toISOString(),
            interviewer: dlg.querySelector('#s-who').value.trim(),
            projectName: dlg.querySelector('#s-proj').value.trim(),
            remark: dlg.querySelector('#s-note').value.trim()
          });
          close();
          await reload();
          toast(`นัดสัมภาษณ์ ${c.id} แล้ว`);
        } catch (ex) { err.hidden = false; err.textContent = errorMessage(ex); }
      };
    });
  }

  root.onclick = async (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if ((el = t('[data-signout]'))) return signOut();
    if ((el = t('[data-refresh]'))) { anim.press(el); return reload({ animate: true }); }
    if ((el = t('[data-view]'))) { st.view = el.dataset.view; st.q = ''; st.animate = true; return render(); }
    if ((el = t('[data-filter]'))) { st.filter = el.dataset.filter; st.animate = true; return render(); }
    if ((el = t('[data-decide]'))) {
      const c = byId(el.dataset.id);
      const d = el.dataset.decide;
      const on = el.getAttribute('aria-pressed') === 'true';
      anim.press(el);
      const next = on ? 'รอพิจารณา' : d;
      if (c.decision === 'นัดสัมภาษณ์แล้ว') {
        const ok = await confirmDialog({ title: 'ยกเลิกนัดสัมภาษณ์?', body: `นัดของ ${c.name} จะถูกล้าง และสถานะเปลี่ยนเป็น "${next}"`, confirm: 'ยกเลิกนัด' });
        if (!ok) return;
      }
      return run(() => store.setDecision(c.id, next));
    }
    if ((el = t('[data-schedule]'))) return openSchedule(byId(el.dataset.schedule));
    if ((el = t('[data-pick]'))) {
      const c = byId(el.dataset.pick);
      const card = el.closest('[data-card]');
      return anim.leave(card, () => run(() => store.pick(c.id), `เลือก ${c.id} ${c.name} เข้า Pool ของ ${unit} แล้ว`, {
        action: 'เลิกทำ', onAction: () => run(() => store.returnToPool(c.id), `คืน ${c.id} กลับคลังกลางแล้ว`)
      }));
    }
    if ((el = t('[data-return]'))) {
      const c = byId(el.dataset.return);
      const ok = await confirmDialog({
        title: `คืน ${c.name} กลับคลังกลาง?`,
        body: 'ผู้สมัครจะออกจาก Pool ของคุณ และหน่วยงานอื่นเลือกได้ การตัดสินใจและนัดสัมภาษณ์ของคุณจะถูกล้าง',
        confirm: 'คืนคลังกลาง'
      });
      if (!ok) return;
      const card = root.querySelector(`[data-card="${CSS.escape(c.id)}"]`);
      return anim.leave(card, () => run(() => store.returnToPool(c.id), `ส่ง ${c.id} ${c.name} กลับคลังกลาง (HR) แล้ว`));
    }
  };
  root.oninput = (e) => {
    if (e.target.id === 'pjt-search') {
      st.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const s = root.querySelector('#pjt-search');
      s.focus(); s.setSelectionRange(pos, pos);
    }
  };
  root.onsubmit = null;
  window.onfocus = () => { if (location.hash === '#/pjt' && !document.getElementById('modal-root').children.length) reload(); };

  render();
  reload({ animate: true });
}

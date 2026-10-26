// Admin (HR) back office: overview, full candidate pool control, users & permissions.
import {
  esc, ICONS, LOGO, POOL, UNITS, LOCATIONS, DECISIONS, DECISION_STYLE, RECOMMENDATIONS,
  locStyle, locLabel, pct, toLocalInput, toast, openModal, confirmDialog, errorMessage
} from '../ui.js';
import * as anim from '../anim.js';
import { CONFIG } from '../config.js';

const TABS = [
  { key: 'overview', label: 'ภาพรวม', dot: '#C8F169', shape: '999px' },
  { key: 'pool', label: 'Candidate Pool', dot: '#FF7A3D', shape: '12px 12px 0 0' },
  { key: 'users', label: 'ผู้ใช้และสิทธิ์', dot: '#8EC5FF', shape: '3px' }
];
const HEAD = {
  overview: ['ภาพรวมระบบ', 'สรุปผู้สมัครทุก Pool และสถานะการตัดสินใจ'],
  pool: ['Candidate Pool', 'ในฐานะ Admin คุณส่งผู้สมัครเข้า Pool ของทุกหน่วยงาน ดึงกลับ และแก้ไขสถานะได้ทุกรายการ'],
  users: ['ผู้ใช้และสิทธิ์', 'บัญชีเข้าสู่ระบบแยกตามหน่วยงาน แต่ละ PJT เลือกผู้สมัครได้เฉพาะเข้า Pool ของตนเอง']
};
const YES = 'background:#E8FBC4;color:#2E4A00';
const PART = 'background:#E4DDFF;color:#2A1A8C';
const NO = 'background:#ECEBE7;color:#3D3C38';
const PERMS = [
  ['ดูผู้สมัคร', 'ทุก Pool', YES, 'คลังกลาง + Pool ตนเอง', PART],
  ['เลือกผู้สมัครเข้า Pool', 'ส่งเข้า Pool ใดก็ได้', YES, 'เฉพาะ Pool ตนเอง', PART],
  ['คืนผู้สมัครกลับคลังกลาง (HR)', 'ทุก Pool', YES, 'เฉพาะ Pool ตนเอง', PART],
  ['ย้ายผู้สมัครข้าม Pool หน่วยงาน', 'ได้', YES, 'ไม่ได้', NO],
  ['แก้ไข Executive Decision และนัดสัมภาษณ์', 'ทุกรายการ', YES, 'เฉพาะ Pool ตนเอง', PART],
  ['เพิ่ม / แก้ไข / นำเข้าข้อมูลผู้สมัคร', 'ได้', YES, 'ไม่ได้', NO],
  ['จัดการบัญชีผู้ใช้และรหัสผ่าน', 'ได้', YES, 'ไม่ได้', NO]
];

export function mountAdmin(root, { store, session, signOut }) {
  const st = { tab: 'overview', list: [], users: [], loc: 'all', q: '', loading: true, error: '', animate: true };

  async function reload({ animate = false } = {}) {
    try {
      const [list, users] = await Promise.all([store.listCandidates(), store.listUsers()]);
      st.list = list; st.users = users; st.error = '';
    } catch (e) { st.error = errorMessage(e); }
    st.loading = false;
    st.animate = animate;
    render();
  }
  const byId = (id) => st.list.find((c) => c.id === id);

  /* ---------- sections ---------- */
  function overview() {
    const L = st.list;
    const total = L.length;
    const inPool = L.filter((c) => c.location === POOL).length;
    const kpis = [
      { label: 'ผู้สมัครทั้งหมด', v: total, bg: '#fff', fg: '#111', deco: '#5B3DF5', shape: '999px' },
      { label: 'อยู่ในคลังกลาง', v: inPool, bg: '#FF7A3D', fg: '#111', deco: '#FFB3D1', shape: '88px 0 0 0' },
      { label: 'อยู่ใน Pool หน่วยงาน', v: total - inPool, bg: '#5B3DF5', fg: '#fff', deco: '#C8F169', shape: '999px' },
      { label: 'นัดสัมภาษณ์แล้ว', v: L.filter((c) => c.decision === 'นัดสัมภาษณ์แล้ว').length, bg: '#C8F169', fg: '#111', deco: '#111', shape: '0 88px 0 0' }
    ];
    const locCounts = LOCATIONS.map((l) => ({ l, n: L.filter((c) => c.location === l).length }));
    const maxLoc = Math.max(1, ...locCounts.map((x) => x.n));
    const posMap = new Map();
    L.forEach((c) => posMap.set(c.position || '(ไม่ระบุ)', (posMap.get(c.position || '(ไม่ระบุ)') || 0) + 1));
    const pos = [...posMap.entries()].sort((a, b) => b[1] - a[1]);
    const maxPos = Math.max(1, ...pos.map((x) => x[1]));
    const decs = DECISIONS.map((d) => ({ d, n: L.filter((c) => c.decision === d).length }));
    const missing = L.filter((c) => !c.education || !c.company || !c.prescreenDate || c.match == null);

    return `
    <section class="kpis" aria-label="ตัวเลขสรุป">
      ${kpis.map((k) => `<div class="kpi" style="background:${k.bg};color:${k.fg}"><span class="kpi-label">${k.label}</span><span class="kpi-value" data-count data-value="${k.v}">${k.v}</span><span class="kpi-deco" aria-hidden="true" style="border-radius:${k.shape};background:${k.deco}"></span></div>`).join('')}
    </section>
    <div class="panels">
      <section class="panel" aria-labelledby="p-loc">
        <h2 id="p-loc">ผู้สมัครตาม Pool</h2>
        ${locCounts.map(({ l, n }) => `<div class="hbar"><div style="display:flex;justify-content:space-between"><span style="font-weight:600">${esc(locLabel(l))}</span><strong>${n} คน</strong></div><div class="hbar-track" aria-hidden="true"><div data-grow style="width:${Math.round(n / maxLoc * 100)}%;background:${locStyle(l).color}"></div></div></div>`).join('')}
      </section>
      <section class="panel" aria-labelledby="p-pos">
        <h2 id="p-pos">ผู้สมัครตามตำแหน่ง</h2>
        ${pos.map(([p, n]) => `<div style="display:grid;grid-template-columns:minmax(0,140px) minmax(0,1fr) 32px;gap:12px;align-items:center;font-size:14px"><span style="font-weight:600;overflow-wrap:anywhere">${esc(p)}</span><div class="hbar-track" aria-hidden="true"><div data-grow style="width:${Math.round(n / maxPos * 100)}%;background:#111"></div></div><strong style="text-align:right">${n}</strong></div>`).join('')}
      </section>
      <section class="panel" aria-labelledby="p-dec">
        <h2 id="p-dec">Executive Decision ทั้งระบบ</h2>
        <div class="stack" aria-hidden="true">${decs.filter((x) => x.n).map(({ d, n }) => `<div data-grow style="width:${(n / Math.max(1, total) * 100).toFixed(1)}%;background:${DECISION_STYLE[d].color}"></div>`).join('')}</div>
        <ul class="legend">${decs.map(({ d, n }) => `<li><span aria-hidden="true" style="width:14px;height:14px;border-radius:4px;border:1px solid #CFCDC6;background:${DECISION_STYLE[d].color}"></span>${esc(d)} <strong>${n}</strong></li>`).join('')}</ul>
      </section>
      <section class="panel" aria-labelledby="p-attn">
        <h2 id="p-attn">ข้อมูลไม่ครบ</h2>
        ${missing.length ? missing.slice(0, 6).map((c) => `
          <div class="warn-box">
            <span aria-hidden="true" style="width:36px;height:36px;flex:none;border-radius:36px 36px 0 36px;background:#FF7A3D"></span>
            <div style="flex:1;display:flex;flex-direction:column;gap:4px">
              <strong>${esc(c.id)} ${esc(c.name)}</strong>
              <span>ขาด: ${[!c.education && 'การศึกษา', !c.company && 'บริษัทล่าสุด', !c.prescreenDate && 'วันที่ Prescreen', c.match == null && 'HR Match'].filter(Boolean).join(', ')}</span>
            </div>
            <button type="button" class="btn btn-sm" data-edit="${esc(c.id)}">แก้ไข</button>
          </div>`).join('') + (missing.length > 6 ? `<p class="muted">และอีก ${missing.length - 6} รายการ</p>` : '')
          : '<p class="muted">ข้อมูลผู้สมัครครบทุกรายการ</p>'}
      </section>
    </div>`;
  }

  function pool() {
    const q = st.q.trim().toLowerCase();
    const rows = st.list.filter((c) => (st.loc === 'all' || c.location === st.loc) &&
      (!q || `${c.id} ${c.name} ${c.position}`.toLowerCase().includes(q)));
    const chips = [['all', 'ทั้งหมด', st.list.length], ...LOCATIONS.map((l) => [l, locLabel(l), st.list.filter((c) => c.location === l).length])];
    return `
    <div class="toolbar">
      <div class="chip-row" role="group" aria-label="กรองตาม Pool">
        ${chips.map(([k, label, n]) => `<button type="button" class="chip" data-loc="${esc(k)}" aria-pressed="${st.loc === k}">${esc(label)} · ${n}</button>`).join('')}
      </div>
      <div class="search"><label for="adm-search" class="sr-only">ค้นหาผู้สมัคร</label>${ICONS.search}<input id="adm-search" class="input" type="search" placeholder="ค้นหาชื่อ, ID หรือตำแหน่ง" value="${esc(st.q)}"></div>
    </div>
    <div class="table-wrap">
      <table style="min-width:980px">
        <thead><tr><th scope="col">ID</th><th scope="col">ชื่อ-นามสกุล</th><th scope="col">ตำแหน่ง</th><th scope="col">HR Match</th><th scope="col">Executive Decision</th><th scope="col">อยู่ที่</th><th scope="col">ส่งเข้า Pool / ดึงกลับ</th><th scope="col"><span class="sr-only">แก้ไข</span></th></tr></thead>
        <tbody>
          ${rows.length ? rows.map((c) => {
            const ds = DECISION_STYLE[c.decision] || DECISION_STYLE['รอพิจารณา'];
            const ls = locStyle(c.location);
            return `<tr data-row>
              <td class="mono" style="font-weight:600">${esc(c.id)}</td>
              <td><strong style="font-weight:600">${esc(c.name)}</strong></td>
              <td>${esc(c.position || '—')}</td>
              <td style="font-weight:700">${pct(c.match)}</td>
              <td><label class="sr-only" for="dec-${esc(c.id)}">Executive Decision ของ ${esc(c.id)}</label>
                <select id="dec-${esc(c.id)}" class="table-select" data-setdec="${esc(c.id)}" style="background:${ds.bg};color:${ds.fg};border-color:transparent">
                  ${DECISIONS.map((d) => `<option value="${esc(d)}" ${d === c.decision ? 'selected' : ''}>${esc(d)}</option>`).join('')}
                </select></td>
              <td><span style="display:inline-flex;align-items:center;gap:8px;font-weight:600;white-space:nowrap"><span class="dot" style="background:${ls.color}" aria-hidden="true"></span>${esc(locLabel(c.location))}</span></td>
              <td><label class="sr-only" for="mv-${esc(c.id)}">ย้าย ${esc(c.id)}</label>
                <select id="mv-${esc(c.id)}" class="table-select" data-move="${esc(c.id)}">
                  <option value="">เลือก…</option>
                  ${LOCATIONS.filter((l) => l !== c.location).map((l) => `<option value="${esc(l)}">${l === POOL ? 'ดึงกลับคลังกลาง' : 'ส่งเข้า Pool ' + esc(l)}</option>`).join('')}
                </select></td>
              <td><button type="button" class="btn btn-sm" data-edit="${esc(c.id)}">แก้ไข</button></td>
            </tr>`;
          }).join('') : '<tr><td colspan="8" class="muted" style="padding:32px;text-align:center">ไม่พบผู้สมัครตามเงื่อนไข</td></tr>'}
        </tbody>
      </table>
    </div>`;
  }

  function users() {
    return `
    <div class="info-box">${ICONS.info}<p>ผู้ใช้เลือกบัญชีแล้วใส่รหัสผ่านเพื่อเข้าระบบ หน้านี้ใช้เปิด/ปิดบัญชี ระบุชื่อผู้ถือบัญชี และตั้งรหัสผ่านใหม่ให้แต่ละบัญชี</p></div>
    <div class="table-wrap">
      <table style="min-width:880px">
        <thead><tr><th scope="col">ชื่อผู้ใช้</th><th scope="col">หน่วยงาน</th><th scope="col">ผู้ถือบัญชี</th><th scope="col">ขอบเขตข้อมูล</th><th scope="col">สถานะ</th><th scope="col"><span class="sr-only">การจัดการ</span></th></tr></thead>
        <tbody>
          ${st.users.map((u) => {
            const loc = u.role === 'admin' ? POOL : u.unit;
            const ls = locStyle(loc);
            return `<tr data-row>
              <td class="mono" style="font-weight:600">${esc(u.username)}</td>
              <td><span style="display:inline-flex;align-items:center;gap:8px;font-weight:600"><span aria-hidden="true" style="width:12px;height:12px;border-radius:${ls.shape};background:${ls.color}"></span>${u.role === 'admin' ? 'Admin (HR)' : esc(u.unit)}</span></td>
              <td><label class="sr-only" for="own-${esc(u.id)}">ผู้ถือบัญชี ${esc(u.username)}</label><input id="own-${esc(u.id)}" class="input" style="min-height:40px;font-size:14px" data-owner="${esc(u.id)}" value="${esc(u.ownerName)}" placeholder="ระบุชื่อ"></td>
              <td>${u.role === 'admin' ? 'ทุก Pool + จัดการบัญชี' : 'คลังกลาง + Pool ของ ' + esc(u.unit)}</td>
              <td><button type="button" class="switch" role="switch" aria-checked="${u.active}" aria-label="เปิดใช้งานบัญชี ${esc(u.username)}" data-active="${esc(u.id)}"><span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span>${u.active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}</button></td>
              <td style="text-align:right"><button type="button" class="btn btn-sm" data-reset="${esc(u.id)}">ตั้งรหัสผ่านใหม่</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <section class="panel" aria-labelledby="perm">
      <h2 id="perm">สิทธิ์การใช้งานตามประเภทบัญชี</h2>
      <div style="overflow-x:auto"><table style="min-width:560px">
        <thead><tr><th scope="col">การทำงาน</th><th scope="col">Admin (HR)</th><th scope="col">บัญชี PJT</th></tr></thead>
        <tbody>${PERMS.map((p) => `<tr><th scope="row" style="padding:12px 16px">${esc(p[0])}</th><td><span class="pill" style="${p[2]}">${esc(p[1])}</span></td><td><span class="pill" style="${p[4]}">${esc(p[3])}</span></td></tr>`).join('')}</tbody>
      </table></div>
    </section>
    ${store.mode === 'demo' ? '<div><button type="button" class="btn btn-sm" data-reset-demo>ล้างข้อมูลสาธิตกลับเป็นค่าเริ่มต้น</button></div>' : ''}`;
  }

  function render() {
    const [title, sub] = HEAD[st.tab];
    root.innerHTML = `
    <div class="admin">
      <aside class="sidebar">
        <div class="logo" style="padding:0 8px">${LOGO}<span>Candidate Pool<span class="logo-sub">หลังบ้าน Admin (HR)</span></span></div>
        <nav aria-label="เมนูหลังบ้าน">
          ${TABS.map((t) => `<button type="button" data-tab="${t.key}" ${st.tab === t.key ? 'aria-current="page"' : ''}><span aria-hidden="true" style="width:12px;height:12px;border-radius:${t.shape};background:${t.dot}"></span>${t.label}</button>`).join('')}
        </nav>
        <div class="sidebar-user">
          <span style="display:flex;align-items:center;gap:10px;font-weight:600;overflow-wrap:anywhere"><span class="avatar-sm" aria-hidden="true" style="color:#111">${esc((session.username || 'A').charAt(0).toUpperCase())}</span>${esc(session.username)}</span>
          <button type="button" class="btn btn-sm" data-signout>${ICONS.logout} ออกจากระบบ</button>
        </div>
      </aside>
      <main class="admin-main">
        <div class="page-head">
          <div style="display:flex;flex-direction:column;gap:6px" data-enter>
            <h1 style="font-size:clamp(30px,3.4vw,44px)">${esc(title)}</h1>
            <p class="muted" style="font-size:15px">${esc(sub)}</p>
          </div>
          ${st.tab === 'pool' ? `
            <div style="display:flex;flex-wrap:wrap;gap:10px">
              <label class="btn" style="cursor:pointer">นำเข้าจาก Excel<input type="file" accept=".xlsx,.xlsm,.xls,.csv" data-import class="sr-only"></label>
              <button type="button" class="btn" data-export>ส่งออก Excel</button>
              <button type="button" class="btn btn-dark" data-add>${ICONS.plus} เพิ่มผู้สมัคร</button>
            </div>` : `<button type="button" class="btn btn-sm" data-refresh>${ICONS.refresh} รีเฟรช</button>`}
        </div>
        ${st.error ? `<div class="error-box" role="alert">${esc(st.error)}</div>` : ''}
        <div data-section style="display:flex;flex-direction:column;gap:20px">
          ${st.loading ? '<div class="loading" style="min-height:200px"><div class="spinner" role="img" aria-label="กำลังโหลด"></div></div>'
            : st.tab === 'overview' ? overview() : st.tab === 'pool' ? pool() : users()}
        </div>
      </main>
    </div>`;

    if (st.animate && !st.loading) {
      anim.enter(root.querySelectorAll('[data-enter]'));
      anim.pop(root.querySelectorAll('.kpi'), { step: 60 });
      anim.countUp(root.querySelectorAll('[data-count]'));
      anim.enter(root.querySelectorAll('.panel, [data-row]'), { step: 30, start: 100, y: 16 });
      anim.grow(root.querySelectorAll('[data-grow]'));
      st.animate = false;
    }
  }

  /* ---------- candidate form ---------- */
  function candidateForm(c) {
    const isNew = !c;
    const v = c || { decision: 'รอพิจารณา', location: POOL };
    const f = (id, label, val, type = 'text', extra = '') =>
      `<div class="field ${extra}"><label for="cf-${id}">${label}</label><input id="cf-${id}" name="${id}" class="input" type="${type}" value="${esc(val ?? '')}" ${type === 'number' ? 'step="any"' : ''}></div>`;
    openModal(`
      <div class="modal-head">
        <h2 id="modal-title">${isNew ? 'เพิ่มผู้สมัคร' : 'แก้ไข ' + esc(v.id)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
      </div>
      <form data-cform class="form-grid" novalidate>
        <div class="field"><label for="cf-id">Candidate ID *</label><input id="cf-id" name="id" class="input mono" value="${esc(v.id || '')}" ${isNew ? '' : 'readonly'} required></div>
        ${f('name', 'ชื่อ-นามสกุล *', v.name)}
        ${f('position', 'ตำแหน่ง', v.position)}
        ${f('age', 'อายุ', v.age, 'number')}
        ${f('experience', 'ประสบการณ์รวม (ปี)', v.experience, 'number')}
        ${f('education', 'การศึกษา', v.education)}
        ${f('company', 'บริษัทล่าสุด', v.company)}
        ${f('cvUrl', 'ลิงก์ Resume / CV', v.cvUrl, 'url')}
        ${f('salaryCurrent', 'เงินเดือนปัจจุบัน', v.salaryCurrent, 'number')}
        ${f('salaryExpected', 'เงินเดือนคาดหวัง', v.salaryExpected, 'number')}
        ${f('match', 'HR Match % (0–100)', v.match == null ? '' : Math.round(v.match * 100), 'number')}
        ${f('prescreenDate', 'วันที่ Prescreen', v.prescreenDate, 'date')}
        <div class="field"><label for="cf-rec">HR Recommendation</label><select id="cf-rec" name="recommendation" class="input"><option value="">อัตโนมัติจาก HR Match</option>${RECOMMENDATIONS.map((r) => `<option ${r === v.recommendation ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="field"><label for="cf-loc">อยู่ที่ Pool</label><select id="cf-loc" name="location" class="input">${LOCATIONS.map((l) => `<option value="${esc(l)}" ${l === v.location ? 'selected' : ''}>${esc(locLabel(l))}</option>`).join('')}</select></div>
        <div class="field span-2"><label for="cf-note">ความเห็น HR (HR Highlight)</label><textarea id="cf-note" name="hrNote" class="input" rows="3">${esc(v.hrNote || '')}</textarea></div>
        <div class="field"><label for="cf-dec">Executive Decision</label><select id="cf-dec" name="decision" class="input">${DECISIONS.map((d) => `<option ${d === v.decision ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label for="cf-at">วัน/เวลาสัมภาษณ์</label><input id="cf-at" name="interviewAt" class="input" type="datetime-local" value="${esc(toLocalInput(v.interviewAt))}"></div>
        ${f('interviewer', 'ชื่อผู้สัมภาษณ์', v.interviewer)}
        ${f('projectName', 'ชื่อโครงการ', v.projectName)}
        <div class="field span-2"><label for="cf-remark">หมายเหตุ</label><textarea id="cf-remark" name="remark" class="input" rows="2">${esc(v.remark || '')}</textarea></div>
        <div class="error-box span-2" data-err hidden role="alert"></div>
        <div class="modal-actions span-2" style="justify-content:space-between">
          ${isNew ? '<span></span>' : '<button type="button" class="btn btn-danger" data-delete>ลบผู้สมัคร</button>'}
          <span style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" class="btn btn-dark">บันทึก</button></span>
        </div>
      </form>`, (dlg, close) => {
      const form = dlg.querySelector('[data-cform]');
      const err = dlg.querySelector('[data-err]');
      const n = (x) => (x === '' ? null : Number(x));
      form.onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(form));
        const match = n(d.match);
        const rec = {
          ...(c || {}), ...d,
          id: d.id.trim(), name: d.name.trim(),
          age: n(d.age), experience: n(d.experience), salaryCurrent: n(d.salaryCurrent), salaryExpected: n(d.salaryExpected),
          match: match == null ? null : Math.max(0, Math.min(100, match)) / 100,
          prescreenDate: d.prescreenDate || null,
          interviewAt: d.interviewAt ? new Date(d.interviewAt).toISOString() : null,
          assignedBy: d.location === POOL ? null : (c && c.location === d.location ? c.assignedBy : 'HR')
        };
        if (!rec.id || !rec.name) { err.hidden = false; err.textContent = 'ต้องระบุ Candidate ID และชื่อ-นามสกุล'; return; }
        try {
          await store.saveCandidate(rec, isNew);
          close(); await reload();
          toast(isNew ? `เพิ่ม ${rec.id} แล้ว` : `บันทึก ${rec.id} แล้ว`);
        } catch (ex) { err.hidden = false; err.textContent = errorMessage(ex); }
      };
      const del = dlg.querySelector('[data-delete]');
      if (del) del.onclick = async () => {
        close();
        const ok = await confirmDialog({ title: `ลบ ${v.id} ${v.name}?`, body: 'ข้อมูลผู้สมัครรายนี้จะถูกลบถาวรและกู้คืนไม่ได้', confirm: 'ลบถาวร', danger: true });
        if (!ok) return;
        try { await store.deleteCandidate(v.id); await reload(); toast(`ลบ ${v.id} แล้ว`); }
        catch (ex) { toast(errorMessage(ex), { error: true }); }
      };
    }, { wide: true });
  }

  async function importFile(file) {
    let parsed;
    try {
      const { parseWorkbook } = await import('../excel.js');
      parsed = await parseWorkbook(file);
    } catch (e) { toast(errorMessage(e), { error: true }); return; }
    const existing = new Set(st.list.map((c) => c.id));
    const updates = parsed.records.filter((r) => existing.has(r.id)).length;
    const byLoc = LOCATIONS.map((l) => [l, parsed.records.filter((r) => r.location === l).length]).filter((x) => x[1]);
    openModal(`
      <div class="modal-head"><h2 id="modal-title">นำเข้าจาก ${esc(file.name)}</h2><button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button></div>
      ${parsed.records.length ? `
        <p style="font-size:15px;line-height:1.7">พบผู้สมัคร <strong>${parsed.records.length}</strong> รายการ จากชีต ${parsed.sheets.map((s) => esc(s.name)).join(', ')} · เพิ่มใหม่ ${parsed.records.length - updates} · อัปเดตของเดิม ${updates}</p>
        <ul class="legend">${byLoc.map(([l, n]) => `<li><span class="dot" style="background:${locStyle(l).color}" aria-hidden="true"></span>${esc(locLabel(l))} <strong>${n}</strong></li>`).join('')}</ul>` : '<div class="error-box">ไม่พบแถวข้อมูลที่มีคอลัมน์ "Candidate ID" ในไฟล์นี้</div>'}
      ${parsed.duplicates.length ? `<div class="warn-box">พบ ID ซ้ำในไฟล์ ใช้แถวแรกที่พบและข้ามแถวที่ซ้ำ ${parsed.duplicates.length} แถว: ${esc([...new Set(parsed.duplicates)].join(', '))}</div>` : ''}
      ${parsed.skipped ? `<div class="warn-box">ข้าม ${parsed.skipped} แถวที่ไม่มี ID หรือชื่อ</div>` : ''}
      <p class="muted" style="font-size:14px">ผู้สมัครที่ในไฟล์เลือก "หน่วยงาน/โครงการ" ไว้แต่ยังไม่ถูกย้าย จะถูกนำเข้าไปที่ Pool ปลายทางนั้น</p>
      <div class="modal-actions"><button type="button" class="btn" data-close>ยกเลิก</button>${parsed.records.length ? '<button type="button" class="btn btn-dark" data-ok>นำเข้า</button>' : ''}</div>`,
    (dlg, close) => {
      const ok = dlg.querySelector('[data-ok]');
      if (ok) ok.onclick = async () => {
        ok.disabled = true;
        try { const n = await store.importCandidates(parsed.records); close(); await reload({ animate: true }); toast(`นำเข้า ${n} รายการแล้ว`); }
        catch (e) { ok.disabled = false; toast(errorMessage(e), { error: true }); }
      };
    });
  }

  function passwordForm(u) {
    const min = CONFIG.minPasswordLength;
    openModal(`
      <div class="modal-head">
        <div style="display:flex;flex-direction:column;gap:4px">
          <h2 id="modal-title">ตั้งรหัสผ่านใหม่</h2>
          <p class="muted" style="font-size:15px">บัญชี <span class="mono">${esc(u.username)}</span> · รหัสผ่านเดิมจะใช้ไม่ได้ทันที</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
      </div>
      <form data-pw class="form-grid" novalidate>
        <div class="field span-2"><label for="pw1">รหัสผ่านใหม่ (อย่างน้อย ${min} ตัว)</label><input id="pw1" class="input" type="password" autocomplete="new-password" minlength="${min}" required></div>
        <div class="field span-2"><label for="pw2">พิมพ์รหัสผ่านใหม่อีกครั้ง</label><input id="pw2" class="input" type="password" autocomplete="new-password" required></div>
        <div class="error-box span-2" data-err hidden role="alert"></div>
        <div class="modal-actions span-2"><button type="button" class="btn" data-close>ยกเลิก</button><button type="submit" class="btn btn-dark">บันทึกรหัสผ่าน</button></div>
      </form>`, (dlg, close) => {
      dlg.querySelector('[data-pw]').onsubmit = async (e) => {
        e.preventDefault();
        const a = dlg.querySelector('#pw1').value, b = dlg.querySelector('#pw2').value;
        const err = dlg.querySelector('[data-err]');
        const fail = (m) => { err.hidden = false; err.textContent = m; };
        if (a.length < min) return fail(`รหัสผ่านต้องมีอย่างน้อย ${min} ตัว`);
        if (a !== b) return fail('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
        try { const msg = await store.setPassword(u, a); close(); toast(msg); }
        catch (ex) { fail(errorMessage(ex)); }
      };
    });
  }

  async function run(action, msg, opts) {
    try { const r = await action(); await reload(); if (msg) toast(typeof msg === 'function' ? msg(r) : msg, opts); }
    catch (e) { toast(errorMessage(e), { error: true }); await reload(); }
  }

  /* ---------- events ---------- */
  root.onclick = async (e) => {
    const t = (s) => e.target.closest(s);
    let el;
    if ((el = t('[data-signout]'))) return signOut();
    if ((el = t('[data-tab]'))) { st.tab = el.dataset.tab; st.animate = true; return render(); }
    if ((el = t('[data-refresh]'))) return reload({ animate: true });
    if ((el = t('[data-loc]'))) { st.loc = el.dataset.loc; return render(); }
    if ((el = t('[data-add]'))) return candidateForm(null);
    if ((el = t('[data-edit]'))) return candidateForm(byId(el.dataset.edit));
    if ((el = t('[data-export]'))) {
      try { const { exportWorkbook } = await import('../excel.js'); await exportWorkbook(st.list); }
      catch (ex) { toast(errorMessage(ex), { error: true }); }
      return;
    }
    if ((el = t('[data-active]'))) {
      const u = st.users.find((x) => x.id === el.dataset.active);
      anim.press(el.querySelector('.switch-knob'));
      return run(() => store.setUserActive(u.id, !u.active), `${u.active ? 'ปิด' : 'เปิด'}ใช้งานบัญชี ${u.username} แล้ว`);
    }
    if ((el = t('[data-reset]'))) return passwordForm(st.users.find((x) => x.id === el.dataset.reset));
    if ((el = t('[data-reset-demo]'))) {
      const ok = await confirmDialog({ title: 'ล้างข้อมูลสาธิต?', body: 'ข้อมูลผู้สมัครและบัญชีในเบราว์เซอร์นี้จะกลับเป็นค่าเริ่มต้น', confirm: 'ล้างข้อมูล' });
      if (ok) { await store.resetDemoData(); reload({ animate: true }); toast('ล้างข้อมูลสาธิตแล้ว'); }
    }
  };
  root.onchange = (e) => {
    const el = e.target;
    if (el.dataset.setdec) {
      const id = el.dataset.setdec, prev = byId(id).decision, next = el.value;
      return run(() => store.setDecision(id, next), `เปลี่ยนสถานะ ${id} เป็น "${next}" แล้ว`, {
        action: 'เลิกทำ', onAction: () => run(() => store.setDecision(id, prev), `คืนสถานะ ${id} แล้ว`)
      });
    }
    if (el.dataset.move && el.value) {
      const c = byId(el.dataset.move), to = el.value, from = c.location;
      const row = el.closest('tr');
      const go = () => run(() => store.moveTo(c.id, to), to === POOL ? `ดึง ${c.id} กลับคลังกลางแล้ว` : `ส่ง ${c.id} เข้า Pool ${to} แล้ว`, {
        action: 'เลิกทำ', onAction: () => run(() => store.moveTo(c.id, from), `ย้าย ${c.id} กลับ ${locLabel(from)} แล้ว`)
      });
      return st.loc === 'all' ? go() : anim.leave(row, go);
    }
    if (el.dataset.owner) {
      return run(() => store.updateUser(el.dataset.owner, { ownerName: el.value.trim() }), 'บันทึกชื่อผู้ถือบัญชีแล้ว');
    }
    if (el.dataset.import !== undefined && el.files && el.files[0]) {
      const file = el.files[0];
      el.value = '';
      importFile(file);
    }
  };
  root.oninput = (e) => {
    if (e.target.id === 'adm-search') {
      st.q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const s = root.querySelector('#adm-search');
      s.focus(); s.setSelectionRange(pos, pos);
    }
  };
  root.onsubmit = null;
  window.onfocus = null;

  render();
  reload({ animate: true });
}

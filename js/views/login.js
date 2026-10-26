import { esc, ICONS, LOGO, UNITS, errorMessage } from '../ui.js';
import * as anim from '../anim.js';

const UNIT_DOTS = [
  { dot: '#5B3DF5', shape: '999px' },
  { dot: '#FF7A3D', shape: '14px 14px 0 0' },
  { dot: '#C8F169', shape: '0 0 0 14px' },
  { dot: '#8EC5FF', shape: '4px' }
];

const TILES = `
  <div class="tile" style="background:#5B3DF5"><span style="width:58%;height:58%;border-radius:999px;background:#C8F169"></span></div>
  <div class="tile" style="background:#C8F169;align-items:flex-end"><span style="width:76%;height:38%;border-radius:999px 999px 0 0;background:#FF7A3D"></span></div>
  <div class="tile" style="background:#111"><span class="ring" style="width:52%;height:52%;border-radius:999px;border:10px solid #FFB3D1;border-right-color:transparent"></span></div>
  <div class="tile" style="background:#FF7A3D;align-items:flex-end;justify-content:flex-end"><span style="width:70%;height:70%;border-radius:100% 0 0 0;background:#FFB3D1"></span></div>
  <div class="tile" style="background:#fff;gap:8px"><span style="width:14px;height:14px;border-radius:999px;background:#111"></span><span style="width:14px;height:14px;border-radius:999px;background:#5B3DF5"></span><span style="width:14px;height:14px;border-radius:999px;background:#FF7A3D"></span></div>
  <div class="tile" style="background:#8EC5FF"><span style="width:64%;height:28%;border-radius:999px;background:#111"></span></div>
  <div class="tile" style="background:#FFD84D"><span style="width:56%;height:56%;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center"><span style="width:40%;height:40%;border-radius:999px;background:#111"></span></span></div>
  <div class="tile" style="background:#FFB3D1;align-items:flex-start;justify-content:flex-start"><span style="width:70%;height:70%;border-radius:0 0 100% 0;background:#5B3DF5"></span></div>`;

export function mountLogin(root, { store, go }) {
  const st = { role: 'pjt', unit: UNITS[0], error: '', busy: false, first: true };

  function render() {
    const isPjt = st.role === 'pjt';
    root.innerHTML = `
    <div class="login">
      <header class="login-head">
        <div class="logo">${LOGO}<span>Candidate Pool</span></div>
        <p class="muted" style="font-size:15px">มีปัญหาในการเข้าสู่ระบบ? ติดต่อ Admin (HR)</p>
      </header>
      <main class="login-main">
        <section class="hero" aria-labelledby="hero-title">
          <span class="eyebrow" data-enter><span class="dot" style="background:#5B3DF5;width:8px;height:8px"></span>ตลาดกลางผู้สมัคร สำหรับ Line Manager</span>
          <h1 id="hero-title" data-enter>คัดคนที่ใช่<br>ให้งานมีคุณภาพ</h1>
          <p class="hero-lead" data-enter>เลือกผู้สมัครจากคลังกลางที่ HR คัดกรองแล้ว เข้า Pool ของหน่วยงานคุณ ตัดสินใจและนัดสัมภาษณ์ได้ในที่เดียว</p>
          <div class="shapes" aria-hidden="true">
            <div class="shape-grid">${TILES}</div>
            <div class="float-chip" data-float style="left:6%;top:-26px">
              <span class="avatar" style="width:40px;height:40px;font-size:16px;border-radius:999px;background:#5B3DF5;color:#fff">✓</span>
              <span style="display:flex;flex-direction:column"><strong>ผ่านการคัดกรองโดย HR</strong><span class="muted" style="font-size:13px">พร้อมให้หน่วยงานเลือก</span></span>
            </div>
            <div class="float-chip dark" data-float style="right:4%;bottom:-22px"><span style="color:#C8F169;display:flex">${ICONS.calendar}</span><strong style="font-weight:600">นัดสัมภาษณ์ได้ในคลิกเดียว</strong></div>
          </div>
        </section>

        <section class="login-card" aria-labelledby="login-title">
          <div style="display:flex;flex-direction:column;gap:6px">
            <h2 id="login-title" style="font-size:30px;font-weight:700">เข้าสู่ระบบ</h2>
            <p class="muted" style="font-size:15px">เลือกประเภทบัญชีของคุณ</p>
          </div>
          <div class="seg" role="group" aria-label="ประเภทบัญชี">
            <button type="button" data-role="pjt" aria-pressed="${isPjt}">หน่วยงานโครงการ</button>
            <button type="button" data-role="admin" aria-pressed="${!isPjt}">Admin หลังบ้าน</button>
          </div>
          <div data-swap>
          ${isPjt ? `
            <fieldset style="margin:0;padding:0;border:0;display:flex;flex-direction:column;gap:10px">
              <legend style="padding:0;margin-bottom:10px;font-size:14px;font-weight:600">เลือกหน่วยงาน / โครงการ</legend>
              <div class="unit-grid">
                ${UNITS.map((u, i) => `<button type="button" class="unit-btn" data-unit="${esc(u)}" aria-pressed="${st.unit === u}">
                  <span aria-hidden="true" style="width:14px;height:14px;flex:none;border-radius:${UNIT_DOTS[i % 4].shape};background:${st.unit === u && i === 0 ? '#C8F169' : UNIT_DOTS[i % 4].dot}"></span>${esc(u)}</button>`).join('')}
              </div>
            </fieldset>` : `
            <div class="info-box" style="font-size:14px">${ICONS.shield}<span>สำหรับทีม HR: ส่งผู้สมัครเข้า Pool ของทุกหน่วยงาน ดึงกลับ แก้ไขสถานะได้ทุกรายการ และจัดการบัญชีผู้ใช้ของทุก PJT</span></div>`}
          </div>
          <form data-form style="display:flex;flex-direction:column;gap:16px" novalidate>
            <input type="hidden" name="username" autocomplete="username" value="${esc(isPjt ? st.unit.toLowerCase() : 'admin-hr')}">
            <div class="field">
              <label for="login-pass">รหัสผ่านของ ${esc(isPjt ? st.unit : 'Admin (HR)')}</label>
              <input id="login-pass" class="input" name="password" type="password" autocomplete="current-password" ${store.mode === 'demo' ? '' : 'required'}>
            </div>
            ${st.error ? `<div class="error-box" role="alert">${esc(st.error)}</div>` : ''}
            <button type="submit" class="btn btn-dark btn-block" style="min-height:56px;font-size:16px" ${st.busy ? 'disabled' : ''}>
              ${st.busy ? 'กำลังเข้าสู่ระบบ…' : esc(isPjt ? 'เข้าสู่ ' + st.unit : 'เข้าสู่ระบบหลังบ้าน')} ${ICONS.arrow}
            </button>
          </form>
          ${store.mode === 'demo'
            ? '<p class="demo-banner"><strong>โหมดสาธิต:</strong> ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น และไม่ตรวจรหัสผ่าน ห้ามใช้กับข้อมูลผู้สมัครจริง</p>'
            : `<p class="muted" style="font-size:13px;line-height:1.6;text-align:center">${isPjt ? 'บัญชีหน่วยงานเลือกผู้สมัครได้เฉพาะเข้า Pool ของ ' + esc(st.unit) + ' เท่านั้น' : 'เฉพาะบัญชีที่ได้รับสิทธิ์ Admin เท่านั้น'}</p>`}
        </section>
      </main>
    </div>`;

    if (st.first) {
      st.first = false;
      anim.enter(root.querySelectorAll('[data-enter]'), { step: 80 });
      anim.pop(root.querySelectorAll('.tile'), { step: 60, from: 'center', start: 200 });
      anim.enter(root.querySelector('.login-card'), { start: 200, y: 32 });
    }
    root.querySelectorAll('[data-float]').forEach((el, i) => anim.float(el, { delay: i * 900 }));
    anim.spin(root.querySelector('.ring'));
  }

  root.onclick = (e) => {
    const r = e.target.closest('[data-role]');
    if (r && r.dataset.role !== st.role) {
      st.role = r.dataset.role; st.error = ''; render();
      anim.switchIn(root.querySelector('[data-swap]'));
      return;
    }
    const u = e.target.closest('[data-unit]');
    if (u) { st.unit = u.dataset.unit; st.error = ''; render(); root.querySelector(`[data-unit="${st.unit}"]`).focus(); }
  };

  root.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const password = f.password.value;
    anim.press(f.querySelector('[type=submit]'));
    st.busy = true; st.error = ''; render();
    try {
      await store.signIn({ role: st.role, unit: st.unit, password });
      go(st.role === 'admin' ? '#/admin' : '#/pjt');
    } catch (err) {
      st.busy = false; st.error = errorMessage(err); render();
      root.querySelector('#login-pass').focus();
    }
  };
  render();
}

export function mountReset(root, { store, done }) {
  let error = '';
  const render = () => {
    root.innerHTML = `
    <div class="login"><main class="login-main" style="justify-content:center">
      <form class="login-card" data-form novalidate>
        <h1 style="font-size:28px">ตั้งรหัสผ่านใหม่</h1>
        <div class="field"><label for="np1">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label><input id="np1" class="input" type="password" autocomplete="new-password" minlength="8" required></div>
        <div class="field"><label for="np2">ยืนยันรหัสผ่านใหม่</label><input id="np2" class="input" type="password" autocomplete="new-password" required></div>
        ${error ? `<div class="error-box" role="alert">${esc(error)}</div>` : ''}
        <button class="btn btn-dark btn-block" type="submit">บันทึกรหัสผ่าน</button>
      </form>
    </main></div>`;
  };
  root.onclick = null;
  root.onsubmit = async (e) => {
    e.preventDefault();
    const a = root.querySelector('#np1').value, b = root.querySelector('#np2').value;
    if (a.length < 8) { error = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'; return render(); }
    if (a !== b) { error = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'; return render(); }
    try { await store.updatePassword(a); await store.signOut(); done(); }
    catch (err) { error = errorMessage(err); render(); }
  };
  render();
}

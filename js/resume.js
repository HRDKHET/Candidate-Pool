// Resume import through the organisation's Claude account (claude.ai): no API key, no cost per resume.
// HRS copies a prompt, asks Claude about the resume there, and pastes Claude's JSON reply back here.
// The reply only pre-fills the candidate form; nothing is saved until HRS reviews it and presses บันทึก.
import { esc, ICONS, HRS, DIMENSIONS, cleanScores, openModal } from './ui.js';

const CLAUDE_URL = 'https://claude.ai/new';

const EXAMPLE = {
  name: '', position: '', age: null, experience_years: null, education: '', latest_company: '',
  salary_current: null, salary_expected: null,
  scores: Object.fromEntries(DIMENSIONS.map((d) => [d.key, { score: null, reason: '' }])),
  highlight: '', questions: [], flags: []
};

export function resumePrompt(positions = []) {
  const year = new Date().getFullYear();
  return `คุณคือผู้ช่วยฝ่ายสรรหาบุคลากร (${HRS}) อ่าน Resume ที่แนบมา แล้วสรุปข้อมูลเพื่อสร้าง Profile ผู้สมัครในระบบ Candidate Pool

กฎการอ่านข้อมูล
- ใช้เฉพาะข้อมูลที่มีใน Resume ห้ามเดา ถ้าไม่พบให้ใส่ null สำหรับตัวเลข หรือ "" สำหรับข้อความ
- ปีใน Resume อาจเป็น พ.ศ. ให้แปลงเป็น ค.ศ. ก่อนคำนวณ (ปีนี้คือ ค.ศ. ${year})
- age: ใส่เฉพาะเมื่อ Resume ระบุอายุหรือวันเกิด
- experience_years: รวมระยะเวลาทำงานทั้งหมด ไม่นับช่วงที่ทำงานซ้อนกัน ทศนิยม 1 ตำแหน่ง
- position: ${positions.length ? `เลือกจากตำแหน่งในระบบที่ตรงกับ Resume ที่สุด: ${positions.join(', ')} ถ้าไม่ตรงเลย ให้ใช้ตำแหน่งที่ผู้สมัครระบุใน Resume` : 'ตำแหน่งที่ผู้สมัครระบุใน Resume'}
- education: วุฒิสูงสุด สาขา และสถาบัน
- latest_company: บริษัทที่ทำงานล่าสุด
- salary_current / salary_expected: ตัวเลขบาทต่อเดือน ใส่เฉพาะเมื่อ Resume ระบุ

กฎการให้คะแนน 7 มิติ (score เป็นจำนวนเต็ม 1–5)
1 = แทบไม่มีหลักฐาน · 2 = ต่ำกว่าที่ตำแหน่งต้องการ · 3 = เหมาะกับตำแหน่ง · 4 = ดีกว่าที่ตำแหน่งต้องการ มีตัวอย่างชัด · 5 = โดดเด่น มีหลักฐานหรือตัวเลขชัดเจน
ถ้า Resume มีข้อมูลไม่พอสำหรับมิติใด ให้ score เป็น null
${DIMENSIONS.map((d, i) => `${i + 1}. ${d.key} — ${d.full}: ดูจาก ${d.source} · เพื่อดูว่า ${d.aim}`).join('\n')}
- reason: 1–2 ประโยค อ้างอิงสิ่งที่พบใน Resume
- ห้ามใช้อายุ เพศ ศาสนา สถานภาพสมรส สัญชาติ รูปถ่าย หรือสุขภาพ ในการให้คะแนนหรือแสดงความเห็น

ความเห็นสำหรับแผนก
- highlight: สรุปจุดเด่นและข้อสังเกต 2–3 ประโยค
- questions: ประเด็นที่ควรถามเพิ่มตอนสัมภาษณ์ 2–4 ข้อ
- flags: ข้อมูลที่ไม่สอดคล้องหรือขาดหาย เช่น วันที่ทำงานซ้อนกัน หรือช่วงว่างงานที่ไม่ได้อธิบาย (ถ้าไม่มีให้ใส่ [])

เขียนข้อความทั้งหมดเป็นภาษาไทย ตอบเป็น JSON ในกล่องโค้ดเพียงกล่องเดียวตามรูปแบบนี้ ไม่ต้องมีคำอธิบายอื่น
\`\`\`json
${JSON.stringify(EXAMPLE, null, 2)}
\`\`\``;
}

const text = (v) => (v == null ? '' : String(v).trim());
const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/[,฿\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const list = (v) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

// Claude's reply (with or without the ```json fence, with or without text around it) -> form draft.
export function parseResumeReply(reply) {
  const raw = String(reply || '').trim();
  if (!raw) throw new Error('ยังไม่ได้วางคำตอบจาก Claude');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fenced ? fenced[1] : raw;
  const a = body.indexOf('{'), b = body.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('ไม่พบข้อมูลรูปแบบ JSON ในคำตอบ กรุณาคัดลอกคำตอบของ Claude มาทั้งหมด');
  let data;
  try { data = JSON.parse(body.slice(a, b + 1)); }
  catch { throw new Error('อ่านคำตอบไม่ได้ อาจคัดลอกมาไม่ครบ กรุณาคัดลอกคำตอบของ Claude ใหม่ทั้งหมด'); }
  if (!data || typeof data !== 'object' || !text(data.name)) throw new Error('คำตอบไม่มีชื่อผู้สมัคร ตรวจว่าแนบ Resume ใน Claude แล้ว');

  const s = data.scores && typeof data.scores === 'object' ? data.scores : {};
  const pick = (k) => (s[k] && typeof s[k] === 'object' ? s[k] : { score: s[k] });
  const scores = cleanScores(Object.fromEntries(DIMENSIONS.map((d) => [d.key, pick(d.key).score])));
  const reasons = Object.fromEntries(DIMENSIONS.map((d) => [d.key, text(pick(d.key).reason)]));
  const questions = list(data.questions);
  const highlight = text(data.highlight);
  const hrNote = [highlight, questions.length ? `ควรถามเพิ่ม: ${questions.join(' · ')}` : ''].filter(Boolean).join('\n');

  return {
    record: {
      name: text(data.name), position: text(data.position),
      age: num(data.age), experience: num(data.experience_years),
      education: text(data.education), company: text(data.latest_company),
      salaryCurrent: num(data.salary_current), salaryExpected: num(data.salary_expected),
      hrNote, scores
    },
    reasons,
    flags: list(data.flags)
  };
}

async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch { /* fall back below */ }
  const ta = Object.assign(document.createElement('textarea'), { value: s });
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  return ok;
}

// onDraft(draft) opens the candidate form pre-filled with the parsed reply.
export function openResumeImport({ positions = [], onDraft }) {
  const prompt = resumePrompt(positions);
  openModal(`
    <div class="modal-head">
      <div style="display:flex;flex-direction:column;gap:4px">
        <h2 id="modal-title">นำเข้า Resume ด้วย Claude</h2>
        <p class="muted" style="font-size:15px">ใช้บัญชี Claude ขององค์กร ไม่มีค่าใช้จ่ายต่อ Resume</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="ปิด">${ICONS.close}</button>
    </div>
    <ol class="resume-steps">
      <li>
        <div><strong>คัดลอกคำสั่ง</strong><span class="muted">คำสั่งบอก Claude ว่าต้องสรุปข้อมูลช่องไหน และให้คะแนน 7 มิติตามเกณฑ์ของระบบ</span></div>
        <div class="resume-actions"><button type="button" class="btn btn-dark" data-copy>${ICONS.doc} คัดลอกคำสั่ง</button><span class="muted" data-copied role="status"></span></div>
        <details><summary>ดูคำสั่ง</summary><pre class="resume-prompt">${esc(prompt)}</pre></details>
      </li>
      <li>
        <div><strong>เปิด Claude แนบไฟล์ Resume แล้ววางคำสั่ง</strong><span class="muted">เข้าด้วยบัญชีองค์กร ผู้สมัคร 1 คนต่อ 1 แชต รองรับ PDF และรูปภาพ</span></div>
        <div class="resume-actions"><a class="btn" href="${CLAUDE_URL}" target="_blank" rel="noopener noreferrer">เปิด claude.ai ↗</a></div>
      </li>
      <li>
        <div><strong>คัดลอกคำตอบของ Claude มาวางที่นี่</strong><span class="muted">กดปุ่มคัดลอกใต้คำตอบใน Claude แล้ววางทั้งหมด</span></div>
        <label for="resume-reply" class="sr-only">คำตอบจาก Claude</label>
        <textarea id="resume-reply" class="input mono" rows="7" placeholder='\`\`\`json&#10;{ "name": "...", ... }&#10;\`\`\`'></textarea>
      </li>
    </ol>
    <div class="error-box" data-err hidden role="alert"></div>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>ยกเลิก</button>
      <button type="button" class="btn btn-violet" data-read>อ่านคำตอบและเปิดฟอร์ม</button>
    </div>`, (dlg, close) => {
    const err = dlg.querySelector('[data-err]');
    const copied = dlg.querySelector('[data-copied]');
    dlg.querySelector('[data-copy]').addEventListener('click', async () => {
      copied.textContent = (await copyText(prompt)) ? 'คัดลอกแล้ว' : 'คัดลอกไม่สำเร็จ เปิด "ดูคำสั่ง" แล้วคัดลอกเอง';
    });
    dlg.querySelector('[data-read]').addEventListener('click', () => {
      try {
        const draft = parseResumeReply(dlg.querySelector('#resume-reply').value);
        close();
        onDraft(draft);
      } catch (ex) { err.hidden = false; err.textContent = ex.message; }
    });
  }, { wide: true });
}

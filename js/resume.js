// Resume import through the organisation's Claude account (claude.ai): no API key, no cost per resume.
// HRS copies a prompt, asks Claude about the resume there, and pastes Claude's JSON reply back here.
// The reply only pre-fills the candidate form; nothing is saved until HRS reviews it and presses บันทึก.
import { esc, ICONS, DIMENSIONS, cleanScores, openModal } from './ui.js';
import { resumePrompt } from './resume-prompt.js';

const CLAUDE_URL = 'https://claude.ai/new';

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
      name: text(data.name), email: text(data.email), phone: text(data.phone), position: text(data.position),
      age: num(data.age), experience: num(data.experience_years),
      education: text(data.education), company: text(data.latest_company),
      salaryCurrent: num(data.salary_current), salaryExpected: num(data.salary_expected),
      hrNote, scores
    },
    reasons
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
        <div><strong>คัดลอกคำสั่ง</strong><span class="muted">คำสั่งจาก Skill "Candidate Pool Profile" บอก Claude ว่าต้องสรุปข้อมูลช่องไหน และให้คะแนน 7 มิติตามเกณฑ์ของระบบ</span></div>
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

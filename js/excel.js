// Import from / export to the existing Candidate Marketplace workbook layout.
// SheetJS is loaded only when an admin imports or exports.
import { POOL, UNITS, DECISIONS, DIMENSIONS, cleanScores, recKey, recLabel, locLabel, interviewerText, safeUrl } from './ui.js';
import { loadLib } from './cdn.js';

const loadXLSX = () => loadLib('xlsx').catch(() => {
  throw new Error('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
});

const scoreHeader = (d) => `คะแนน ${d.label}`;

// Header text in the workbook -> field. Several sheets use different labels for the same thing.
const HEADERS = {
  'candidate id': 'id', 'ชื่อ-นามสกุล': 'name', 'ตำแหน่ง': 'position', 'อายุ': 'age',
  'ประสบการณ์รวม (ปี)': 'experience', 'การศึกษา': 'education',
  'recume/cv': 'companyOrCv', 'resume/cv': 'companyOrCv', 'บริษัทล่าสุด': 'company',
  'เงินเดือนปัจจุบัน': 'salaryCurrent', 'เงินเดือนคาดหวัง': 'salaryExpected', 'hr match %': 'match',
  'วันที่ precreen': 'prescreenDate', 'วันที่ prescreen': 'prescreenDate', 'วันที่รับใบสมัคร': 'prescreenDate',
  'hr recommendation': 'recOrNote', 'hr highlight': 'hrNote', 'executive decision': 'decision',
  'วัน/เวลา ที่ต้องการนัดสัมภาษณ์': 'interviewAt', 'ชื่อผู้สัมภาษณ์': 'interviewer',
  'หน่วยงาน/โครงการ': 'destination', 'ชื่อโครงการ': 'projectName', 'หมายเหตุ': 'remark',
  // One column per comparison dimension, e.g. "คะแนน ผลงาน".
  ...Object.fromEntries(DIMENSIONS.map((d) => [scoreHeader(d).toLowerCase(), 'score:' + d.key]))
};

const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
function excelDate(v, withTime) {
  if (v === '' || v == null) return null;
  let d;
  if (typeof v === 'number') d = new Date(Math.round((v - 25569) * 86400000));
  else { d = new Date(v); if (isNaN(d)) return null; }
  if (withTime) {
    // Serial dates carry no timezone: treat them as local wall-clock time.
    if (typeof v === 'number') d = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return d.toISOString();
  }
  return d.toISOString().slice(0, 10);
}

function locationFor(sheetName) {
  if (sheetName === 'Candidate Database') return POOL;
  const u = UNITS.find((x) => x.toUpperCase() === sheetName.trim().toUpperCase());
  return u || null;
}

export async function parseWorkbook(file) {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
  const result = { records: [], duplicates: [], skipped: 0, sheets: [] };
  const seen = new Map();

  let names = wb.SheetNames.filter((n, i) => !(meta[i] && meta[i].Hidden) && locationFor(n));
  if (!names.length) names = [wb.SheetNames[0]];

  for (const name of names) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
    const hIdx = rows.findIndex((r) => r.some((c) => String(c).trim().toLowerCase() === 'candidate id'));
    if (hIdx < 0) continue;
    const fields = rows[hIdx].map((h) => HEADERS[String(h).trim().toLowerCase()] || null);
    const sheetLoc = locationFor(name) || POOL;
    // Without score columns the sheet leaves existing scores alone.
    const hasScores = fields.some((f) => f && f.startsWith('score:'));
    let count = 0;
    for (const r of rows.slice(hIdx + 1)) {
      const raw = {};
      fields.forEach((f, i) => { if (f) raw[f] = r[i]; });
      const id = String(raw.id ?? '').trim();
      const nameVal = String(raw.name ?? '').trim();
      if (!id && !nameVal) continue;
      if (!id || !nameVal) { result.skipped++; continue; }

      const rec = String(raw.recOrNote ?? '').trim();
      const cv = String(raw.companyOrCv ?? '').trim();
      let match = num(raw.match);
      if (match != null && match > 1) match = match / 100;
      const dest = String(raw.destination ?? '').trim();
      // A destination chosen in the workbook but never moved by the macro is applied now.
      let location = sheetLoc;
      if (/^return to hr$/i.test(dest)) location = POOL;
      else if (UNITS.includes(dest.toUpperCase())) location = dest.toUpperCase();
      const decision = DECISIONS.includes(String(raw.decision).trim()) ? String(raw.decision).trim() : 'รอพิจารณา';

      const record = {
        id, name: nameVal,
        position: String(raw.position ?? '').trim(),
        age: num(raw.age), experience: num(raw.experience),
        education: String(raw.education ?? '').trim(),
        company: String(raw.company ?? (/^https?:/i.test(cv) ? '' : cv)).trim(),
        cvUrl: safeUrl(cv),
        salaryCurrent: num(raw.salaryCurrent), salaryExpected: num(raw.salaryExpected), match,
        prescreenDate: excelDate(raw.prescreenDate, false),
        recommendation: recKey(rec),
        hrNote: String(raw.hrNote ?? (recKey(rec) ? '' : rec)).trim(),
        decision,
        interviewAt: excelDate(raw.interviewAt, true),
        // The workbook has one free-text interviewer cell; position/ฝ่าย are filled in later.
        interviewers: String(raw.interviewer ?? '').trim() ? [{ name: String(raw.interviewer).trim(), position: '', department: '' }] : [],
        interviewStatus: excelDate(raw.interviewAt, true) ? (decision === 'นัดสัมภาษณ์แล้ว' ? 'confirmed' : 'requested') : null,
        interviewMode: excelDate(raw.interviewAt, true) ? 'onsite' : null,
        projectName: String(raw.projectName ?? '').trim(),
        remark: String(raw.remark ?? '').trim(),
        location, assignedBy: location === POOL ? null : 'HR',
        ...(hasScores ? { scores: cleanScores(Object.fromEntries(DIMENSIONS.map((d) => [d.key, raw['score:' + d.key]]))) } : {})
      };
      if (seen.has(id)) { result.duplicates.push(`${id} (${seen.get(id)} และ ${name})`); continue; }
      seen.set(id, name);
      result.records.push(record);
      count++;
    }
    result.sheets.push({ name, count });
  }
  return result;
}

export async function exportWorkbook(candidates) {
  const XLSX = await loadXLSX();
  const rows = candidates.map((c) => ({
    'Candidate ID': c.id, 'ชื่อ-นามสกุล': c.name, 'ตำแหน่ง': c.position, 'อายุ': c.age,
    'ประสบการณ์รวม (ปี)': c.experience, 'การศึกษา': c.education, 'บริษัทล่าสุด': c.company,
    'Resume/CV': c.cvUrl, 'เงินเดือนปัจจุบัน': c.salaryCurrent, 'เงินเดือนคาดหวัง': c.salaryExpected,
    'HR Match %': c.match, 'วันที่ Prescreen': c.prescreenDate, 'HR Recommendation': recLabel(c.recommendation),
    'HR Highlight': c.hrNote, 'Executive Decision': c.decision,
    'วัน/เวลา ที่ต้องการนัดสัมภาษณ์': c.interviewAt ? new Date(c.interviewAt).toLocaleString('th-TH') : '',
    'สถานะนัด': c.interviewStatus === 'confirmed' ? 'ยืนยันแล้ว' : c.interviewStatus === 'requested' ? 'รอยืนยัน' : '',
    'รูปแบบ': c.interviewMode === 'online' ? 'Online' : c.interviewMode === 'onsite' ? 'Onsite' : '',
    'สถานที่ / ลิงก์': c.interviewMode === 'online' ? c.meetingLink : c.interviewLocation,
    'ชื่อผู้สัมภาษณ์': interviewerText(c.interviewers), 'หน่วยงาน/โครงการ': locLabel(c.location),
    'ชื่อโครงการ': c.projectName, 'หมายเหตุ': c.remark,
    ...Object.fromEntries(DIMENSIONS.map((d) => [scoreHeader(d), (c.scores || {})[d.key] ?? '']))
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Candidates');
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  XLSX.writeFile(wb, `candidate-pool-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.xlsx`);
}

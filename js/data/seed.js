// Fictional sample candidates for demo mode. Names and companies are made up;
// the shape mirrors the Candidate Marketplace workbook.
const row = (id, name, position, age, experience, education, company, salaryCurrent, salaryExpected, match, prescreenDate, hrNote, location, decision = 'รอพิจารณา') => ({
  id, name, position, age, experience, education, company, cvUrl: '',
  salaryCurrent, salaryExpected, match, prescreenDate, recommendation: '', hrNote,
  decision, interviewAt: null, interviewer: '', projectName: '', remark: '',
  location, assignedBy: location === 'HR' ? null : 'HR', updatedAt: null
});

const CIVIL = 'วศ.บ. วิศวกรรมโยธา';
const SAFETY = 'วท.บ. อาชีวอนามัยและความปลอดภัย';

// Made-up 1–5 dimension scores near each HR Match; D104 is left unscored.
const DIM_KEYS = ['exp', 'skill', 'result', 'career', 'learn', 'trust', 'tech'];
const withScores = (c) => {
  if (c.id === 'D104') return { ...c, scores: {}, preInterviewed: false };
  const n = Number(c.id.slice(1)), base = Math.round(c.match * 5);
  return { ...c, preInterviewed: n % 3 !== 0, scores: Object.fromEntries(DIM_KEYS.map((k, i) => [k, Math.max(1, Math.min(5, base + ((n + i * 2) % 3) - 1))])) };
};

export const SEED_CANDIDATES = [
  row('D101', 'สมใจ ตัวอย่าง', 'Office Engineer', 28, 5, CIVIL, 'Sample Build Co.', 37000, 42000, 0.81, '2026-08-15', 'เอกสารและ Shop Drawing ดี เหมาะโครงการขนาดกลาง', 'HR'),
  row('D102', 'มาลี ทดลองงาน', 'HR Officer', 30, 7, 'บธ.บ. การจัดการทรัพยากรมนุษย์', 'Demo People Ltd.', 42000, 48000, 0.87, '2026-08-16', 'Recruitment + Workforce Planning และ Dashboard ดี', 'HR'),
  row('D103', 'วันดี สมมติ', 'QS Engineer', 34, 10, CIVIL, 'Example Cost Co.', 57000, 65000, 0.88, '2026-08-15', 'Cost plan และ VO/Variation แข็งแรง', 'HR'),
  row('D104', 'ปรีดา ข้อมูลไม่ครบ', 'HR', 29, 5, '', '', 30000, 30000, 0.85, null, '', 'HR'),
  row('D105', 'สมชาย ทดสอบ', 'Site Engineer', 31, 7, CIVIL, 'Alpha Construction (ตัวอย่าง)', 45000, 50000, 0.94, '2026-08-03', 'ดูงานโครงสร้างและสถาปัตย์ได้ มีประสบการณ์อาคารสูง 5 ปี', 'PJT-PD-1', 'เรียกสัมภาษณ์'),
  row('D106', 'อนันต์ ตัวอย่างดี', 'Site Engineer', 35, 11, CIVIL, 'Beta Builders (ตัวอย่าง)', 60000, 70000, 0.93, '2026-08-13', 'ผ่านงานอาคารสูงกว่า 20 ชั้น มีทีมงานและควบคุม subcontractor ได้ดี', 'PJT-PD-1'),
  row('D107', 'ชัยวัฒน์ สาธิต', 'Safety Officer', 33, 8, SAFETY, 'Gamma Safety (ตัวอย่าง)', 48000, 55000, 0.90, '2026-08-15', 'คุม Safety โครงการขนาดใหญ่ มีประสบการณ์สอบสวนอุบัติเหตุ', 'PJT-PD-1'),
  row('D108', 'ประเสริฐ ลองใช้', 'Site Engineer', 30, 6, CIVIL, 'Delta Works (ตัวอย่าง)', 41000, 47000, 0.88, '2026-08-12', 'คุมงานโครงสร้าง RC และงาน finishing ได้', 'PJT-PD-1'),
  row('D109', 'นงลักษณ์ สมมุติ', 'Office Engineer', 31, 7, CIVIL, 'Epsilon Plan (ตัวอย่าง)', 47000, 52000, 0.86, '2026-08-12', 'เอกสารโครงการแข็งแรง ประสาน Consultant และจัดประชุมงานได้', 'PJT-PD-1'),
  row('D110', 'วีระ ทดลอง', 'Project Engineer', 31, 7, CIVIL, 'Zeta Projects (ตัวอย่าง)', 48000, 55000, 0.79, '2026-08-14', 'บริหารแผนงานได้ แต่ประสบการณ์โครงการขนาดใหญ่ยังจำกัด', 'PJT-PD-1'),
  row('D111', 'จันทร์เพ็ญ ตัวอย่าง', 'Safety Officer', 26, 4, SAFETY, 'Eta Site (ตัวอย่าง)', 34000, 39000, 0.76, '2026-08-11', 'ผ่านงานไซต์โรงงานและอบรม จป.วิชาชีพ', 'PJT-PD-1'),
  row('D112', 'ธีระ สาธิตงาน', 'Project Engineer', 34, 10, CIVIL, 'Theta Build (ตัวอย่าง)', 55000, 65000, 0.92, '2026-08-04', 'บริหารผู้รับเหมาและแผนงานโครงการ มูลค่าโครงการมากกว่า 500 ล้านบาท', 'PJT-PD-2', 'เรียกสัมภาษณ์'),
  row('D113', 'กมล ทดสอบระบบ', 'Site Engineer', 29, 5, CIVIL, 'Iota Site (ตัวอย่าง)', 39000, 45000, 0.77, '2026-08-15', 'คุมงานโครงสร้างได้ดี แต่ยังต้องเสริมงานสถาปัตย์', 'PJT-PD-2'),
  row('D114', 'สุริยา สมมติดี', 'Project Engineer', 37, 13, CIVIL, 'Kappa Projects (ตัวอย่าง)', 70000, 80000, 0.95, '2026-08-16', 'ประสบการณ์สูง บริหารหลายโครงการพร้อมกัน และคุมงบได้', 'PJT-PD-3'),
  row('D115', 'พรทิพย์ ลองดู', 'HR Officer', 27, 4, 'ศศ.บ. จิตวิทยาอุตสาหกรรม', 'Lambda HR (ตัวอย่าง)', 31000, 36000, 0.84, '2026-08-14', 'สรรหาหลากหลายสายงานและมีประสบการณ์ ATS', 'PJT-PD-3'),
  row('D116', 'อรุณ ตัวอย่างงาน', 'QS Engineer', 29, 5, CIVIL, 'Mu Measure (ตัวอย่าง)', 39000, 45000, 0.83, '2026-08-13', 'ถอดปริมาณและทำ Cost Comparison ได้รวดเร็ว', 'PJT-PD-4')
].map(withScores);

export const SEED_USERS = [
  { id: 'admin-hr', username: 'admin-hr', role: 'admin', unit: null, ownerName: '', active: true },
  { id: 'pjt-pd-1', username: 'pjt-pd-1', role: 'pjt', unit: 'PJT-PD-1', ownerName: '', active: true },
  { id: 'pjt-pd-2', username: 'pjt-pd-2', role: 'pjt', unit: 'PJT-PD-2', ownerName: '', active: true },
  { id: 'pjt-pd-3', username: 'pjt-pd-3', role: 'pjt', unit: 'PJT-PD-3', ownerName: '', active: true },
  { id: 'pjt-pd-4', username: 'pjt-pd-4', role: 'pjt', unit: 'PJT-PD-4', ownerName: '', active: true }
];

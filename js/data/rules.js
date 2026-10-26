// Business rules shared by both stores. The Supabase store enforces the same
// rules again on the server (supabase/schema.sql); these keep demo mode honest.
import { POOL, DECISIONS } from '../ui.js';

export const CLEARED_INTERVIEW = { interviewAt: null, interviewer: '', projectName: '', remark: '' };

export function assertDecision(decision) {
  if (!DECISIONS.includes(decision)) throw new Error('สถานะไม่ถูกต้อง: ' + decision);
}

// A PJT may only act on candidates in its own pool, and pick only from the central pool.
export function pjtPick(c, unit) {
  if (c.location !== POOL) throw new Error(`${c.id} ไม่อยู่ในคลังกลางแล้ว อาจถูกหน่วยงานอื่นเลือกไป`);
  return { ...c, ...CLEARED_INTERVIEW, location: unit, assignedBy: unit, decision: 'รอพิจารณา' };
}
export function pjtReturn(c, unit) {
  if (c.location !== unit) throw new Error(`${c.id} ไม่ได้อยู่ใน Pool ของ ${unit}`);
  return { ...c, ...CLEARED_INTERVIEW, location: POOL, assignedBy: null, decision: 'รอพิจารณา' };
}
export function pjtDecide(c, unit, decision) {
  if (c.location !== unit) throw new Error(`${c.id} ไม่ได้อยู่ใน Pool ของ ${unit}`);
  assertDecision(decision);
  const keepInterview = decision === 'เรียกสัมภาษณ์' || decision === 'นัดสัมภาษณ์แล้ว';
  return { ...c, ...(keepInterview ? {} : CLEARED_INTERVIEW), decision };
}
export function pjtSchedule(c, unit, s) {
  if (c.location !== unit) throw new Error(`${c.id} ไม่ได้อยู่ใน Pool ของ ${unit}`);
  if (!s.interviewAt) throw new Error('กรุณาระบุวันและเวลาสัมภาษณ์');
  return {
    ...c, decision: 'นัดสัมภาษณ์แล้ว',
    interviewAt: s.interviewAt, interviewer: s.interviewer || '',
    projectName: s.projectName || '', remark: s.remark || ''
  };
}
// Admin moves keep the record but reset the decision when the pool changes.
export function adminMove(c, location) {
  if (c.location === location) return c;
  return {
    ...c, ...CLEARED_INTERVIEW, location, decision: 'รอพิจารณา',
    assignedBy: location === POOL ? null : 'HR'
  };
}

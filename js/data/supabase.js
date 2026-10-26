// Supabase store: real sign-in and shared data.
// Permissions are enforced server-side by row-level security and the functions
// in supabase/*.sql; the checks here only give friendlier messages.
import { CONFIG } from '../config.js';
import { validateInterview } from './rules.js';

const SUPABASE_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
let client = null;
let profile = null;

async function sb() {
  if (client) return client;
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
    throw new Error('ยังไม่ได้ตั้งค่า supabaseUrl และ supabaseAnonKey ใน js/config.js');
  }
  const { createClient } = await import(SUPABASE_URL);
  client = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  return client;
}

const fromRow = (r) => ({
  id: r.id, name: r.name, position: r.position, age: r.age, experience: r.experience,
  education: r.education, company: r.company, cvUrl: r.cv_url,
  salaryCurrent: r.salary_current, salaryExpected: r.salary_expected,
  match: r.hr_match == null ? null : Number(r.hr_match), prescreenDate: r.prescreen_date,
  recommendation: r.recommendation, hrNote: r.hr_note, decision: r.decision,
  interviewAt: r.interview_at, interviewMode: r.interview_mode, interviewStatus: r.interview_status,
  interviewers: Array.isArray(r.interviewers) ? r.interviewers : [],
  interviewLocation: r.interview_location || '', meetingLink: r.meeting_link || '',
  projectName: r.project_name || '', remark: r.remark || '',
  requestedBy: r.interview_requested_by, requestedAt: r.interview_requested_at,
  confirmedAt: r.interview_confirmed_at, confirmNote: r.interview_confirm_note || '',
  location: r.location, assignedBy: r.assigned_by, updatedAt: r.updated_at,
  createdAt: r.created_at, holdUntil: r.hold_until
});
// created_at and hold_until are managed by the database (default + trigger), never sent.
const toRow = (c) => ({
  id: c.id, name: c.name, position: c.position || null, age: c.age ?? null,
  experience: c.experience ?? null, education: c.education || null, company: c.company || null,
  cv_url: c.cvUrl || null, salary_current: c.salaryCurrent ?? null, salary_expected: c.salaryExpected ?? null,
  hr_match: c.match ?? null, prescreen_date: c.prescreenDate || null,
  recommendation: c.recommendation || null, hr_note: c.hrNote || null,
  decision: c.decision || 'รอพิจารณา',
  interview_at: c.interviewAt || null, interview_mode: c.interviewMode || null,
  interview_status: c.interviewStatus || null, interviewers: c.interviewers || [],
  interview_location: c.interviewLocation || null, meeting_link: c.meetingLink || null,
  project_name: c.projectName || null, remark: c.remark || null,
  interview_requested_by: c.requestedBy || null, interview_requested_at: c.requestedAt || null,
  interview_confirmed_at: c.confirmedAt || null, interview_confirm_note: c.confirmNote || null,
  location: c.location || 'HR', assigned_by: c.assignedBy || null
});
const CLEAR_INTERVIEW_ROW = {
  interview_at: null, interview_mode: null, interview_status: null, interviewers: [],
  interview_location: null, meeting_link: null, project_name: null, remark: null,
  interview_requested_by: null, interview_requested_at: null,
  interview_confirmed_at: null, interview_confirm_note: null
};

const check = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function loadProfile() {
  const c = await sb();
  const { data: { user } } = await c.auth.getUser();
  if (!user) { profile = null; return null; }
  const p = check(await c.from('profiles').select('*').eq('id', user.id).maybeSingle());
  profile = p;
  return p;
}

// Accounts are shown by name (hrs, pjt-pd-1 …), never by their internal email.
const accountName = (p) => (p.role === 'admin' ? CONFIG.hrsName.toLowerCase() : String(p.unit).toLowerCase());
const isAdmin = () => profile && profile.role === 'admin';

export const supabaseStore = {
  mode: 'supabase',

  async getSession() {
    const c = await sb();
    const { data } = await c.auth.getSession();
    if (!data.session) return null;
    const p = profile || await loadProfile();
    if (!p || !p.active) return null;
    return { userId: p.id, username: accountName(p), role: p.role, unit: p.unit };
  },

  async signIn({ role, unit, password }) {
    const c = await sb();
    const email = CONFIG.accounts[role === 'admin' ? 'admin' : unit];
    if (!email) throw new Error('ไม่พบบัญชีนี้ในการตั้งค่า');
    if (!password) throw new Error('กรุณาใส่รหัสผ่าน');
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw new Error('รหัสผ่านไม่ถูกต้อง');
    const p = await loadProfile();
    const fail = async (msg) => { await c.auth.signOut(); profile = null; throw new Error(msg); };
    if (!p) return fail(`บัญชีนี้ยังไม่ได้กำหนดสิทธิ์ กรุณาติดต่อ ${CONFIG.hrsName}`);
    if (!p.active) return fail(`บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อ ${CONFIG.hrsName}`);
    return { userId: p.id, username: accountName(p), role: p.role, unit: p.unit };
  },

  async signOut() { const c = await sb(); profile = null; await c.auth.signOut(); },

  async listCandidates() {
    const c = await sb();
    // Return candidates whose 72-hour decision window has passed (no cron needed:
    // every page load runs it). Failure here must not block the list.
    try { await c.rpc('release_expired_holds'); } catch (e) { /* ignore */ }
    return check(await c.from('candidates').select('*').order('hr_match', { ascending: false, nullsFirst: false })).map(fromRow);
  },

  async pick(id) { const c = await sb(); return fromRow(check(await c.rpc('pjt_pick', { p_id: id }))); },
  async returnToPool(id) { const c = await sb(); return fromRow(check(await c.rpc('pjt_return', { p_id: id }))); },
  async setDecision(id, decision) {
    const c = await sb();
    if (isAdmin()) {
      const keep = decision === 'เรียกสัมภาษณ์' || decision === 'นัดสัมภาษณ์แล้ว';
      return fromRow(check(await c.from('candidates').update({ decision, ...(keep ? {} : CLEAR_INTERVIEW_ROW) }).eq('id', id).select().single()));
    }
    return fromRow(check(await c.rpc('pjt_set_decision', { p_id: id, p_decision: decision })));
  },
  async requestInterview(id, data) {
    const c = await sb();
    const v = validateInterview(data);
    return fromRow(check(await c.rpc('pjt_request_interview', {
      p_id: id, p_at: v.interviewAt, p_mode: v.interviewMode, p_interviewers: v.interviewers,
      p_location: v.interviewLocation || null, p_project: v.projectName || null, p_note: v.remark || null
    })));
  },

  // ---- HRS only (rejected by RLS / function checks for everyone else) ----
  async setInterview(id, data) {
    const c = await sb();
    const v = validateInterview(data, { requireLink: true });
    return fromRow(check(await c.rpc('admin_set_interview', {
      p_id: id, p_at: v.interviewAt, p_mode: v.interviewMode, p_interviewers: v.interviewers,
      p_location: v.interviewLocation || null, p_link: v.meetingLink || null,
      p_project: v.projectName || null, p_note: v.remark || null, p_confirm_note: v.confirmNote || null
    })));
  },
  async moveTo(id, location) {
    const c = await sb();
    return fromRow(check(await c.from('candidates').update({
      location, decision: 'รอพิจารณา', ...CLEAR_INTERVIEW_ROW, assigned_by: location === 'HR' ? null : 'HR'
    }).eq('id', id).select().single()));
  },
  async saveCandidate(record, isNew) {
    const c = await sb();
    const q = isNew ? c.from('candidates').insert(toRow(record)) : c.from('candidates').update(toRow(record)).eq('id', record.id);
    const { error } = await q;
    if (error) throw new Error(error.code === '23505' ? `Candidate ID ${record.id} มีอยู่แล้ว` : error.message);
    return record;
  },
  async deleteCandidate(id) { const c = await sb(); check(await c.from('candidates').delete().eq('id', id)); },
  async importCandidates(records) {
    const c = await sb();
    check(await c.from('candidates').upsert(records.map(toRow), { onConflict: 'id' }));
    return records.length;
  },
  async listUsers() {
    const c = await sb();
    return check(await c.from('profiles').select('*').order('role').order('unit')).map((p) => ({
      id: p.id, username: accountName(p), role: p.role, unit: p.unit, ownerName: p.owner_name || '', active: p.active
    }));
  },
  async setUserActive(id, active) {
    const c = await sb();
    if (profile && id === profile.id && !active) throw new Error('ปิดใช้งานบัญชีที่กำลังใช้อยู่ไม่ได้');
    check(await c.from('profiles').update({ active }).eq('id', id));
  },
  async updateUser(id, patch) {
    const c = await sb();
    check(await c.from('profiles').update({ owner_name: patch.ownerName }).eq('id', id));
  },
  // Runs public.admin_set_password, which re-checks that the caller is an active HRS account.
  async setPassword(user, password) {
    const c = await sb();
    check(await c.rpc('admin_set_password', { p_user: user.id, p_password: password }));
    return 'ตั้งรหัสผ่านใหม่ให้ ' + user.username + ' แล้ว';
  },

  // ---- notifications (RLS shows each account only its own) ----
  async listNotifications() {
    const c = await sb();
    return check(await c.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)).map((n) => ({
      id: n.id, recipient: n.recipient, kind: n.kind, candidateId: n.candidate_id,
      title: n.title, body: n.body, link: n.link, createdAt: n.created_at, readAt: n.read_at
    }));
  },
  async markNotificationsRead(ids) {
    if (!ids.length) return;
    const c = await sb();
    check(await c.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids));
  }
};

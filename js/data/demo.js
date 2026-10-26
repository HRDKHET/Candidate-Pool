// Demo store: everything lives in this browser's localStorage. Passwords are not
// checked. Use only to try the workflow — never with real candidate data.
import { SEED_CANDIDATES, SEED_USERS } from './seed.js';
import { POOL, UNITS, HRS, MODE_LABEL } from '../ui.js';
import * as rules from './rules.js';
import { CONFIG } from '../config.js';

const KEY = 'candidate-pool-demo-v3';
const SESSION_KEY = 'candidate-pool-demo-session';

// Spread "entered the system" over the past weeks so a few sample rows show "New".
const fresh = () => ({
  candidates: structuredClone(SEED_CANDIDATES).map((c, i) => ({
    ...rules.CLEARED_INTERVIEW, holdUntil: null, ...c,
    createdAt: new Date(Date.now() - i * 1.5 * 86400000).toISOString()
  })),
  users: structuredClone(SEED_USERS),
  notifications: [],
  nextNotif: 1
});
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked: fall through to fresh data */ }
  return fresh();
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* in-memory only */ }
}
const stamp = (c) => ({ ...c, updatedAt: new Date().toISOString() });

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
let session = readSession();

function requireSession(role) {
  if (!session) throw new Error('กรุณาเข้าสู่ระบบใหม่');
  const u = db.users.find((x) => x.id === session.userId);
  if (!u || !u.active) throw new Error('บัญชีนี้ถูกปิดใช้งาน');
  if (role && session.role !== role) throw new Error('ไม่มีสิทธิ์ทำรายการนี้');
  return session;
}
function find(id) {
  const c = db.candidates.find((x) => x.id === id);
  if (!c) throw new Error('ไม่พบผู้สมัคร ' + id);
  return c;
}
function put(next) {
  db.candidates = db.candidates.map((x) => (x.id === next.id ? stamp(next) : x));
  save();
  return next;
}
// recipient: 'HRS' or a unit code.
function notify(recipient, kind, c, title, body, link = '') {
  db.notifications.unshift({
    id: db.nextNotif++, recipient, kind, candidateId: c.id, title, body, link,
    createdAt: new Date().toISOString(), readAt: null
  });
  db.notifications = db.notifications.slice(0, 200);
}
const where = (c) => (c.interviewMode === 'onsite' ? `Onsite · ${c.interviewLocation}` : 'Online');

export const demoStore = {
  mode: 'demo',

  async getSession() { return session; },

  async signIn({ role, unit }) {
    const expected = role === 'admin' ? 'admin-hr' : String(unit).toLowerCase();
    const u = db.users.find((x) => x.id === expected);
    if (!u) throw new Error('ไม่พบบัญชีนี้');
    if (!u.active) throw new Error(`บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อ ${HRS}`);
    session = { userId: u.id, username: u.username, role: u.role, unit: u.unit };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
    return session;
  },

  async signOut() {
    session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  },

  // Visibility mirrors the server policy: HRS sees all, a unit sees the central pool and its own pool.
  async listCandidates() {
    const s = requireSession();
    // Same rule the server runs in release_expired_holds().
    const now = Date.now();
    db.candidates.filter((c) => rules.isExpired(c, now)).forEach((c) => {
      notify(c.location, 'hold_expired', c, `หมดเวลาพิจารณา ${c.id} ${c.name}`,
        `ครบ ${CONFIG.holdHours} ชม. โดยยังไม่ได้ตัดสินใจ ผู้สมัครถูกคืนเข้า Candidate Pool แล้ว`);
      put(rules.release(c));
    });
    const all = db.candidates.slice().sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    if (s.role === 'admin') return all;
    return all.filter((c) => c.location === POOL || c.location === s.unit);
  },

  async pick(id) { const s = requireSession('pjt'); return put(rules.pjtPick(find(id), s.unit)); },
  async returnToPool(id) {
    const s = requireSession('pjt');
    const c = find(id);
    const next = put(rules.pjtReturn(c, s.unit));
    if (c.interviewStatus) notify('HRS', 'interview_cancelled', c, `${s.unit} คืน ${c.id} ${c.name} กลับ Candidate Pool`, 'นัดสัมภาษณ์ที่มีอยู่ถูกยกเลิก');
    save();
    return next;
  },
  async setDecision(id, decision) {
    const s = requireSession();
    const c = find(id);
    if (s.role === 'admin') return put(rules.adminDecide(c, decision));
    const next = put(rules.pjtDecide(c, s.unit, decision));
    if (c.interviewStatus && !next.interviewStatus) {
      notify('HRS', 'interview_cancelled', c, `${s.unit} ยกเลิกนัดสัมภาษณ์ ${c.id} ${c.name}`, `เปลี่ยนสถานะเป็น "${decision}"`);
      save();
    }
    return next;
  },
  async requestInterview(id, data) {
    const s = requireSession('pjt');
    const next = put(rules.pjtRequest(find(id), s.unit, data));
    notify('HRS', 'interview_requested', next, `${s.unit} ขอนัดสัมภาษณ์ ${next.id} ${next.name}`,
      `${rules.whenText(next.interviewAt)} · ${where(next)} · ผู้สัมภาษณ์ ${next.interviewers.length} คน`);
    save();
    return next;
  },

  // ---- HRS only ----
  async setInterview(id, data) {
    requireSession('admin');
    const next = put(rules.hrsSetInterview(find(id), data));
    if (next.location !== POOL) {
      notify(next.location, 'interview_confirmed', next, `${HRS} ยืนยันนัดสัมภาษณ์ ${next.id} ${next.name}`,
        `${rules.whenText(next.interviewAt)} · ${MODE_LABEL[next.interviewMode]}${next.interviewMode === 'onsite' ? ' · ' + next.interviewLocation : ''}${next.confirmNote ? ' · ' + next.confirmNote : ''}`,
        next.meetingLink);
      save();
    }
    return next;
  },
  async moveTo(id, location) {
    requireSession('admin');
    if (location !== POOL && !UNITS.includes(location)) throw new Error('ปลายทางไม่ถูกต้อง');
    return put(rules.adminMove(find(id), location));
  },
  async saveCandidate(record, isNew) {
    requireSession('admin');
    if (!record.id || !record.name) throw new Error('ต้องมี Candidate ID และชื่อ-นามสกุล');
    rules.assertDecision(record.decision);
    const exists = db.candidates.some((x) => x.id === record.id);
    if (isNew && exists) throw new Error(`Candidate ID ${record.id} มีอยู่แล้ว`);
    if (isNew) db.candidates.push(stamp({ ...rules.CLEARED_INTERVIEW, holdUntil: null, ...record, createdAt: new Date().toISOString() }));
    else put(record);
    save();
    return record;
  },
  async deleteCandidate(id) {
    requireSession('admin');
    db.candidates = db.candidates.filter((x) => x.id !== id);
    save();
  },
  async importCandidates(records) {
    requireSession('admin');
    const byId = new Map(db.candidates.map((c) => [c.id, c]));
    const now = new Date().toISOString();
    records.forEach((r) => {
      const old = byId.get(r.id);
      byId.set(r.id, stamp({ ...rules.CLEARED_INTERVIEW, holdUntil: null, createdAt: now, ...(old || {}), ...r }));
    });
    db.candidates = [...byId.values()];
    save();
    return records.length;
  },
  async listUsers() { requireSession('admin'); return db.users.slice(); },
  async setUserActive(id, active) {
    const s = requireSession('admin');
    if (id === s.userId && !active) throw new Error('ปิดใช้งานบัญชีที่กำลังใช้อยู่ไม่ได้');
    db.users = db.users.map((u) => (u.id === id ? { ...u, active } : u));
    save();
  },
  async updateUser(id, patch) {
    requireSession('admin');
    db.users = db.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    save();
  },
  async setPassword(user) {
    requireSession('admin');
    return 'โหมดสาธิตไม่ตรวจรหัสผ่าน จึงไม่ได้บันทึกรหัสผ่านของ ' + user.username;
  },

  // ---- notifications ----
  async listNotifications() {
    const s = requireSession();
    const me = s.role === 'admin' ? 'HRS' : s.unit;
    return db.notifications.filter((n) => n.recipient === me).slice(0, 50);
  },
  async markNotificationsRead(ids) {
    requireSession();
    const set = new Set(ids);
    const now = new Date().toISOString();
    db.notifications = db.notifications.map((n) => (set.has(n.id) && !n.readAt ? { ...n, readAt: now } : n));
    save();
  },

  async resetDemoData() { db = fresh(); save(); }
};

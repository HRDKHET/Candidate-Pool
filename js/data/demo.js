// Demo store: everything lives in this browser's localStorage. Passwords are not
// checked. Use only to try the workflow — never with real candidate data.
import { SEED_CANDIDATES, SEED_USERS } from './seed.js';
import { POOL, UNITS } from '../ui.js';
import * as rules from './rules.js';

const KEY = 'candidate-pool-demo-v1';
const SESSION_KEY = 'candidate-pool-demo-session';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked: fall through to fresh data */ }
  return { candidates: structuredClone(SEED_CANDIDATES), users: structuredClone(SEED_USERS) };
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

export const demoStore = {
  mode: 'demo',
  usernameLabel: 'ชื่อผู้ใช้',

  async getSession() { return session; },

  async signIn({ role, unit, username }) {
    const name = (username || '').trim().toLowerCase();
    const expected = role === 'admin' ? 'admin-hr' : String(unit).toLowerCase();
    if (name && name !== expected) throw new Error(`โหมดสาธิต: ใช้ชื่อผู้ใช้ ${expected} สำหรับบัญชีนี้`);
    const u = db.users.find((x) => x.id === expected);
    if (!u) throw new Error('ไม่พบบัญชีนี้');
    if (!u.active) throw new Error('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อ Admin (HR)');
    session = { userId: u.id, username: u.username, role: u.role, unit: u.unit };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
    return session;
  },

  async signOut() {
    session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  },

  // Visibility mirrors the server policy: admin sees all, a PJT sees the central pool and its own pool.
  async listCandidates() {
    const s = requireSession();
    const all = db.candidates.slice().sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    if (s.role === 'admin') return all;
    return all.filter((c) => c.location === POOL || c.location === s.unit);
  },

  async pick(id) { const s = requireSession('pjt'); return put(rules.pjtPick(find(id), s.unit)); },
  async returnToPool(id) { const s = requireSession('pjt'); return put(rules.pjtReturn(find(id), s.unit)); },
  async setDecision(id, decision) {
    const s = requireSession();
    const c = find(id);
    if (s.role === 'admin') { rules.assertDecision(decision); return put({ ...c, decision }); }
    return put(rules.pjtDecide(c, s.unit, decision));
  },
  async schedule(id, data) {
    const s = requireSession();
    const c = find(id);
    return put(rules.pjtSchedule(c, s.role === 'admin' ? c.location : s.unit, data));
  },

  // ---- admin only ----
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
    if (isNew) db.candidates.push(stamp(record)); else put(record);
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
    records.forEach((r) => byId.set(r.id, stamp({ ...(byId.get(r.id) || {}), ...r })));
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
  async resetPassword() {
    requireSession('admin');
    return 'โหมดสาธิตไม่มีรหัสผ่าน จึงไม่มีการส่งลิงก์รีเซ็ต';
  },
  async resetDemoData() {
    db = { candidates: structuredClone(SEED_CANDIDATES), users: structuredClone(SEED_USERS) };
    save();
  }
};

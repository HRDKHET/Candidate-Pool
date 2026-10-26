// Site configuration. This file is public on GitHub Pages: never put secrets here.
// The Supabase publishable key is designed to be public; access is enforced by the
// row-level security policies in supabase/*.sql.
export const CONFIG = {
  // 'demo'     — data lives in this browser only (localStorage); passwords are not checked.
  // 'supabase' — real sign-in and shared data.
  mode: 'supabase',
  supabaseUrl: 'https://esmrkunaaakebftfzfrt.supabase.co',
  supabaseAnonKey: 'sb_publishable_--WHEjolLcH779mubY6-ZA_5j1fHLDG',

  // HR team name shown in the UI.
  hrsName: 'HRS',

  // ฝ่าย › แผนก. Each แผนก (unit) is one login account and one candidate pool.
  // The live list is managed by HRS on the "ผู้ใช้และสิทธิ์" page and stored in the
  // database; this is only the starting set (demo mode, or before 005 is run).
  divisions: [
    { id: 'project', name: 'ฝ่ายโครงการ', units: ['PJT-PD-1', 'PJT-PD-2', 'PJT-PD-3', 'PJT-PD-4'] }
  ],

  // People pick an account and type only a password. Supabase still needs an email
  // per account, so each account has a fixed internal address (never shown, never mailed):
  // the HRS account below, and "<unit code in lower case>@<accountDomain>" for every unit.
  hrsAccount: 'admin-hr@candidate-pool.local',
  accountDomain: 'candidate-pool.local',
  minPasswordLength: 8,

  // A unit that picks a candidate must decide within this many hours, otherwise the
  // candidate goes back to the Candidate Pool. Keep in sync with supabase/004_*.sql.
  holdHours: 72,
  // Candidates added within this many days show a "New" badge.
  newDays: 3
};

export const accountEmail = (role, unit) =>
  role === 'admin' ? CONFIG.hrsAccount : `${String(unit).toLowerCase()}@${CONFIG.accountDomain}`;

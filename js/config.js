// Site configuration. This file is public on GitHub Pages: never put secrets here.
// The Supabase publishable key is designed to be public; access is enforced by the
// row-level security policies in supabase/schema.sql.
export const CONFIG = {
  // 'demo'     — data lives in this browser only (localStorage); passwords are not checked.
  // 'supabase' — real sign-in and shared data.
  mode: 'supabase',
  supabaseUrl: 'https://esmrkunaaakebftfzfrt.supabase.co',
  supabaseAnonKey: 'sb_publishable_--WHEjolLcH779mubY6-ZA_5j1fHLDG',

  units: ['PJT-PD-1', 'PJT-PD-2', 'PJT-PD-3', 'PJT-PD-4'],

  // People pick an account and type only a password. Supabase still needs an email
  // per account, so each account has a fixed internal address (never shown, never mailed).
  // Create these exact addresses in Supabase › Authentication › Users.
  accounts: {
    admin: 'admin-hr@candidate-pool.local',
    'PJT-PD-1': 'pjt-pd-1@candidate-pool.local',
    'PJT-PD-2': 'pjt-pd-2@candidate-pool.local',
    'PJT-PD-3': 'pjt-pd-3@candidate-pool.local',
    'PJT-PD-4': 'pjt-pd-4@candidate-pool.local'
  },
  minPasswordLength: 8
};

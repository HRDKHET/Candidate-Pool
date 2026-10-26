// Site configuration. This file is public on GitHub Pages: never put secrets here.
// The Supabase "anon" key is designed to be public; access is enforced by the
// row-level security policies in supabase/schema.sql.
export const CONFIG = {
  // 'demo'     — data lives in this browser only (localStorage); passwords are not checked.
  // 'supabase' — real sign-in and shared data. Fill in the two values below.
  mode: 'supabase',
  supabaseUrl: 'https://esmrkunaaakebftfzfrt.supabase.co',
  supabaseAnonKey: 'sb_publishable_--WHEjolLcH779mubY6-ZA_5j1fHLDG',  // Project Settings › API Keys › publishable key (sb_publishable_…) or legacy anon key

  units: ['PJT-PD-1', 'PJT-PD-2', 'PJT-PD-3', 'PJT-PD-4']
};

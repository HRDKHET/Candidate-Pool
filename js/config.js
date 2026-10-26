// Site configuration. This file is public on GitHub Pages: never put secrets here.
// The Supabase "anon" key is designed to be public; access is enforced by the
// row-level security policies in supabase/schema.sql.
export const CONFIG = {
  // 'demo'     — data lives in this browser only (localStorage); passwords are not checked.
  // 'supabase' — real sign-in and shared data. Fill in the two values below.
  mode: 'demo',
  supabaseUrl: '',      // e.g. https://xxxxxxxx.supabase.co
  supabaseAnonKey: '',  // Project Settings › API › anon public key

  units: ['PJT-PD-1', 'PJT-PD-2', 'PJT-PD-3', 'PJT-PD-4']
};

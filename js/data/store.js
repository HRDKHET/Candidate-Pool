import { CONFIG } from '../config.js';
import { demoStore } from './demo.js';
import { supabaseStore } from './supabase.js';

export const store = CONFIG.mode === 'supabase' ? supabaseStore : demoStore;

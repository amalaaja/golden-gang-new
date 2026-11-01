import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Inisialisasi Supabase Client
// Menggunakan dummy URL jika belum diisi agar Next.js tidak crash saat build
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://dummyprojectid.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'dummy-anon-key-for-build-only'
);

// Helper agar eksekusi Supabase non-blocking dan kompatibel TypeScript Next.js
export const safeSupabase = (promiseLike: any) => {
  if (promiseLike && typeof promiseLike.then === 'function') {
    promiseLike.then(() => {}, (err: any) => {
      if (err) console.warn("Supabase background op:", err);
    });
  }
};

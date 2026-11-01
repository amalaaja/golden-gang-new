# Panduan Deploy ke Vercel & Koneksi Supabase

## 1. Setup Database di Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com).
2. Buat proyek baru (*New Project*).
3. Buka menu **SQL Editor** di sidebar kiri.
4. Klik **New Query**, lalu salin seluruh isi file [`supabase_schema.sql`](file:///C:/Users/Asus/.gemini/antigravity/scratch/golden-gang-app/supabase_schema.sql) dan klik **Run**.
   > Schema ini otomatis membuat tabel `users`, `items`, `transactions`, `gang_stats`, mengatur RLS Policy publik, serta mengaktifkan Realtime WebSockets.
5. Pergi ke **Project Settings** -> **API**:
   - Salin **Project URL** (`https://xxx.supabase.co`).
   - Salin **Project API Keys** bagian **`anon` / `public`**.

---

## 2. Deploy ke Vercel
1. Masuk ke [Vercel Dashboard](https://vercel.com).
2. Klik **Add New...** -> **Project**.
3. Import repository GitHub dari proyek ini (atau upload folder ini).
4. Di bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL dari Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Anon Public Key dari Supabase)
5. Klik **Deploy**!

---

## 3. Akun Admin Pertama
- Karena database sudah dikosongkan secara bersih, **orang pertama yang mendaftar di sistem akan otomatis menjadi Admin Utama (Status: Approved)** dan bisa langsung login.
- Anggota berikutnya yang mendaftar akan berstatus **Member (Pending)** dan harus di-ACC terlebih dahulu melalui menu **Data Member** oleh Admin.
- Atau, Anda juga dapat meng-uncomment baris pembuatan akun admin bawaan (`alvaro` / `112233`) pada file `supabase_schema.sql` sebelum menjalankannya di SQL Editor.

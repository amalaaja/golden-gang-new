-- ========================================================
-- GOLDEN GANG SYNDICATE - SUPABASE DATABASE SCHEMA (FIXED)
-- ========================================================
-- Jalankan seluruh script SQL ini di:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ========================================================

-- 1. Table Pengguna (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  ic_name TEXT DEFAULT '',
  password TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'pending',
  white_money NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table Brankas & Barang (items)
CREATE TABLE IF NOT EXISTS public.items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'ITEM',
  vault TEXT DEFAULT 'Brankas Utama',
  stock INTEGER DEFAULT 0,
  in_shop BOOLEAN DEFAULT false,
  price NUMERIC DEFAULT 0,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table Transaksi & Mutasi Ledger (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  "user" TEXT NOT NULL,
  asset TEXT,
  details TEXT,
  items TEXT,
  amount NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at_ms BIGINT DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  rejected_by TEXT
);

-- 4. Table Kas & Statistik Faksi (gang_stats)
CREATE TABLE IF NOT EXISTS public.gang_stats (
  id TEXT PRIMARY KEY DEFAULT 'main',
  dirty_money NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inisialisasi kas awal (Rp 0 / Bersih)
INSERT INTO public.gang_stats (id, dirty_money)
VALUES ('main', 0)
ON CONFLICT (id) DO NOTHING;

-- 5. Nonaktifkan RLS agar Anon API Key bebas membaca & menulis data
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gang_stats DISABLE ROW LEVEL SECURITY;

-- 6. Daftarkan tabel ke Realtime Replication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'gang_stats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gang_stats;
  END IF;
END $$;

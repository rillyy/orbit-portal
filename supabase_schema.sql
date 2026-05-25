-- ============================================================================
-- ORBIT FINAL 3.0 — SUPABASE SCHEMA KONSOLIDASI (PROJECT SUPABASE YANG SAMA)
-- Portal Pegawai Teladan — BPS Provinsi Sulawesi Utara
-- ============================================================================
--
-- FUNGSI FILE INI
--   File tunggal ini menggantikan kumpulan schema/patch pengembangan ORBIT
--   yang pernah dijalankan sebelumnya. File ini digunakan untuk:
--   (1) menyelaraskan project Supabase yang saat ini sudah dipakai; dan
--   (2) menjadi dokumentasi schema final saat project tersebut diserahkan
--       kepada pihak BPS.
--
-- PENTING UNTUK SERAH TERIMA
--   Karena BPS akan memakai PROJECT SUPABASE YANG SAMA, jalankan file ini
--   satu kali oleh pengembang/PIC sebelum serah terima. Setelah berhasil,
--   pihak BPS menerima file ini sebagai referensi schema final, tetapi tidak
--   perlu menjalankannya kembali pada project yang sama.
--
-- FLOW FINAL YANG DIKUNCI
--   1. Admin menginput nilai pegawai setiap bulan.
--   2. Menu Nominasi Per Tim menampilkan pemenang nilai BULANAN pada masing-
--      masing tim: Umum, Sosial, Produksi, Nerwilis, IPDS, Distribusi.
--   3. Dalam satu triwulan, Admin memilih nilai tertinggi dari maksimal tiga
--      pemenang bulanan pada setiap tim.
--   4. Nominasi Final wajib berisi tepat enam kandidat: satu kandidat per tim.
--   5. Enam kandidat dikirim ke Juri.
--   6. Juri mengisi nilai masing-masing kandidat menggunakan akun sendiri.
--   7. Admin mengirim ranking hasil Juri kepada Verifikator.
--   8. Verifikator menetapkan SATU pemenang akhir per triwulan atau
--      mengembalikan proses kepada Admin dengan alasan.
--
-- TIDAK DIGUNAKAN PADA FLOW FINAL
--   - Tidak ada rata-rata nilai bulanan untuk memilih nominasi.
--     (Rata-rata hanya dipakai untuk menggabungkan nilai ANTAR-JURI.)
--   - Tidak ada indikator kelengkapan 1/16 atau 1/24 di panel nominasi.
--   - Tidak ada fitur "Tutup Penilaian Bulan".
--   - Tidak ada fitur "Override Nilai" Admin.
--   - Tidak ada akun atau data contoh yang ditambahkan otomatis.
--   - Storage tidak dibuat public.
--
-- KEAMANAN DATA SAAT SCRIPT DIJALANKAN
--   - Tidak menghapus users, pegawai, nilai_final, nominasi_final, penilaian,
--     history_penghargaan, sertifikat, dokumen storage, atau akun auth.users.
--   - Tabel legacy seperti public.kipapp (jika sudah ada) tidak digunakan UI
--     final, tetapi tidak dihapus otomatis agar data lama tetap aman.
--   - Function/policy lama yang bertentangan dengan flow final dibersihkan
--     dan diganti dengan function/policy final.
--
-- SEBELUM MENJALANKAN
--   1. Export/backup database dan file Storage terlebih dahulu.
--   2. Pastikan Anda menjalankan pada project Supabase ORBIT yang benar.
--   3. Jalankan seluruh file ini sekaligus dari baris pertama sampai terakhir.
--   4. Setelah SUCCESS, jalankan file cek_setelah_schema_final_orbit_3_0.sql.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 0. PENANDA VERSI SCHEMA
--    Tabel teknis ini tidak perlu dibaca dari frontend.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orbit_schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.orbit_schema_migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. USERS, PEGAWAI, DAN JURI
-- ============================================================================

-- USERS = akun yang dapat login ke aplikasi. Kolom auth_id menghubungkan
-- profil aplikasi dengan akun Supabase Authentication.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pegawai',
  tim TEXT NOT NULL DEFAULT 'Umum',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tim TEXT DEFAULT 'Umum';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Constraint check lama dilepas dahulu karena schema awal dapat belum mengenal
-- role pegawai/status pending yang diperlukan Sign Up final.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.users'::regclass AND contype='c'
      AND (pg_get_constraintdef(oid) ILIKE '%role%'
           OR pg_get_constraintdef(oid) ILIKE '%tim%'
           OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

-- Data lama dinormalisasi hanya bila nilainya berada di luar pilihan final.
UPDATE public.users SET role='pegawai'
WHERE role IS NULL OR role NOT IN ('admin','juri','verifikator','pegawai');
UPDATE public.users SET tim='Umum'
WHERE tim IS NULL OR tim NOT IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi');
UPDATE public.users SET status='aktif'
WHERE status IS NULL OR status NOT IN ('pending','aktif','nonaktif');

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'pegawai';
ALTER TABLE public.users ALTER COLUMN tim SET DEFAULT 'Umum';
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.users ADD CONSTRAINT users_role_final_check
  CHECK (role IN ('admin','juri','verifikator','pegawai'));
ALTER TABLE public.users ADD CONSTRAINT users_tim_final_check
  CHECK (tim IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'));
ALTER TABLE public.users ADD CONSTRAINT users_status_final_check
  CHECK (status IN ('pending','aktif','nonaktif'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id_unique
  ON public.users(auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role,status);

-- PEGAWAI = master pegawai yang dinilai. Pegawai tidak wajib punya akun login.
CREATE TABLE IF NOT EXISTS public.pegawai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nip TEXT,
  nama TEXT NOT NULL,
  tim TEXT NOT NULL,
  jabatan TEXT,
  status TEXT NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE public.pegawai ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.pegawai'::regclass AND contype='c'
      AND (pg_get_constraintdef(oid) ILIKE '%tim%'
           OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.pegawai DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

UPDATE public.pegawai SET tim='Umum'
WHERE tim IS NULL OR tim NOT IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi');
UPDATE public.pegawai SET status='aktif'
WHERE status IS NULL OR status NOT IN ('aktif','nonaktif');

ALTER TABLE public.pegawai ALTER COLUMN status SET DEFAULT 'aktif';
ALTER TABLE public.pegawai ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.pegawai ADD CONSTRAINT pegawai_tim_final_check
  CHECK (tim IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'));
ALTER TABLE public.pegawai ADD CONSTRAINT pegawai_status_final_check
  CHECK (status IN ('aktif','nonaktif'));

-- Index user_id dibuat unik hanya jika data existing tidak memiliki duplikasi.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT user_id FROM public.pegawai
    WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*)>1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pegawai_user_id_unique
      ON public.pegawai(user_id) WHERE user_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'pegawai.user_id masih memiliki duplikasi; unique index belum dipasang dan perlu ditinjau PIC.';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pegawai_tim_status ON public.pegawai(tim,status);

-- JURI = profil Juri yang bersumber dari user ber-role juri.
-- user_id tetap nullable untuk menjaga juri legacy yang belum tertaut akun.
CREATE TABLE IF NOT EXISTS public.juri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  tim TEXT NOT NULL DEFAULT 'Umum',
  status TEXT NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.juri ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.juri ADD COLUMN IF NOT EXISTS tim TEXT DEFAULT 'Umum';
ALTER TABLE public.juri ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.juri ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.juri'::regclass AND contype='c'
      AND (pg_get_constraintdef(oid) ILIKE '%tim%'
           OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.juri DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

UPDATE public.juri SET tim='Umum'
WHERE tim IS NULL OR tim NOT IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi');
UPDATE public.juri SET status='aktif'
WHERE status IS NULL OR status NOT IN ('aktif','nonaktif');

ALTER TABLE public.juri ADD CONSTRAINT juri_tim_final_check
  CHECK (tim IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'));
ALTER TABLE public.juri ADD CONSTRAINT juri_status_final_check
  CHECK (status IN ('aktif','nonaktif'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT user_id FROM public.juri
    WHERE user_id IS NOT NULL GROUP BY user_id HAVING COUNT(*)>1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_juri_user_id_unique
      ON public.juri(user_id) WHERE user_id IS NOT NULL;
  ELSE
    RAISE NOTICE 'juri.user_id masih memiliki duplikasi; status Juri perlu ditinjau PIC.';
  END IF;
END $$;

-- ============================================================================
-- 2. NILAI BULANAN, NOMINASI FINAL, PENILAIAN JURI, DAN ARSIP PEMENANG
-- ============================================================================

-- PERIODE_BULANAN hanya berfungsi sebagai referensi input/arsip.
-- Tidak terdapat proses "tutup bulan" pada flow final.
CREATE TABLE IF NOT EXISTS public.periode_bulanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_bulan DATE NOT NULL UNIQUE,
  tahun INTEGER NOT NULL,
  triwulan INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'terbuka',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE public.periode_bulanan SET status='terbuka'
WHERE status IS NULL OR status NOT IN ('terbuka','arsip');

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.periode_bulanan'::regclass AND contype='c'
      AND (pg_get_constraintdef(oid) ILIKE '%triwulan%'
           OR pg_get_constraintdef(oid) ILIKE '%status%')
  LOOP
    EXECUTE format('ALTER TABLE public.periode_bulanan DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

ALTER TABLE public.periode_bulanan ADD CONSTRAINT periode_triwulan_final_check
  CHECK (triwulan BETWEEN 1 AND 4);
ALTER TABLE public.periode_bulanan ADD CONSTRAINT periode_status_final_check
  CHECK (status IN ('terbuka','arsip'));

-- NILAI_FINAL tetap memakai nama tabel lama agar sesuai index.html.
-- Pada flow final, tabel ini menyimpan NILAI BULANAN.
CREATE TABLE IF NOT EXISTS public.nilai_final (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pegawai_id UUID NOT NULL REFERENCES public.pegawai(id) ON DELETE RESTRICT,
  tim TEXT,
  nilai NUMERIC NOT NULL,
  jumlah_kipapp INTEGER NOT NULL DEFAULT 0,
  total_nilai NUMERIC NOT NULL,
  periode_bulan DATE NOT NULL,
  triwulan INTEGER,
  tahun INTEGER,
  periode TEXT,
  status TEXT DEFAULT 'draft',
  mode_rekam TEXT NOT NULL DEFAULT 'operasional',
  status_bulanan TEXT NOT NULL DEFAULT 'input',
  input_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pegawai_id,periode_bulan)
);

ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS mode_rekam TEXT DEFAULT 'operasional';
ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS status_bulanan TEXT DEFAULT 'input';
ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS input_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS updated_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
ALTER TABLE public.nilai_final ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Lengkapi kolom turunan dari data pegawai/periode yang sudah ada.
UPDATE public.nilai_final nf
SET tim=pg.tim
FROM public.pegawai pg
WHERE nf.pegawai_id=pg.id AND (nf.tim IS NULL OR nf.tim NOT IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'));

UPDATE public.nilai_final
SET triwulan=EXTRACT(QUARTER FROM periode_bulan)::INTEGER,
    tahun=EXTRACT(YEAR FROM periode_bulan)::INTEGER,
    periode='Triwulan '||EXTRACT(QUARTER FROM periode_bulan)::INTEGER
WHERE periode_bulan IS NOT NULL
  AND (triwulan IS NULL OR tahun IS NULL OR periode IS NULL);

UPDATE public.nilai_final SET mode_rekam='operasional'
WHERE mode_rekam IS NULL OR mode_rekam NOT IN ('operasional','arsip');

-- Flow lama draft/final/ditutup pada status_bulanan dibersihkan menjadi input/arsip.
ALTER TABLE public.nilai_final DROP CONSTRAINT IF EXISTS nilai_final_status_bulanan_check;
UPDATE public.nilai_final
SET status_bulanan=CASE WHEN mode_rekam='arsip' THEN 'arsip' ELSE 'input' END;
ALTER TABLE public.nilai_final ALTER COLUMN status_bulanan SET DEFAULT 'input';
ALTER TABLE public.nilai_final ADD CONSTRAINT nilai_final_status_bulanan_check
  CHECK (status_bulanan IN ('input','arsip'));

ALTER TABLE public.nilai_final DROP CONSTRAINT IF EXISTS nilai_final_mode_rekam_check;
ALTER TABLE public.nilai_final ADD CONSTRAINT nilai_final_mode_rekam_check
  CHECK (mode_rekam IN ('operasional','arsip'));

CREATE INDEX IF NOT EXISTS idx_nilai_final_pegawai ON public.nilai_final(pegawai_id);
CREATE INDEX IF NOT EXISTS idx_nilai_final_periode_tim
  ON public.nilai_final(tahun,triwulan,tim,periode_bulan);

-- Membuat referensi periode dari data nilai existing tanpa menghapus data.
INSERT INTO public.periode_bulanan(periode_bulan,tahun,triwulan,status)
SELECT DISTINCT nf.periode_bulan,nf.tahun,nf.triwulan,
  CASE WHEN nf.mode_rekam='arsip' THEN 'arsip' ELSE 'terbuka' END
FROM public.nilai_final nf
WHERE nf.periode_bulan IS NOT NULL AND nf.tahun IS NOT NULL AND nf.triwulan IS NOT NULL
ON CONFLICT (periode_bulan) DO NOTHING;

-- NOMINASI_FINAL = enam kandidat yang dipilih Admin dan sedang/dahulu diproses.
CREATE TABLE IF NOT EXISTS public.nominasi_final (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pegawai_id UUID NOT NULL REFERENCES public.pegawai(id) ON DELETE RESTRICT,
  tim TEXT,
  nilai_awal NUMERIC,
  total_nilai NUMERIC,
  periode_bulan DATE,
  bulan_sumber DATE,
  triwulan INTEGER,
  tahun INTEGER,
  status_alur TEXT NOT NULL DEFAULT 'juri',
  catatan_verifikator TEXT,
  dikirim_juri_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dikirim_verifikator_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS nilai_awal NUMERIC;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS total_nilai NUMERIC;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS periode_bulan DATE;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS bulan_sumber DATE;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS triwulan INTEGER;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS tahun INTEGER;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS status_alur TEXT DEFAULT 'juri';
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS catatan_verifikator TEXT;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS dikirim_juri_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS dikirim_verifikator_at TIMESTAMPTZ;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.nominasi_final ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.nominasi_final n
SET tim=pg.tim
FROM public.pegawai pg
WHERE n.pegawai_id=pg.id AND (n.tim IS NULL OR n.tim NOT IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'));

UPDATE public.nominasi_final
SET bulan_sumber=COALESCE(bulan_sumber,periode_bulan),
    status_alur=CASE
      WHEN status_alur IN ('juri','verifikasi','dikembalikan','selesai') THEN status_alur
      ELSE 'juri'
    END;

ALTER TABLE public.nominasi_final DROP CONSTRAINT IF EXISTS nominasi_final_status_alur_check;
ALTER TABLE public.nominasi_final ADD CONSTRAINT nominasi_final_status_alur_check
  CHECK (status_alur IN ('juri','verifikasi','dikembalikan','selesai'));

-- Unique lama yang melarang pegawai dicalonkan lagi pada triwulan berbeda tidak digunakan.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.nominasi_final'::regclass AND contype='u'
      AND pg_get_constraintdef(oid) ILIKE '%(pegawai_id)%'
  LOOP
    EXECUTE format('ALTER TABLE public.nominasi_final DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

-- Hapus unique INDEX legacy satu-kolom bila pernah dibuat bukan sebagai constraint.
DROP INDEX IF EXISTS public.idx_nominasi_pegawai_unique;
DROP INDEX IF EXISTS public.nominasi_final_pegawai_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT pegawai_id,triwulan,tahun FROM public.nominasi_final
    WHERE triwulan IS NOT NULL AND tahun IS NOT NULL
    GROUP BY pegawai_id,triwulan,tahun HAVING COUNT(*)>1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_nominasi_pegawai_periode_unique
      ON public.nominasi_final(pegawai_id,triwulan,tahun)
      WHERE triwulan IS NOT NULL AND tahun IS NOT NULL;
  ELSE
    RAISE NOTICE 'Duplikasi nominasi legacy ditemukan; unique index kandidat/periode belum dipasang.';
  END IF;
END $$;

-- PENILAIAN = nilai masing-masing Juri terhadap enam nominasi.
-- juri_id memakai TEXT agar kompatibel dengan struktur lama yang sudah dipakai.
CREATE TABLE IF NOT EXISTS public.penilaian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nominasi_id UUID REFERENCES public.nominasi_final(id) ON DELETE CASCADE,
  pegawai_id UUID NOT NULL REFERENCES public.pegawai(id) ON DELETE RESTRICT,
  juri_id TEXT NOT NULL,
  total_nilai NUMERIC NOT NULL,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.penilaian ADD COLUMN IF NOT EXISTS nominasi_id UUID REFERENCES public.nominasi_final(id) ON DELETE CASCADE;
ALTER TABLE public.penilaian ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.penilaian ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- juri_id diseragamkan menjadi TEXT agar kompatibel dengan data lama dan RPC
-- Final 3.0. FK juri_id lama (bila pernah dibuat sebagai UUID) dilepas karena
-- validasi Juri sekarang dilakukan melalui current_juri_id() dan RLS.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.penilaian'::regclass AND contype='f'
      AND pg_get_constraintdef(oid) ILIKE '%juri_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.penilaian DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;
ALTER TABLE public.penilaian ALTER COLUMN juri_id TYPE TEXT USING juri_id::TEXT;

-- Tautkan penilaian lama ke nominasi terbarunya bila kolom nominasi_id
-- sebelumnya belum tersedia. Data tetap dipertahankan.
WITH pasangan AS (
  SELECT DISTINCT ON (p0.id)
    p0.id AS penilaian_id,
    n.id AS nominasi_id
  FROM public.penilaian p0
  JOIN public.nominasi_final n ON n.pegawai_id=p0.pegawai_id
  WHERE p0.nominasi_id IS NULL
  ORDER BY p0.id,n.created_at DESC,n.id
)
UPDATE public.penilaian p
SET nominasi_id=pasangan.nominasi_id
FROM pasangan
WHERE p.id=pasangan.penilaian_id AND p.nominasi_id IS NULL;

-- Constraint lama pegawai_id+juri_id dapat menghambat nominasi periode baru.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='public.penilaian'::regclass AND contype='u'
      AND pg_get_constraintdef(oid) ILIKE '%pegawai_id%'
      AND pg_get_constraintdef(oid) ILIKE '%juri_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.penilaian DROP CONSTRAINT IF EXISTS %I',c.conname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_penilaian_nominasi ON public.penilaian(nominasi_id);
CREATE INDEX IF NOT EXISTS idx_penilaian_pegawai ON public.penilaian(pegawai_id);

-- HISTORY_PENGHARGAAN = arsip hasil keputusan Verifikator.
CREATE TABLE IF NOT EXISTS public.history_penghargaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nominasi_id UUID REFERENCES public.nominasi_final(id) ON DELETE SET NULL,
  pegawai_id UUID REFERENCES public.pegawai(id) ON DELETE SET NULL,
  nama TEXT NOT NULL,
  tim TEXT,
  total_nilai NUMERIC,
  triwulan INTEGER,
  tahun INTEGER,
  periode_label TEXT,
  ditetapkan_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.history_penghargaan ADD COLUMN IF NOT EXISTS nominasi_id UUID REFERENCES public.nominasi_final(id) ON DELETE SET NULL;
ALTER TABLE public.history_penghargaan ADD COLUMN IF NOT EXISTS ditetapkan_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT tahun,triwulan FROM public.history_penghargaan
    WHERE tahun IS NOT NULL AND triwulan IS NOT NULL
    GROUP BY tahun,triwulan HAVING COUNT(*)>1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_history_satu_pemenang_per_triwulan
      ON public.history_penghargaan(tahun,triwulan)
      WHERE tahun IS NOT NULL AND triwulan IS NOT NULL;
  ELSE
    RAISE NOTICE 'Arsip legacy memiliki pemenang ganda dalam satu triwulan; fungsi final mencegah tambahan pemenang baru, tetapi data lama perlu ditinjau PIC.';
  END IF;
END $$;

-- ============================================================================
-- 3. DOKUMEN, SERTIFIKAT, NOTIFIKASI, AUDIT, DAN KOREKSI
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.excel_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.excel_uploads ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.sertifikat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pegawai_id UUID NOT NULL REFERENCES public.pegawai(id) ON DELETE RESTRICT,
  history_id UUID REFERENCES public.history_penghargaan(id) ON DELETE SET NULL,
  triwulan INTEGER,
  tahun INTEGER,
  file_name TEXT,
  file_path TEXT,
  file_url TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sertifikat ADD COLUMN IF NOT EXISTS history_id UUID REFERENCES public.history_penghargaan(id) ON DELETE SET NULL;
ALTER TABLE public.sertifikat ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.sertifikat ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.sertifikat ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.notifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  role_target TEXT NOT NULL DEFAULT 'semua',
  tipe TEXT NOT NULL DEFAULT 'info',
  deadline DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifikasi ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

UPDATE public.notifikasi SET role_target='semua'
WHERE role_target IS NULL OR role_target NOT IN ('pegawai','juri','verifikator','semua');
UPDATE public.notifikasi SET tipe='info'
WHERE tipe IS NULL OR tipe NOT IN ('info','deadline','warning','success');

ALTER TABLE public.notifikasi DROP CONSTRAINT IF EXISTS notifikasi_role_target_check;
ALTER TABLE public.notifikasi DROP CONSTRAINT IF EXISTS notifikasi_tipe_check;
ALTER TABLE public.notifikasi ADD CONSTRAINT notifikasi_role_target_check
  CHECK (role_target IN ('pegawai','juri','verifikator','semua'));
ALTER TABLE public.notifikasi ADD CONSTRAINT notifikasi_tipe_check
  CHECK (tipe IN ('info','deadline','warning','success'));

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  aksi TEXT NOT NULL,
  entitas TEXT NOT NULL,
  referensi_id UUID,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS referensi_id UUID;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS detail JSONB DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS public.permintaan_koreksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe TEXT NOT NULL DEFAULT 'proses_verifikasi',
  referensi_id UUID,
  tahun INTEGER,
  triwulan INTEGER,
  alasan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu',
  dibuat_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL,
  diputuskan_oleh UUID REFERENCES public.users(id) ON DELETE SET NULL,
  keputusan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

UPDATE public.permintaan_koreksi SET tipe='proses_verifikasi'
WHERE tipe IS NULL OR tipe NOT IN ('nilai_bulanan','hasil_juri','proses_verifikasi');
UPDATE public.permintaan_koreksi SET status='menunggu'
WHERE status IS NULL OR status NOT IN ('menunggu','disetujui','ditolak','selesai');

ALTER TABLE public.permintaan_koreksi DROP CONSTRAINT IF EXISTS permintaan_koreksi_tipe_check;
ALTER TABLE public.permintaan_koreksi DROP CONSTRAINT IF EXISTS permintaan_koreksi_status_check;
ALTER TABLE public.permintaan_koreksi ADD CONSTRAINT permintaan_koreksi_tipe_check
  CHECK (tipe IN ('nilai_bulanan','hasil_juri','proses_verifikasi'));
ALTER TABLE public.permintaan_koreksi ADD CONSTRAINT permintaan_koreksi_status_check
  CHECK (status IN ('menunggu','disetujui','ditolak','selesai'));

-- Legacy yang tidak dipakai UI final sengaja tidak dihapus:
--   public.kipapp (bila pernah dibuat pada schema awal).
-- Penghapusan fisik tabel legacy hanya boleh dilakukan setelah backup dan
-- peninjauan manual pihak BPS/PIC.

-- ============================================================================
-- 4. MEMBERSIHKAN FUNCTION LEGACY YANG TIDAK DIPAKAI
-- ============================================================================

-- Policies lama dibersihkan terlebih dahulu agar tidak mempertahankan akses
-- terbuka dan tidak menjadi dependency saat function diganti.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname,tablename,policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'users','pegawai','juri','periode_bulanan','nilai_final',
        'nominasi_final','penilaian','history_penghargaan',
        'excel_uploads','sertifikat','notifikasi','audit_log',
        'permintaan_koreksi','orbit_schema_migrations'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
  END LOOP;
END $$;

-- Fungsi flow lama yang tidak lagi diperlukan/dapat membingungkan.
DROP FUNCTION IF EXISTS public.tutup_penilaian_bulan(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_status_periode_bulan(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.simpan_override_nilai(UUID,NUMERIC,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.orbit_wita_today() CASCADE;
DROP FUNCTION IF EXISTS public.kirim_nominasi_ke_juri(DATE,UUID[]) CASCADE;

-- RPC dengan RETURNS TABLE di-drop sebelum dibuat ulang agar tidak menimbulkan
-- error "cannot change return type of existing function".
DROP FUNCTION IF EXISTS public.get_daftar_juri_status() CASCADE;
DROP FUNCTION IF EXISTS public.get_kalender_operasional() CASCADE;
DROP FUNCTION IF EXISTS public.simpan_nilai_bulanan_realtime(UUID,NUMERIC,INTEGER,DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_nominasi_bulanan_per_tim(INTEGER,INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_kandidat_nominasi_triwulan(INTEGER,INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.kirim_nominasi_ke_juri(INTEGER,INTEGER,UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.simpan_penilaian_juri(UUID,NUMERIC,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.hapus_penilaian_juri(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_ranking_live() CASCADE;
DROP FUNCTION IF EXISTS public.kirim_ranking_ke_verifikator() CASCADE;
DROP FUNCTION IF EXISTS public.tetapkan_pemenang(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.kembalikan_ke_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.buka_kembali_setelah_koreksi() CASCADE;
DROP FUNCTION IF EXISTS public.reset_penilaian_baru() CASCADE;

-- ============================================================================
-- 5. TRIGGER UPDATED_AT, AUTH SIGN UP, DAN SINKRONISASI ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.updated_at=NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pegawai_updated_at ON public.pegawai;
CREATE TRIGGER trg_pegawai_updated_at BEFORE UPDATE ON public.pegawai
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_juri_updated_at ON public.juri;
CREATE TRIGGER trg_juri_updated_at BEFORE UPDATE ON public.juri
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_nilai_updated_at ON public.nilai_final;
CREATE TRIGGER trg_nilai_updated_at BEFORE UPDATE ON public.nilai_final
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_nominasi_updated_at ON public.nominasi_final;
CREATE TRIGGER trg_nominasi_updated_at BEFORE UPDATE ON public.nominasi_final
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_penilaian_updated_at ON public.penilaian;
CREATE TRIGGER trg_penilaian_updated_at BEFORE UPDATE ON public.penilaian
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sign Up: akun baru masuk sebagai pegawai pending sampai Admin mengaktifkan
-- dan menetapkan role yang sesuai.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_nama TEXT;
  v_tim TEXT;
BEGIN
  v_nama=COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nama'),''),
                  SPLIT_PART(NEW.email,'@',1));
  v_tim=CASE
    WHEN NEW.raw_user_meta_data->>'tim' IN ('Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi')
    THEN NEW.raw_user_meta_data->>'tim' ELSE 'Umum' END;

  INSERT INTO public.users(auth_id,email,nama,role,tim,status)
  VALUES(NEW.id,LOWER(NEW.email),v_nama,'pegawai',v_tim,'pending')
  ON CONFLICT(email) DO UPDATE SET auth_id=NEW.id,updated_at=NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Tautkan akun Auth existing yang emailnya sama dengan profil aplikasi.
UPDATE public.users u
SET auth_id=au.id,updated_at=NOW()
FROM auth.users au
WHERE u.auth_id IS NULL AND LOWER(u.email)=LOWER(au.email);

-- Kelola Pengguna adalah sumber role. Saat role menjadi Juri, profil Juri
-- dibuat/disinkronkan otomatis. Saat role menjadi Pegawai, master pegawai
-- dapat disambungkan kembali tanpa menghapus riwayat.
CREATE OR REPLACE FUNCTION public.sync_user_role_personnel_final()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id UUID;
BEGIN
  IF NEW.role='juri' AND NEW.status='aktif' THEN
    SELECT j.id INTO v_id
    FROM public.juri j
    WHERE j.user_id=NEW.id
       OR (j.user_id IS NULL AND LOWER(TRIM(j.nama))=LOWER(TRIM(NEW.nama)))
    ORDER BY (j.user_id=NEW.id) DESC,j.created_at ASC
    LIMIT 1;

    IF v_id IS NULL THEN
      INSERT INTO public.juri(user_id,nama,tim,status)
      VALUES(NEW.id,NEW.nama,NEW.tim,'aktif');
    ELSE
      UPDATE public.juri
      SET user_id=NEW.id,nama=NEW.nama,tim=NEW.tim,status='aktif'
      WHERE id=v_id;
    END IF;

    UPDATE public.pegawai SET status='nonaktif' WHERE user_id=NEW.id;
  ELSE
    UPDATE public.juri SET status='nonaktif' WHERE user_id=NEW.id;

    IF NEW.role='pegawai' AND NEW.status='aktif' THEN
      SELECT p.id INTO v_id
      FROM public.pegawai p
      WHERE p.user_id=NEW.id
         OR (p.user_id IS NULL AND LOWER(TRIM(p.nama))=LOWER(TRIM(NEW.nama)) AND p.tim=NEW.tim)
      ORDER BY (p.user_id=NEW.id) DESC,p.created_at ASC
      LIMIT 1;

      IF v_id IS NULL THEN
        INSERT INTO public.pegawai(user_id,nama,tim,status)
        VALUES(NEW.id,NEW.nama,NEW.tim,'aktif');
      ELSE
        UPDATE public.pegawai
        SET user_id=NEW.id,nama=NEW.nama,tim=NEW.tim,status='aktif'
        WHERE id=v_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role_to_personnel ON public.users;
DROP TRIGGER IF EXISTS trg_sync_user_role_juri ON public.users;
DROP TRIGGER IF EXISTS trg_sync_user_role_personnel_final ON public.users;
CREATE TRIGGER trg_sync_user_role_personnel_final
AFTER INSERT OR UPDATE OF nama,role,tim,status ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_personnel_final();

-- Mencegah admin aktif terakhir dinonaktifkan atau dialihkan rolenya.
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.role='admin' AND OLD.status='aktif'
     AND (NEW.role<>'admin' OR NEW.status<>'aktif')
     AND NOT EXISTS(
       SELECT 1 FROM public.users u
       WHERE u.id<>OLD.id AND u.role='admin' AND u.status='aktif'
     ) THEN
    RAISE EXCEPTION 'Minimal harus tersedia satu Admin aktif.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_admin ON public.users;
DROP TRIGGER IF EXISTS trg_protect_user_account ON public.users;
CREATE TRIGGER trg_protect_last_admin BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin();

-- Sinkronisasi satu kali untuk role Juri yang sudah ada.
-- UPDATE kolom role sengaja dipakai agar trigger role benar-benar berjalan.
UPDATE public.users SET role=role WHERE role='juri';

-- ============================================================================
-- 6. HELPER AKSES DAN AUDIT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT u.id FROM public.users u
  WHERE u.auth_id=auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT u.role FROM public.users u
  WHERE u.auth_id=auth.uid() AND u.status='aktif' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_juri_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT j.id FROM public.juri j
  JOIN public.users u ON u.id=j.user_id
  WHERE u.auth_id=auth.uid() AND u.role='juri' AND u.status='aktif'
    AND j.status='aktif'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.orbit_wita_now()
RETURNS TIMESTAMP LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT timezone('Asia/Makassar',NOW())
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_aksi TEXT,p_entitas TEXT,p_referensi_id UUID,p_detail JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_log(actor_user_id,aksi,entitas,referensi_id,detail)
  VALUES(public.current_profile_id(),p_aksi,p_entitas,p_referensi_id,COALESCE(p_detail,'{}'::JSONB));
END;
$$;

-- Triwulan siap dikirim jika keenam tim sudah memiliki nilai/pemenang
-- bulanan pada tiga bulan yang berbeda dalam triwulan tersebut.
CREATE OR REPLACE FUNCTION public.is_triwulan_siap(p_tahun INTEGER,p_triwulan INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT NOT EXISTS (
    SELECT daftar.tim
    FROM (VALUES('Umum'),('Sosial'),('Produksi'),('Nerwilis'),('IPDS'),('Distribusi')) AS daftar(tim)
    WHERE (
      SELECT COUNT(DISTINCT nf.periode_bulan)
      FROM public.nilai_final nf
      WHERE nf.tim=daftar.tim
        AND nf.tahun=p_tahun
        AND nf.triwulan=p_triwulan
        AND nf.mode_rekam='operasional'
    ) < 3
  )
$$;

-- ============================================================================
-- 7. RPC ADMIN: STATUS JURI, KALENDER, DAN INPUT NILAI
-- ============================================================================

CREATE FUNCTION public.get_daftar_juri_status()
RETURNS TABLE(user_id UUID,nama TEXT,email TEXT,tim TEXT,kesiapan TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat melihat status Juri.';
  END IF;

  RETURN QUERY
  SELECT u.id,u.nama,u.email,u.tim,
    CASE
      WHEN u.status<>'aktif' THEN 'Menunggu Aktivasi'
      WHEN u.auth_id IS NULL THEN 'Belum Terhubung Login'
      WHEN EXISTS(SELECT 1 FROM public.juri j WHERE j.user_id=u.id AND j.status='aktif')
        THEN 'Siap Menilai'
      ELSE 'Perlu Sinkronisasi'
    END
  FROM public.users u
  WHERE u.role='juri'
  ORDER BY u.nama;
END;
$$;

-- Kalender panel dashboard:
-- - Proses aktif selalu tetap ditampilkan sampai selesai.
-- - Jika triwulan sebelumnya lengkap tetapi belum diputuskan, periode itu
--   tetap ditampilkan agar tidak terlewat saat waktu berganti triwulan.
-- - Selain itu, dashboard memonitor triwulan berjalan.
CREATE FUNCTION public.get_kalender_operasional()
RETURNS TABLE(
  sekarang_wita TIMESTAMP,
  tahun_monitoring INTEGER,
  triwulan_monitoring INTEGER,
  bulan_berjalan DATE,
  tahun_seleksi INTEGER,
  triwulan_seleksi INTEGER,
  siap_finalisasi BOOLEAN,
  status_proses TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_now TIMESTAMP:=public.orbit_wita_now();
  v_current_start DATE:=date_trunc('quarter',v_now)::DATE;
  v_previous_start DATE:=(date_trunc('quarter',v_now)-INTERVAL '3 months')::DATE;
  v_selected_start DATE:=v_current_start;
  v_status TEXT:='monitoring';
  v_ready BOOLEAN:=FALSE;
  v_active RECORD;
BEGIN
  IF public.current_role() IS NULL THEN
    RAISE EXCEPTION 'Akun aktif diperlukan.';
  END IF;

  SELECT n.tahun,n.triwulan INTO v_active
  FROM public.nominasi_final n
  WHERE n.status_alur IN ('juri','verifikasi','dikembalikan')
  ORDER BY n.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_selected_start:=make_date(v_active.tahun,((v_active.triwulan-1)*3)+1,1);
    v_ready:=TRUE;
    v_status:='proses_aktif';
  ELSIF public.is_triwulan_siap(EXTRACT(YEAR FROM v_previous_start)::INTEGER,
                                EXTRACT(QUARTER FROM v_previous_start)::INTEGER)
    AND NOT EXISTS(
      SELECT 1 FROM public.history_penghargaan h
      WHERE h.tahun=EXTRACT(YEAR FROM v_previous_start)::INTEGER
        AND h.triwulan=EXTRACT(QUARTER FROM v_previous_start)::INTEGER
    ) THEN
    v_selected_start:=v_previous_start;
    v_ready:=TRUE;
    v_status:='siap_finalisasi';
  ELSE
    v_selected_start:=v_current_start;
    v_ready:=public.is_triwulan_siap(EXTRACT(YEAR FROM v_current_start)::INTEGER,
                                     EXTRACT(QUARTER FROM v_current_start)::INTEGER);
    v_status:=CASE WHEN v_ready THEN 'siap_finalisasi' ELSE 'monitoring' END;
  END IF;

  RETURN QUERY SELECT
    v_now,
    EXTRACT(YEAR FROM v_current_start)::INTEGER,
    EXTRACT(QUARTER FROM v_current_start)::INTEGER,
    date_trunc('month',v_now)::DATE,
    EXTRACT(YEAR FROM v_selected_start)::INTEGER,
    EXTRACT(QUARTER FROM v_selected_start)::INTEGER,
    v_ready,
    v_status;
END;
$$;

CREATE FUNCTION public.simpan_nilai_bulanan_realtime(
  p_pegawai_id UUID,p_nilai NUMERIC,p_jumlah_kipapp INTEGER,p_periode_bulan DATE
)
RETURNS TABLE(mode_rekam TEXT,status_bulanan TEXT,pesan TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_now TIMESTAMP:=public.orbit_wita_now();
  v_bulan DATE:=date_trunc('month',p_periode_bulan::TIMESTAMP)::DATE;
  v_current_month DATE:=date_trunc('month',v_now)::DATE;
  v_current_start DATE:=date_trunc('quarter',v_now)::DATE;
  v_previous_start DATE:=(date_trunc('quarter',v_now)-INTERVAL '3 months')::DATE;
  v_input_start DATE:=date_trunc('quarter',p_periode_bulan::TIMESTAMP)::DATE;
  v_tim TEXT;
  v_mode TEXT;
  v_status TEXT;
  v_pesan TEXT;
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat menginput nilai.';
  END IF;
  IF p_periode_bulan<>v_bulan THEN
    RAISE EXCEPTION 'Periode bulan harus menggunakan tanggal pertama bulan.';
  END IF;
  IF v_bulan>v_current_month THEN
    RAISE EXCEPTION 'Bulan yang belum berjalan tidak dapat diinput.';
  END IF;
  IF p_nilai<0 OR p_nilai>100 OR COALESCE(p_jumlah_kipapp,0)<0 THEN
    RAISE EXCEPTION 'Nilai atau jumlah KIPAPP tidak valid.';
  END IF;

  SELECT p.tim INTO v_tim
  FROM public.pegawai p
  WHERE p.id=p_pegawai_id AND p.status='aktif';
  IF v_tim IS NULL THEN
    RAISE EXCEPTION 'Pegawai tidak aktif atau tidak ditemukan.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.history_penghargaan h
    WHERE h.tahun=EXTRACT(YEAR FROM v_bulan)::INTEGER
      AND h.triwulan=EXTRACT(QUARTER FROM v_bulan)::INTEGER
  ) THEN
    RAISE EXCEPTION 'Periode tersebut sudah memiliki pemenang resmi dan tidak dapat diubah.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.nominasi_final n
    WHERE n.tahun=EXTRACT(YEAR FROM v_bulan)::INTEGER
      AND n.triwulan=EXTRACT(QUARTER FROM v_bulan)::INTEGER
      AND n.status_alur IN ('juri','verifikasi','dikembalikan')
  ) THEN
    RAISE EXCEPTION 'Nominasi periode tersebut sedang diproses dan nilai telah terkunci.';
  END IF;

  IF v_input_start IN (v_current_start,v_previous_start) THEN
    v_mode:='operasional';
    v_status:='input';
    v_pesan:='Nilai tersimpan. Nominasi per tim otomatis diperbarui.';
  ELSE
    v_mode:='arsip';
    v_status:='arsip';
    v_pesan:='Nilai periode lama disimpan sebagai arsip dan tidak mengubah nominasi aktif.';
  END IF;

  INSERT INTO public.periode_bulanan(periode_bulan,tahun,triwulan,status)
  VALUES(
    v_bulan,EXTRACT(YEAR FROM v_bulan)::INTEGER,EXTRACT(QUARTER FROM v_bulan)::INTEGER,
    CASE WHEN v_mode='arsip' THEN 'arsip' ELSE 'terbuka' END
  )
  ON CONFLICT(periode_bulan) DO UPDATE SET
    status=EXCLUDED.status,updated_at=NOW();

  INSERT INTO public.nilai_final(
    pegawai_id,tim,nilai,jumlah_kipapp,total_nilai,periode_bulan,
    triwulan,tahun,periode,status,mode_rekam,status_bulanan,
    input_user_id,updated_user_id,finalized_at
  ) VALUES(
    p_pegawai_id,v_tim,p_nilai,COALESCE(p_jumlah_kipapp,0),p_nilai,v_bulan,
    EXTRACT(QUARTER FROM v_bulan)::INTEGER,EXTRACT(YEAR FROM v_bulan)::INTEGER,
    'Triwulan '||EXTRACT(QUARTER FROM v_bulan)::INTEGER,'draft',
    v_mode,v_status,public.current_profile_id(),public.current_profile_id(),NOW()
  )
  ON CONFLICT(pegawai_id,periode_bulan) DO UPDATE SET
    tim=EXCLUDED.tim,
    nilai=EXCLUDED.nilai,
    jumlah_kipapp=EXCLUDED.jumlah_kipapp,
    total_nilai=EXCLUDED.total_nilai,
    triwulan=EXCLUDED.triwulan,
    tahun=EXCLUDED.tahun,
    periode=EXCLUDED.periode,
    mode_rekam=EXCLUDED.mode_rekam,
    status_bulanan=EXCLUDED.status_bulanan,
    updated_user_id=public.current_profile_id(),
    finalized_at=NOW(),
    updated_at=NOW();

  PERFORM public.log_audit(
    'SIMPAN_NILAI_BULANAN','nilai_final',p_pegawai_id,
    jsonb_build_object('periode_bulan',v_bulan,'mode_rekam',v_mode,'nilai',p_nilai)
  );

  RETURN QUERY SELECT v_mode,v_status,v_pesan;
END;
$$;

-- ============================================================================
-- 8. RPC NOMINASI: PEMENANG BULANAN PER TIM → ENAM KANDIDAT FINAL
-- ============================================================================

CREATE FUNCTION public.get_nominasi_bulanan_per_tim(p_tahun INTEGER,p_triwulan INTEGER)
RETURNS TABLE(
  tim TEXT,
  bulan_sumber DATE,
  pegawai_id UUID,
  nama TEXT,
  nilai_bulanan NUMERIC,
  nilai_tertinggi_triwulan NUMERIC,
  kandidat_tertinggi BOOLEAN,
  seri_tertinggi BOOLEAN,
  bulan_tersedia BIGINT,
  lengkap_tiga_bulan BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat melihat nominasi per tim.';
  END IF;

  RETURN QUERY
  WITH nilai_valid AS (
    SELECT
      nf.pegawai_id,
      pg.nama AS nama_pegawai,
      pg.tim AS divisi,
      nf.total_nilai,
      nf.periode_bulan
    FROM public.nilai_final nf
    JOIN public.pegawai pg ON pg.id=nf.pegawai_id
    WHERE pg.status='aktif'
      AND nf.mode_rekam='operasional'
      AND nf.tahun=p_tahun
      AND nf.triwulan=p_triwulan
  ),
  urutan AS (
    SELECT nv.*,
      RANK() OVER(PARTITION BY nv.divisi,nv.periode_bulan ORDER BY nv.total_nilai DESC) AS peringkat
    FROM nilai_valid nv
  ),
  bulanan AS (
    SELECT u.* FROM urutan u WHERE u.peringkat=1
  ),
  maksimum AS (
    SELECT b.divisi,MAX(b.total_nilai) AS nilai_maksimum
    FROM bulanan b GROUP BY b.divisi
  ),
  status_tim AS (
    SELECT
      b.divisi,
      COUNT(DISTINCT b.periode_bulan)::BIGINT AS jumlah_bulan,
      COUNT(*) FILTER(WHERE b.total_nilai=m.nilai_maksimum)::BIGINT AS jumlah_tertinggi
    FROM bulanan b
    JOIN maksimum m ON m.divisi=b.divisi
    GROUP BY b.divisi
  )
  SELECT
    b.divisi::TEXT,
    b.periode_bulan,
    b.pegawai_id,
    b.nama_pegawai::TEXT,
    b.total_nilai,
    m.nilai_maksimum,
    (b.total_nilai=m.nilai_maksimum),
    (b.total_nilai=m.nilai_maksimum AND s.jumlah_tertinggi>1),
    s.jumlah_bulan,
    (s.jumlah_bulan=3)
  FROM bulanan b
  JOIN maksimum m ON m.divisi=b.divisi
  JOIN status_tim s ON s.divisi=b.divisi
  ORDER BY CASE b.divisi
      WHEN 'Umum' THEN 1 WHEN 'Sosial' THEN 2 WHEN 'Produksi' THEN 3
      WHEN 'Nerwilis' THEN 4 WHEN 'IPDS' THEN 5 WHEN 'Distribusi' THEN 6
      ELSE 99 END,
    b.periode_bulan,b.nama_pegawai;
END;
$$;

-- Compatibility RPC untuk script lama di HTML yang sudah ditimpa oleh modul final.
-- Panel Final 3.0 menggunakan get_nominasi_bulanan_per_tim().
CREATE FUNCTION public.get_kandidat_nominasi_triwulan(p_tahun INTEGER,p_triwulan INTEGER)
RETURNS TABLE(
  pegawai_id UUID,nama TEXT,tim TEXT,nilai_tertinggi NUMERIC,bulan_sumber DATE,
  jumlah_bulan_terinput BIGINT,jumlah_nilai_masuk BIGINT,jumlah_nilai_wajib BIGINT,
  lengkap_data BOOLEAN,berstatus_tie BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT r.pegawai_id,r.nama,r.tim,r.nilai_tertinggi_triwulan,r.bulan_sumber,
         r.bulan_tersedia,r.bulan_tersedia,3::BIGINT,r.lengkap_tiga_bulan,r.seri_tertinggi
  FROM public.get_nominasi_bulanan_per_tim(p_tahun,p_triwulan) r
  WHERE r.kandidat_tertinggi=TRUE
$$;

CREATE FUNCTION public.kirim_nominasi_ke_juri(
  p_tahun INTEGER,p_triwulan INTEGER,p_pegawai_ids UUID[]
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_selected_year INTEGER;
  v_selected_q INTEGER;
  v_id UUID;
  v_row RECORD;
  v_tim TEXT;
  v_selected TEXT[]:=ARRAY[]::TEXT[];
  v_jumlah_bulan INTEGER;
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat mengirim nominasi ke Juri.';
  END IF;

  SELECT k.tahun_seleksi,k.triwulan_seleksi
  INTO v_selected_year,v_selected_q
  FROM public.get_kalender_operasional() k;

  IF p_tahun<>v_selected_year OR p_triwulan<>v_selected_q THEN
    RAISE EXCEPTION 'Periode yang dikirim tidak sama dengan periode nominasi yang sedang ditampilkan.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.history_penghargaan h
    WHERE h.tahun=p_tahun AND h.triwulan=p_triwulan
  ) THEN
    RAISE EXCEPTION 'Pemenang triwulan tersebut sudah ditetapkan.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.nominasi_final n
    WHERE n.status_alur IN ('juri','verifikasi','dikembalikan')
  ) THEN
    RAISE EXCEPTION 'Masih ada proses nominasi atau penilaian aktif.';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.juri j
    JOIN public.users u ON u.id=j.user_id
    WHERE j.status='aktif' AND u.role='juri' AND u.status='aktif' AND u.auth_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Belum ada akun Juri berstatus Siap Menilai.';
  END IF;

  IF COALESCE(array_length(p_pegawai_ids,1),0)<>6 THEN
    RAISE EXCEPTION 'Nominasi Final wajib berisi 6 kandidat, satu kandidat dari setiap tim.';
  END IF;

  FOREACH v_tim IN ARRAY ARRAY['Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'] LOOP
    SELECT COUNT(DISTINCT r.bulan_sumber) INTO v_jumlah_bulan
    FROM public.get_nominasi_bulanan_per_tim(p_tahun,p_triwulan) r
    WHERE r.tim=v_tim;

    IF v_jumlah_bulan<3 THEN
      RAISE EXCEPTION 'Tim % belum memiliki pemenang bulanan untuk tiga bulan.',v_tim;
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY p_pegawai_ids LOOP
    SELECT r.* INTO v_row
    FROM public.get_nominasi_bulanan_per_tim(p_tahun,p_triwulan) r
    WHERE r.pegawai_id=v_id
      AND r.kandidat_tertinggi=TRUE
      AND NOT (r.tim=ANY(v_selected))
    ORDER BY r.bulan_sumber
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pilihan kandidat tidak valid atau satu tim dipilih lebih dari satu kali.';
    END IF;

    v_selected:=array_append(v_selected,v_row.tim);

    INSERT INTO public.nominasi_final(
      pegawai_id,tim,nilai_awal,total_nilai,periode_bulan,bulan_sumber,
      triwulan,tahun,status_alur,dikirim_juri_at
    ) VALUES(
      v_row.pegawai_id,v_row.tim,v_row.nilai_tertinggi_triwulan,NULL,
      v_row.bulan_sumber,v_row.bulan_sumber,p_triwulan,p_tahun,'juri',NOW()
    );
  END LOOP;

  FOREACH v_tim IN ARRAY ARRAY['Umum','Sosial','Produksi','Nerwilis','IPDS','Distribusi'] LOOP
    IF NOT (v_tim=ANY(v_selected)) THEN
      RAISE EXCEPTION 'Tim % belum memiliki kandidat final terpilih.',v_tim;
    END IF;
  END LOOP;

  PERFORM public.log_audit(
    'KIRIM_6_KANDIDAT_KE_JURI','nominasi_final',NULL,
    jsonb_build_object('tahun',p_tahun,'triwulan',p_triwulan,'jumlah',6)
  );
END;
$$;

-- ============================================================================
-- 9. RPC JURI DAN RANKING HASIL JURI
-- ============================================================================

CREATE FUNCTION public.simpan_penilaian_juri(
  p_nominasi_id UUID,p_nilai NUMERIC,p_catatan TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_juri UUID:=public.current_juri_id();
  v_pegawai UUID;
BEGIN
  IF v_juri IS NULL THEN
    RAISE EXCEPTION 'Akun Juri belum berstatus Siap Menilai.';
  END IF;
  IF p_nilai<0 OR p_nilai>100 THEN
    RAISE EXCEPTION 'Nilai harus berada pada rentang 0 sampai 100.';
  END IF;

  SELECT n.pegawai_id INTO v_pegawai
  FROM public.nominasi_final n
  WHERE n.id=p_nominasi_id AND n.status_alur='juri';

  IF v_pegawai IS NULL THEN
    RAISE EXCEPTION 'Nominasi tidak tersedia pada tahap Juri.';
  END IF;

  UPDATE public.penilaian
  SET total_nilai=p_nilai,catatan=p_catatan,updated_at=NOW()
  WHERE nominasi_id=p_nominasi_id AND juri_id=v_juri::TEXT;

  IF NOT FOUND THEN
    INSERT INTO public.penilaian(nominasi_id,pegawai_id,juri_id,total_nilai,catatan)
    VALUES(p_nominasi_id,v_pegawai,v_juri::TEXT,p_nilai,p_catatan);
  END IF;

  PERFORM public.log_audit(
    'SIMPAN_NILAI_JURI','penilaian',p_nominasi_id,jsonb_build_object('juri_id',v_juri)
  );
END;
$$;

CREATE FUNCTION public.hapus_penilaian_juri(p_nominasi_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_juri UUID:=public.current_juri_id();
BEGIN
  IF v_juri IS NULL THEN
    RAISE EXCEPTION 'Akun Juri belum berstatus Siap Menilai.';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.nominasi_final n
    WHERE n.id=p_nominasi_id AND n.status_alur='juri'
  ) THEN
    RAISE EXCEPTION 'Nilai tidak dapat dihapus setelah tahap Juri selesai.';
  END IF;

  DELETE FROM public.penilaian
  WHERE nominasi_id=p_nominasi_id AND juri_id=v_juri::TEXT;

  PERFORM public.log_audit(
    'HAPUS_NILAI_JURI','penilaian',p_nominasi_id,jsonb_build_object('juri_id',v_juri)
  );
END;
$$;

-- Nilai ranking adalah rata-rata ANTAR-JURI. Nilai bulanan tetap tidak dirata-
-- ratakan saat memilih kandidat dari masing-masing tim.
CREATE FUNCTION public.get_ranking_live()
RETURNS TABLE(
  nominasi_id UUID,pegawai_id UUID,nama TEXT,tim TEXT,nilai NUMERIC,
  jumlah_penilai BIGINT,jumlah_juri BIGINT,lengkap BOOLEAN,
  is_override BOOLEAN,status_alur TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_total_juri BIGINT;
BEGIN
  IF public.current_role() NOT IN ('admin','verifikator') THEN
    RAISE EXCEPTION 'Ranking hanya dapat dilihat Admin atau Verifikator.';
  END IF;

  SELECT COUNT(*) INTO v_total_juri
  FROM public.juri j
  JOIN public.users u ON u.id=j.user_id
  WHERE j.status='aktif' AND u.role='juri' AND u.status='aktif' AND u.auth_id IS NOT NULL;

  RETURN QUERY
  SELECT
    n.id,n.pegawai_id,p.nama,p.tim,
    CASE WHEN COUNT(x.id)>0 THEN AVG(x.total_nilai)::NUMERIC ELSE NULL::NUMERIC END,
    COUNT(x.id)::BIGINT,v_total_juri,
    (COUNT(x.id)=v_total_juri AND v_total_juri>0),
    FALSE,
    n.status_alur
  FROM public.nominasi_final n
  JOIN public.pegawai p ON p.id=n.pegawai_id
  LEFT JOIN public.penilaian x ON x.nominasi_id=n.id
  WHERE n.status_alur IN ('juri','verifikasi','dikembalikan')
  GROUP BY n.id,n.pegawai_id,p.nama,p.tim,n.status_alur,v_total_juri
  ORDER BY AVG(x.total_nilai) DESC NULLS LAST,p.nama;
END;
$$;

CREATE FUNCTION public.kirim_ranking_ke_verifikator()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_total_juri BIGINT;
  v_total_nominasi BIGINT;
  v_lengkap BIGINT;
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat mengirim ranking ke Verifikator.';
  END IF;

  SELECT COUNT(*) INTO v_total_juri
  FROM public.juri j
  JOIN public.users u ON u.id=j.user_id
  WHERE j.status='aktif' AND u.role='juri' AND u.status='aktif' AND u.auth_id IS NOT NULL;

  SELECT COUNT(*) INTO v_total_nominasi
  FROM public.nominasi_final n WHERE n.status_alur='juri';

  IF v_total_nominasi<>6 THEN
    RAISE EXCEPTION 'Tahap Juri harus memiliki tepat enam kandidat final.';
  END IF;
  IF v_total_juri=0 THEN
    RAISE EXCEPTION 'Belum ada akun Juri berstatus Siap Menilai.';
  END IF;

  SELECT COUNT(*) INTO v_lengkap
  FROM public.get_ranking_live() r
  WHERE r.status_alur='juri' AND r.lengkap=TRUE;

  IF v_lengkap<>6 THEN
    RAISE EXCEPTION 'Seluruh Juri harus menilai seluruh enam kandidat terlebih dahulu.';
  END IF;

  UPDATE public.nominasi_final n
  SET total_nilai=(SELECT AVG(p.total_nilai) FROM public.penilaian p WHERE p.nominasi_id=n.id),
      status_alur='verifikasi',
      dikirim_verifikator_at=NOW(),
      updated_at=NOW()
  WHERE n.status_alur='juri';

  PERFORM public.log_audit(
    'KIRIM_RANKING_KE_VERIFIKATOR','nominasi_final',NULL,
    jsonb_build_object('jumlah_kandidat',6,'jumlah_juri',v_total_juri)
  );
END;
$$;

-- ============================================================================
-- 10. RPC VERIFIKATOR: SATU PEMENANG / TRIWULAN ATAU KEMBALIKAN
-- ============================================================================

CREATE FUNCTION public.tetapkan_pemenang(p_nominasi_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_nominasi public.nominasi_final%ROWTYPE;
  v_pegawai public.pegawai%ROWTYPE;
BEGIN
  IF public.current_role()<>'verifikator' THEN
    RAISE EXCEPTION 'Hanya Verifikator yang dapat menetapkan pemenang.';
  END IF;

  SELECT * INTO v_nominasi
  FROM public.nominasi_final
  WHERE id=p_nominasi_id AND status_alur='verifikasi';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nominasi belum berada pada tahap verifikasi.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.history_penghargaan h
    WHERE h.tahun=v_nominasi.tahun AND h.triwulan=v_nominasi.triwulan
  ) THEN
    RAISE EXCEPTION 'Pemenang untuk triwulan ini sudah pernah ditetapkan.';
  END IF;

  SELECT * INTO v_pegawai FROM public.pegawai WHERE id=v_nominasi.pegawai_id;

  INSERT INTO public.history_penghargaan(
    nominasi_id,pegawai_id,nama,tim,total_nilai,triwulan,tahun,
    periode_label,ditetapkan_oleh
  ) VALUES(
    v_nominasi.id,v_nominasi.pegawai_id,v_pegawai.nama,v_pegawai.tim,
    v_nominasi.total_nilai,v_nominasi.triwulan,v_nominasi.tahun,
    'Triwulan '||v_nominasi.triwulan||' Tahun '||v_nominasi.tahun,
    public.current_profile_id()
  );

  UPDATE public.nominasi_final
  SET status_alur='selesai',approved_at=NOW(),updated_at=NOW()
  WHERE tahun=v_nominasi.tahun AND triwulan=v_nominasi.triwulan
    AND status_alur='verifikasi';

  PERFORM public.log_audit(
    'TETAPKAN_PEMENANG','history_penghargaan',p_nominasi_id,
    jsonb_build_object('pegawai_id',v_nominasi.pegawai_id,
                       'tahun',v_nominasi.tahun,'triwulan',v_nominasi.triwulan)
  );
END;
$$;

CREATE FUNCTION public.kembalikan_ke_admin(p_alasan TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tahun INTEGER; v_triwulan INTEGER;
BEGIN
  IF public.current_role()<>'verifikator' THEN
    RAISE EXCEPTION 'Hanya Verifikator yang dapat mengembalikan proses.';
  END IF;
  IF NULLIF(TRIM(p_alasan),'') IS NULL THEN
    RAISE EXCEPTION 'Alasan pengembalian wajib diisi.';
  END IF;

  SELECT n.tahun,n.triwulan INTO v_tahun,v_triwulan
  FROM public.nominasi_final n
  WHERE n.status_alur='verifikasi'
  LIMIT 1;

  IF v_tahun IS NULL THEN
    RAISE EXCEPTION 'Tidak ada proses verifikasi aktif.';
  END IF;

  UPDATE public.nominasi_final
  SET status_alur='dikembalikan',catatan_verifikator=p_alasan,updated_at=NOW()
  WHERE tahun=v_tahun AND triwulan=v_triwulan AND status_alur='verifikasi';

  INSERT INTO public.permintaan_koreksi(
    tipe,tahun,triwulan,alasan,status,dibuat_oleh
  ) VALUES(
    'proses_verifikasi',v_tahun,v_triwulan,p_alasan,'menunggu',public.current_profile_id()
  );

  PERFORM public.log_audit(
    'KEMBALIKAN_KE_ADMIN','nominasi_final',NULL,
    jsonb_build_object('tahun',v_tahun,'triwulan',v_triwulan,'alasan',p_alasan)
  );
END;
$$;

-- Admin membuka proses yang dikembalikan. Nominasi/penilaian proses yang belum
-- menjadi arsip dibersihkan agar Admin memilih ulang enam kandidat dengan benar.
CREATE FUNCTION public.buka_kembali_setelah_koreksi()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tahun INTEGER; v_triwulan INTEGER;
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat membuka kembali proses.';
  END IF;

  SELECT n.tahun,n.triwulan INTO v_tahun,v_triwulan
  FROM public.nominasi_final n
  WHERE n.status_alur='dikembalikan'
  LIMIT 1;

  IF v_tahun IS NULL THEN
    RAISE EXCEPTION 'Tidak ada proses yang dikembalikan Verifikator.';
  END IF;

  DELETE FROM public.penilaian p
  WHERE p.nominasi_id IN (
    SELECT n.id FROM public.nominasi_final n
    WHERE n.tahun=v_tahun AND n.triwulan=v_triwulan AND n.status_alur='dikembalikan'
  );

  DELETE FROM public.nominasi_final n
  WHERE n.tahun=v_tahun AND n.triwulan=v_triwulan AND n.status_alur='dikembalikan';

  UPDATE public.permintaan_koreksi
  SET status='selesai',diputuskan_oleh=public.current_profile_id(),
      keputusan='Dibuka kembali oleh Admin',decided_at=NOW()
  WHERE tahun=v_tahun AND triwulan=v_triwulan
    AND tipe='proses_verifikasi' AND status='menunggu';

  PERFORM public.log_audit(
    'BUKA_KEMBALI_SETELAH_KOREKSI','nominasi_final',NULL,
    jsonb_build_object('tahun',v_tahun,'triwulan',v_triwulan)
  );
END;
$$;

-- Reset ini hanya membersihkan proses aktif (misalnya data uji), tidak pernah
-- menghapus nilai bulanan, arsip pemenang, sertifikat, akun, atau pegawai.
CREATE FUNCTION public.reset_penilaian_baru()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.current_role()<>'admin' THEN
    RAISE EXCEPTION 'Hanya Admin yang dapat membersihkan proses aktif.';
  END IF;

  DELETE FROM public.penilaian p
  WHERE p.nominasi_id IN (
    SELECT n.id FROM public.nominasi_final n
    WHERE n.status_alur IN ('juri','verifikasi','dikembalikan')
  );

  DELETE FROM public.nominasi_final n
  WHERE n.status_alur IN ('juri','verifikasi','dikembalikan');

  PERFORM public.log_audit(
    'BERSIHKAN_PROSES_AKTIF','nominasi_final',NULL,
    '{"catatan":"Nilai bulanan, arsip, sertifikat, pengguna, dan pegawai tidak dihapus"}'::JSONB
  );
END;
$$;

-- ============================================================================
-- 11. ROW LEVEL SECURITY: MENGGANTI POLICY LAMA YANG TERLALU TERBUKA
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periode_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominasi_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penilaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_penghargaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sertifikat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permintaan_koreksi ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_or_admin_read_final ON public.users FOR SELECT TO authenticated
USING (id=public.current_profile_id() OR public.current_role()='admin');
CREATE POLICY users_admin_write_final ON public.users FOR ALL TO authenticated
USING (public.current_role()='admin') WITH CHECK (public.current_role()='admin');

CREATE POLICY pegawai_authenticated_read_final ON public.pegawai FOR SELECT TO authenticated
USING (public.current_role() IS NOT NULL);
CREATE POLICY pegawai_admin_write_final ON public.pegawai FOR ALL TO authenticated
USING (public.current_role()='admin') WITH CHECK (public.current_role()='admin');

CREATE POLICY juri_authorized_read_final ON public.juri FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator') OR user_id=public.current_profile_id());

CREATE POLICY periode_admin_verif_read_final ON public.periode_bulanan FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator'));

-- Nilai bulanan hanya ditulis melalui RPC simpan_nilai_bulanan_realtime.
CREATE POLICY nilai_admin_verif_read_final ON public.nilai_final FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator'));

-- Nominasi dan penilaian hanya ditulis melalui RPC final.
CREATE POLICY nominasi_roles_read_final ON public.nominasi_final FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','juri','verifikator'));
CREATE POLICY penilaian_authorized_read_final ON public.penilaian FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator') OR juri_id=public.current_juri_id()::TEXT);

CREATE POLICY history_authenticated_read_final ON public.history_penghargaan FOR SELECT TO authenticated
USING (public.current_role() IS NOT NULL);

CREATE POLICY uploads_admin_verif_read_final ON public.excel_uploads FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator'));
CREATE POLICY uploads_admin_write_final ON public.excel_uploads FOR ALL TO authenticated
USING (public.current_role()='admin') WITH CHECK (public.current_role()='admin');

CREATE POLICY sertifikat_authenticated_read_final ON public.sertifikat FOR SELECT TO authenticated
USING (public.current_role() IS NOT NULL);
CREATE POLICY sertifikat_admin_write_final ON public.sertifikat FOR ALL TO authenticated
USING (public.current_role()='admin') WITH CHECK (public.current_role()='admin');

CREATE POLICY notifikasi_target_read_final ON public.notifikasi FOR SELECT TO authenticated
USING (public.current_role()='admin' OR role_target='semua' OR role_target=public.current_role());
CREATE POLICY notifikasi_admin_write_final ON public.notifikasi FOR ALL TO authenticated
USING (public.current_role()='admin') WITH CHECK (public.current_role()='admin');

CREATE POLICY audit_admin_verif_read_final ON public.audit_log FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator'));
CREATE POLICY koreksi_admin_verif_read_final ON public.permintaan_koreksi FOR SELECT TO authenticated
USING (public.current_role() IN ('admin','verifikator'));

-- ============================================================================
-- 12. STORAGE PRIVATE UNTUK DOKUMEN DAN SERTIFIKAT
-- ============================================================================

-- Bersihkan policy lama yang hanya berkaitan dengan bucket ORBIT.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname,tablename,policyname
    FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (
        COALESCE(qual,'') ILIKE '%doc-pegawai%'
        OR COALESCE(with_check,'') ILIKE '%doc-pegawai%'
        OR policyname ILIKE '%orbit%'
        OR policyname ILIKE '%certificate%'
        OR policyname ILIKE '%document%'
        OR policyname ILIKE '%sertifikat%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
  END LOOP;
END $$;

INSERT INTO storage.buckets(id,name,public)
VALUES('doc-pegawai','doc-pegawai',FALSE)
ON CONFLICT(id) DO UPDATE SET public=FALSE;

CREATE POLICY orbit_doc_admin_insert_final ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='doc-pegawai' AND public.current_role()='admin');
CREATE POLICY orbit_doc_admin_update_final ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='doc-pegawai' AND public.current_role()='admin')
WITH CHECK (bucket_id='doc-pegawai' AND public.current_role()='admin');
CREATE POLICY orbit_doc_admin_delete_final ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='doc-pegawai' AND public.current_role()='admin');
CREATE POLICY orbit_doc_authorized_read_final ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='doc-pegawai' AND (
    (name LIKE 'sertifikat/%' AND public.current_role() IS NOT NULL)
    OR (name LIKE 'dokumen/%' AND public.current_role() IN ('admin','verifikator'))
  )
);

-- ============================================================================
-- 13. HAK EKSEKUSI FUNCTION
-- ============================================================================

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_juri_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orbit_wita_now() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit(TEXT,TEXT,UUID,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_triwulan_siap(INTEGER,INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_daftar_juri_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kalender_operasional() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.simpan_nilai_bulanan_realtime(UUID,NUMERIC,INTEGER,DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_nominasi_bulanan_per_tim(INTEGER,INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kandidat_nominasi_triwulan(INTEGER,INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kirim_nominasi_ke_juri(INTEGER,INTEGER,UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.simpan_penilaian_juri(UUID,NUMERIC,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hapus_penilaian_juri(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ranking_live() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kirim_ranking_ke_verifikator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tetapkan_pemenang(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.kembalikan_ke_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buka_kembali_setelah_koreksi() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_penilaian_baru() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_juri_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daftar_juri_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kalender_operasional() TO authenticated;
GRANT EXECUTE ON FUNCTION public.simpan_nilai_bulanan_realtime(UUID,NUMERIC,INTEGER,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nominasi_bulanan_per_tim(INTEGER,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kandidat_nominasi_triwulan(INTEGER,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kirim_nominasi_ke_juri(INTEGER,INTEGER,UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simpan_penilaian_juri(UUID,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hapus_penilaian_juri(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranking_live() TO authenticated;
GRANT EXECUTE ON FUNCTION public.kirim_ranking_ke_verifikator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tetapkan_pemenang(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kembalikan_ke_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buka_kembali_setelah_koreksi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_penilaian_baru() TO authenticated;

-- ============================================================================
-- 14. CATAT PENERAPAN SCHEMA FINAL
-- ============================================================================

INSERT INTO public.orbit_schema_migrations(version,description)
VALUES(
  'ORBIT_FINAL_3_0_SAME_PROJECT_BPS',
  'Schema konsolidasi final ORBIT 3.0: nominasi pemenang bulanan per tim, enam kandidat Juri, satu pemenang per triwulan, storage private dan RLS final'
)
ON CONFLICT(version) DO UPDATE SET
  description=EXCLUDED.description,
  applied_at=NOW();

COMMIT;

-- ============================================================================
-- CATATAN AKTIVASI ADMIN PERTAMA (HANYA BILA DIPERLUKAN)
-- Apabila belum ada Admin aktif, PIC Sign Up dari website lalu jalankan:
--
-- UPDATE public.users
-- SET role='admin',status='aktif'
-- WHERE LOWER(email)=LOWER('email.pic@bps.go.id');
--
-- Jangan menjalankan query contoh di atas bila Admin aktif sudah tersedia.
-- ============================================================================


-- ============================================================================
-- OPSIONAL SETELAH VERIFIKASI MANUAL (TIDAK DIJALANKAN OTOMATIS)
-- Apabila akun demo lama benar-benar hanya data uji dan tidak akan digunakan,
-- PIC dapat menghapus/menonaktifkannya secara sadar setelah memastikan tidak
-- terkait riwayat resmi. Contoh aman: nonaktifkan dahulu melalui aplikasi.
-- Tabel legacy seperti public.kipapp juga hanya boleh dihapus setelah backup.
-- ============================================================================

-- ============================================================
--  ORBIT — RESET FLOW TESTING
--  Script ini mengosongkan data proses penilaian pegawai teladan.
--
--  ✅ TETAP (tidak disentuh):
--     pegawai, users, juri
--
--  🗑️  DIKOSONGKAN:
--     nilai_final         — nilai bulanan input admin
--     nominasi_final      — nominasi yang dikirim ke juri/verifikator
--     penilaian           — nilai yang diinput juri
--     notifikasi          — notif yang dibuat admin
--     sertifikat          — sertifikat pemenang yang diupload
--     excel_uploads       — dokumen yang diupload admin
--     history_penghargaan — arsip pemenang yang sudah ditetapkan
--
--  ⚠️  PERINGATAN: Jalankan HANYA di environment testing!
--     Tindakan ini tidak dapat dibatalkan.
--
--  CARA PAKAI:
--     Supabase Dashboard → SQL Editor → paste & Run
-- ============================================================

-- Gunakan transaksi agar semua atau tidak ada yang berubah
BEGIN;

-- ----------------------------------------------------------
-- 1. Hapus penilaian juri (referensi ke nominasi_final)
-- ----------------------------------------------------------
DELETE FROM public.penilaian;

-- ----------------------------------------------------------
-- 2. Hapus nominasi final (referensi ke nilai_final & pegawai)
-- ----------------------------------------------------------
DELETE FROM public.nominasi_final;

-- ----------------------------------------------------------
-- 3. Hapus nilai bulanan (referensi ke pegawai)
-- ----------------------------------------------------------
DELETE FROM public.nilai_final;

-- ----------------------------------------------------------
-- 4. Hapus arsip pemenang
-- ----------------------------------------------------------
DELETE FROM public.history_penghargaan;

-- ----------------------------------------------------------
-- 5. Hapus notifikasi
-- ----------------------------------------------------------
DELETE FROM public.notifikasi;

-- ----------------------------------------------------------
-- 6. Hapus metadata sertifikat
--    (File di Storage harus dihapus manual via Dashboard
--     Supabase > Storage > doc-pegawai > sertifikat/)
-- ----------------------------------------------------------
DELETE FROM public.sertifikat;

-- ----------------------------------------------------------
-- 7. Hapus metadata dokumen upload
--    (File di Storage harus dihapus manual via Dashboard
--     Supabase > Storage > doc-pegawai > dokumen/)
-- ----------------------------------------------------------
DELETE FROM public.excel_uploads;

-- ----------------------------------------------------------
-- 8. Konfirmasi: tampilkan jumlah baris yang tersisa
--    (Semua harus 0 kecuali 3 tabel master)
-- ----------------------------------------------------------
SELECT 'pegawai'             AS tabel, COUNT(*) AS sisa FROM public.pegawai
UNION ALL
SELECT 'users'               AS tabel, COUNT(*) AS sisa FROM public.users
UNION ALL
SELECT 'juri'                AS tabel, COUNT(*) AS sisa FROM public.juri
UNION ALL
SELECT 'nilai_final'         AS tabel, COUNT(*) AS sisa FROM public.nilai_final
UNION ALL
SELECT 'nominasi_final'      AS tabel, COUNT(*) AS sisa FROM public.nominasi_final
UNION ALL
SELECT 'penilaian'           AS tabel, COUNT(*) AS sisa FROM public.penilaian
UNION ALL
SELECT 'notifikasi'          AS tabel, COUNT(*) AS sisa FROM public.notifikasi
UNION ALL
SELECT 'sertifikat'          AS tabel, COUNT(*) AS sisa FROM public.sertifikat
UNION ALL
SELECT 'excel_uploads'       AS tabel, COUNT(*) AS sisa FROM public.excel_uploads
UNION ALL
SELECT 'history_penghargaan' AS tabel, COUNT(*) AS sisa FROM public.history_penghargaan;

-- ----------------------------------------------------------
-- Jika hasilnya sesuai harapan, commit. Jika tidak, rollback.
-- ----------------------------------------------------------
COMMIT;
-- ROLLBACK;

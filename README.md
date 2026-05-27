# ORBIT — Portal Pegawai Teladan BPS Provinsi Sulawesi Utara

**Outstanding Recognition & Benchmarking Tool (ORBIT)**  
**Judul Kegiatan Magang:** Rancang Bangun Website Pemilihan Pegawai Teladan Badan Pusat Statistik Provinsi Sulawesi Utara  
**Lokasi:** Badan Pusat Statistik (BPS) Provinsi Sulawesi Utara, Jl. 17 Agustus, Kel. Teling Atas, Kec. Wanea, Kota Manado  
**Pengembang:** Brilliani Jeshia Potalangi — 230211060022; Claisty Marsha Umboh — 230211060023  
**Periode Magang:** 19 Januari–19 Maret 2026  
**Versi Sistem:** ORBIT Final 3.0  
**Konfigurasi Implementasi:** Menggunakan project Supabase operasional yang sama/existing

---

## 1. Tentang ORBIT

ORBIT adalah aplikasi web untuk membantu BPS Provinsi Sulawesi Utara mengelola proses pemilihan Pegawai Teladan secara lebih terstruktur, terdokumentasi, dan mudah dipantau. Sistem mendukung proses mulai dari input nilai bulanan, penyaringan nominasi per tim, penilaian oleh Juri, verifikasi hasil, hingga penyimpanan arsip pemenang serta sertifikat.

Aplikasi ini dirancang dengan antarmuka bertema profesional-galaxy, dapat digunakan melalui browser, dan terhubung dengan Supabase sebagai layanan autentikasi, database, serta penyimpanan dokumen.

### Tujuan utama

- Menyediakan proses pemilihan pegawai teladan yang lebih tertib dan transparan.
- Menyimpan data pegawai, pengguna, nilai, nominasi, penilaian Juri, hasil akhir, dan dokumen dalam satu sistem.
- Memisahkan kewenangan Admin, Juri, dan Verifikator agar alur persetujuan jelas.
- Mempermudah pembuatan laporan, arsip hasil, dan pengelolaan sertifikat.

---

## 2. Alur Final Sistem yang Digunakan

Alur di bawah adalah alur final yang menjadi acuan penggunaan ORBIT:

```text
Admin menginput nilai pegawai setiap bulan
        ↓
Sistem menampilkan pemenang bulanan pada setiap tim
        ↓
Dalam satu triwulan, Admin melihat maksimal 3 pemenang bulanan per tim
        ↓
Admin memilih 1 kandidat dengan nilai tertinggi pada masing-masing tim
        ↓
Nominasi Final berisi tepat 6 kandidat, satu kandidat dari setiap tim
        ↓
Admin mengirim 6 kandidat kepada Juri
        ↓
Juri memberikan nilai kepada seluruh kandidat
        ↓
Admin mengirim ranking hasil penilaian kepada Verifikator
        ↓
Verifikator menetapkan 1 pemenang akhir per triwulan
atau mengembalikan proses kepada Admin dengan alasan
        ↓
Hasil disimpan dalam arsip dan sertifikat dapat dikelola
```

### Enam tim/divisi dalam sistem

1. Umum
2. Sosial
3. Produksi
4. Nerwilis
5. IPDS
6. Distribusi

### Aturan penting

- Nominasi **tidak dihitung menggunakan rata-rata nilai bulanan**.
- Setiap bulan, pegawai dengan nilai tertinggi pada masing-masing tim masuk ke daftar **Nominasi Per Tim**.
- Dari maksimal tiga pemenang bulanan dalam satu triwulan, dipilih nilai tertinggi pada tim yang sama.
- Nominasi Final harus berisi **6 kandidat**, yaitu satu kandidat dari setiap tim.
- Nilai dari beberapa Juri dapat diolah menjadi ranking hasil Juri.
- Verifikator hanya dapat menetapkan **1 pemenang resmi dalam setiap triwulan**.
- Sistem final tidak menggunakan tahapan **Tutup Penilaian Bulan**, indikator progres `1/16` atau `1/24`, maupun fitur override nilai Admin.

### Contoh pemilihan kandidat per tim

| Tim Umum — Triwulan II | Pemenang Bulanan | Nilai | Hasil Seleksi |
|---|---|---:|---|
| April | Agus | 94 | Tidak dipilih |
| Mei | Nurul | 98 | Dipilih untuk Nominasi Final |
| Juni | Fitri | 96 | Tidak dipilih |

Pada contoh tersebut, **Nurul** dipilih sebagai kandidat final Tim Umum karena memiliki nilai tertinggi di antara pemenang bulanan dalam Triwulan II.

---

## 3. Pengguna dan Hak Akses

| Role | Fungsi Utama | Akses Utama |
|---|---|---|
| **Admin** | Mengelola keseluruhan proses operasional | Kelola pengguna, kelola pegawai, input nilai bulanan, memilih nominasi final, mengirim ke Juri, memantau proses, mengirim ranking ke Verifikator, dokumen, sertifikat, notifikasi, laporan, dan arsip |
| **Juri** | Memberikan penilaian kepada kandidat final | Melihat kandidat yang telah dikirim dan mengisi/memperbarui nilai miliknya sendiri selama tahap penilaian terbuka |
| **Verifikator** | Mengambil keputusan akhir | Melihat ranking hasil Juri, menetapkan satu pemenang, atau mengembalikan proses kepada Admin dengan alasan |
| **Pegawai** | Pengguna biasa/penerima informasi sesuai kebijakan | Akses informasi atau riwayat yang diizinkan oleh sistem/instansi |

### Pengelolaan user dan pegawai

- **Kelola Pengguna** dipakai untuk akun login, role, tim/divisi, dan status akses.
- **Kelola Pegawai** dipakai untuk data master pegawai yang akan dinilai.
- Pegawai yang dinilai tidak harus memiliki akun login.
- Apabila seseorang berubah tugas dari Pegawai menjadi Juri atau sebaliknya, Admin mengubah role pada menu Kelola Pengguna; riwayat penilaian tidak dihapus.

### Status kesiapan Juri

| Status | Arti | Tindakan |
|---|---|---|
| Siap Menilai | Akun aktif, sudah terhubung login, dan role Juri tersinkron | Juri dapat mengisi penilaian |
| Menunggu Aktivasi | Akun belum diaktifkan Admin | Admin mengaktifkan setelah identitas diverifikasi |
| Belum Terhubung Login | Data user Juri tersedia, tetapi pengguna belum sign up/login dengan email yang sesuai | Juri melakukan sign up/login |
| Perlu Sinkronisasi | Data lama membutuhkan penyelarasan | Admin/PIC melakukan pemeriksaan role dan sinkronisasi |

---

## 4. Fitur Aplikasi

### Fitur Admin

- Dashboard pemantauan proses penilaian.
- Input nilai bulanan pegawai.
- Upload dokumen pendukung.
- Kelola Pengguna: akun, role, tim, dan status.
- Kelola Pegawai: master pegawai yang dinilai.
- Nominasi Per Tim dan Nominasi Final.
- Pengiriman enam kandidat kepada Juri.
- Monitoring status penilaian Juri.
- Pengiriman ranking kepada Verifikator.
- Generate laporan.
- Upload dan lihat sertifikat.
- Notifikasi.
- Approval Monitor.
- Arsip/History pemenang.

### Fitur Juri

- Dashboard Juri.
- Daftar kandidat final yang perlu dinilai.
- Input dan pembaruan nilai milik Juri sendiri.
- Riwayat dan notifikasi yang sesuai hak akses.

### Fitur Verifikator

- Dashboard Verifikator.
- Approval/Verifikasi hasil ranking.
- Penetapan satu pemenang per triwulan.
- Pengembalian proses kepada Admin beserta alasan.
- Riwayat dan notifikasi.

### Dokumen dan arsip

- Dokumen pendukung dan sertifikat disimpan pada storage private `doc-pegawai`.
- Sistem menggunakan tautan akses sementara ketika file dibuka oleh pengguna yang berwenang.
- Aksi penting dicatat melalui audit log.

---

## 5. Teknologi yang Digunakan

| Komponen | Teknologi | Fungsi |
|---|---|---|
| Frontend | HTML5, CSS, JavaScript dalam satu file `index.html` | Menampilkan halaman dan menjalankan logika aplikasi di browser |
| Library frontend | Supabase JavaScript Client v2 melalui CDN | Menghubungkan aplikasi dengan Supabase |
| Tampilan | Google Fonts: Orbitron, Rajdhani, dan Inter | Identitas visual antarmuka ORBIT |
| Backend-as-a-Service | Supabase | Menyediakan autentikasi, database PostgreSQL, storage, dan keamanan akses |
| Database | PostgreSQL pada Supabase | Menyimpan data pengguna, pegawai, nilai, nominasi, penilaian, arsip, sertifikat, dan audit |
| Authentication | Supabase Auth | Sign Up dan Sign In pengguna |
| Storage | Supabase Storage bucket private `doc-pegawai` | Menyimpan dokumen pendukung dan sertifikat |
| Keamanan akses | Row Level Security (RLS), policy, dan RPC/function PostgreSQL | Membatasi akses berdasarkan role dan alur proses |

---

## 6. Struktur File yang Disarankan untuk Serah-Terima

Karena implementasi menggunakan project Supabase yang sama, paket yang diberikan kepada BPS sebaiknya tersusun sebagai berikut:

```text
ORBIT_FINAL_BPS_SULAWESI_UTARA/
├── README.md
├── 01_APLIKASI/
│   └── index.html
├── 02_DATABASE/
│   ├── supabase_schema_final_orbit_3_0_same_project_bps.sql
│   ├── cek_setelah_schema_final_orbit_3_0.sql
│   └── BACA_SEBELUM_RUN_SCHEMA_FINAL.txt
├── 03_DOKUMENTASI/
│   ├── GUIDE_BOOK_ORBIT_FINAL_3_0_BPS_SULAWESI_UTARA.pdf
│   ├── PANDUAN_CEPAT_PENGGUNA_HARIAN_ORBIT.pdf
│   └── CHECKLIST_UAT_DAN_SERAH_TERIMA_ORBIT.pdf
└── 04_VALIDASI/
    ├── HASIL_VALIDASI_SCHEMA.txt
    └── HASIL_UAT_YANG_SUDAH_DITANDATANGANI.pdf
```

### File yang tidak perlu diberikan sebagai setup utama

- Patch SQL pengembangan lama.
- File migration percobaan atau file perbaikan bertahap.
- Akun/data demo.
- Password pengguna.
- Supabase `service_role` key.

---

## 7. Cara Menjalankan Aplikasi pada Komputer Lokal

### Kebutuhan dasar

- Browser: Google Chrome atau Microsoft Edge terbaru.
- Koneksi internet untuk mengakses Supabase dan library CDN.
- Visual Studio Code dengan ekstensi **Live Server**, atau web server statis lainnya.

### Langkah menjalankan

1. Buka folder yang berisi `index.html` di Visual Studio Code.
2. Klik kanan pada `index.html`.
3. Pilih **Open with Live Server**.
4. Browser akan membuka aplikasi ORBIT.
5. Masuk menggunakan akun yang telah diaktifkan sesuai role.

> Jangan menjalankan aplikasi hanya dengan membuka file melalui `file://` apabila terjadi kendala akses; gunakan Live Server atau hosting resmi.

---

## 8. Konfigurasi Supabase

### Konfigurasi frontend

Di dalam `index.html`, aplikasi menggunakan dua nilai konfigurasi:

```javascript
const SUPABASE_URL  = '...';
const SUPABASE_ANON = '...';
```

Untuk project operasional yang sama, konfigurasi tersebut harus menunjuk ke project Supabase ORBIT milik BPS yang digunakan pada implementasi.

### Catatan keamanan konfigurasi

- `SUPABASE_ANON`/publishable key memang digunakan oleh frontend dan dilindungi oleh RLS/policy database.
- **Jangan pernah** menaruh `service_role` key di `index.html`, README, dokumen publik, atau file yang diberikan kepada pengguna biasa.
- Akses dashboard Supabase hanya diberikan kepada PIC teknis atau pihak berwenang.

---

## 9. Penerapan Schema Database pada Project Supabase yang Sama

### File database utama

```text
supabase_schema_final_orbit_3_0_same_project_bps.sql
```

File tersebut adalah schema konsolidasi final. Karena BPS menggunakan **project Supabase yang sama**, file ini digunakan sebagai berikut:

- Dijalankan **satu kali** oleh pengembang/PIC sebelum serah-terima resmi.
- Setelah berhasil, file disimpan dan diserahkan kepada BPS sebagai dokumentasi struktur database final.
- Tidak dijalankan ulang pada project aktif tanpa backup dan pemeriksaan PIC teknis.

### Langkah aman sebelum menjalankan schema

1. Pastikan project Supabase yang dibuka adalah project ORBIT yang benar.
2. Pastikan tidak ada pengguna yang sedang melakukan input atau proses keputusan pada waktu pembaruan.
3. Lakukan backup database serta file storage sesuai prosedur instansi.
4. Buka **Supabase Dashboard → SQL Editor → New Query**.
5. Salin seluruh isi file schema final dan jalankan sekaligus.
6. Setelah berhasil, jalankan file pengecekan:

```text
cek_setelah_schema_final_orbit_3_0.sql
```

7. Simpan screenshot atau hasil ekspor query pengecekan sebagai dokumen serah-terima.
8. Lakukan UAT sebelum aplikasi dipakai operasional.

### Struktur data utama

| Tabel | Kegunaan |
|---|---|
| `users` | Profil akun login, role, tim, dan status pengguna |
| `pegawai` | Master pegawai yang dinilai |
| `juri` | Profil Juri yang tersinkron dengan user ber-role Juri |
| `periode_bulanan` | Informasi periode operasional nilai |
| `nilai_final` | Nilai bulanan pegawai |
| `nominasi_final` | Enam kandidat final yang dikirim kepada Juri |
| `penilaian` | Nilai yang diberikan oleh Juri |
| `history_penghargaan` | Arsip pemenang triwulanan |
| `sertifikat` | Metadata sertifikat pemenang |
| `excel_uploads` | Metadata dokumen yang diunggah |
| `notifikasi` | Informasi/notifikasi pengguna |
| `audit_log` | Riwayat aksi penting |
| `permintaan_koreksi` | Catatan proses yang dikembalikan Verifikator |

### Fungsi utama database

| Function/RPC | Kegunaan |
|---|---|
| `get_kalender_operasional()` | Menentukan periode triwulan yang ditampilkan aplikasi |
| `simpan_nilai_bulanan_realtime(...)` | Menyimpan nilai bulanan sesuai periode yang diizinkan |
| `get_nominasi_bulanan_per_tim(...)` | Menampilkan pemenang bulanan masing-masing tim |
| `kirim_nominasi_ke_juri(...)` | Mengirim tepat enam kandidat final kepada Juri |
| `get_daftar_juri_status()` | Menampilkan kesiapan akun Juri |
| `simpan_penilaian_juri(...)` | Menyimpan nilai Juri terhadap kandidat |
| `get_ranking_live()` | Menyusun ranking hasil penilaian Juri |
| `kirim_ranking_ke_verifikator()` | Mengirim hasil lengkap kepada Verifikator |
| `tetapkan_pemenang(...)` | Menetapkan satu pemenang akhir triwulan |
| `kembalikan_ke_admin(...)` | Mengembalikan proses dengan alasan perbaikan |
| `buka_kembali_setelah_koreksi()` | Membuka tindak lanjut koreksi sesuai alur |

---

## 10. Sign Up, Sign In, dan Aktivasi Akun

### Alur akun baru

1. Pengguna melakukan **Sign Up** dari halaman login ORBIT menggunakan email yang benar.
2. Sistem mencatat profil awal pengguna sebagai akun menunggu persetujuan/pending.
3. Admin membuka menu **Kelola Pengguna**.
4. Admin memeriksa identitas pengguna, menentukan role dan tim, lalu mengaktifkan akun.
5. Pengguna login kembali dan memperoleh tampilan sesuai role.

### Akun pertama/PIC Admin

Apabila pada saat implementasi belum tersedia Admin aktif, PIC teknis mengikuti petunjuk aktivasi akun Admin pertama yang terdapat pada komentar bagian akhir file schema SQL final. Aktivasi hanya dilakukan untuk email resmi yang telah diverifikasi.

---

## 11. Panduan Penggunaan Ringkas per Role

### Admin

1. Masuk dengan akun Admin aktif.
2. Periksa master pegawai dan akun pengguna.
3. Input nilai pegawai setiap bulan.
4. Buka Dashboard dan lihat Nominasi Per Tim.
5. Pilih kandidat tertinggi dari masing-masing tim sampai Nominasi Final berisi enam kandidat.
6. Kirim enam kandidat kepada Juri.
7. Pantau hingga semua Juri mengisi nilai.
8. Kirim ranking kepada Verifikator.
9. Setelah pemenang ditetapkan, kelola arsip, laporan, dan sertifikat.

### Juri

1. Login menggunakan akun Juri aktif.
2. Buka menu Penilaian.
3. Nilai seluruh enam kandidat final.
4. Simpan nilai dan periksa kembali input milik sendiri.
5. Jaga kerahasiaan akun login.

### Verifikator

1. Login sebagai Verifikator.
2. Buka halaman Approval/Verifikasi.
3. Periksa ranking hasil penilaian Juri.
4. Tetapkan satu pemenang triwulan apabila hasil telah sesuai.
5. Apabila perlu perbaikan, kembalikan proses kepada Admin dengan alasan yang jelas.

---

## 12. Keamanan dan Pemeliharaan

### Praktik keamanan wajib

- Jangan membagikan password antar pengguna.
- Jangan memasukkan `service_role` key ke file frontend maupun dokumentasi.
- Gunakan role sesuai kewenangan kerja.
- Nonaktifkan akun yang tidak lagi berwenang.
- Simpan dokumen dan sertifikat melalui storage private yang disediakan sistem.
- Catat perubahan penting dan keputusan hasil melalui dokumen resmi instansi.

### Backup yang disarankan

| Waktu | Tindakan |
|---|---|
| Sebelum menjalankan schema final | Backup database dan storage |
| Sebelum proses finalisasi triwulan | Pastikan data nilai dan nominasi telah benar |
| Setelah pemenang ditetapkan | Simpan rekap hasil dan sertifikat |
| Secara berkala | Backup sesuai kebijakan keamanan informasi BPS |

---

## 13. Troubleshooting Singkat

| Kendala | Hal yang Perlu Diperiksa |
|---|---|
| Pengguna tidak bisa login | Status akun aktif, email/password, dan koneksi internet |
| User Juri belum dapat menilai | Pastikan user sudah sign up, role Juri, status aktif, dan muncul sebagai Siap Menilai |
| Nominasi Per Tim belum tampil | Pastikan nilai bulanan sudah diinput untuk periode yang ditampilkan |
| Tombol kirim ke Juri belum aktif | Pastikan tiga pemenang bulanan tersedia pada seluruh tim dan enam kandidat telah dipilih |
| Verifikator belum melihat hasil | Pastikan seluruh nilai Juri selesai dan Admin sudah mengirim ranking |
| Dokumen tidak dapat dibuka | Pastikan hak akses sesuai role dan storage private dapat membuat tautan akses |
| Ada pesan error sistem | Screenshot pesan, catat menu/role/periode, lalu hubungi PIC teknis tanpa mengirim password |

---

## 14. Pemeriksaan Sebelum Go-Live

Sebelum ORBIT digunakan secara resmi, pastikan:

- [ ] Backup database dan storage telah dilakukan.
- [ ] Schema konsolidasi final telah dijalankan satu kali pada project Supabase yang sama.
- [ ] Query pengecekan schema telah menunjukkan hasil sesuai.
- [ ] Akun Admin dapat login.
- [ ] Akun Juri tampil sebagai siap menilai.
- [ ] Akun Verifikator dapat login.
- [ ] Input nilai bulanan berhasil diuji.
- [ ] Nominasi Per Tim menampilkan pemenang bulanan.
- [ ] Enam kandidat final dapat dipilih dan dikirim kepada Juri.
- [ ] Juri dapat menyimpan nilai.
- [ ] Verifikator dapat menetapkan satu pemenang atau mengembalikan proses.
- [ ] Arsip dan sertifikat telah diuji.
- [ ] Checklist UAT telah ditandatangani PIC.

---

## 15. Informasi PIC dan Serah-Terima

Bagian ini dapat diisi ketika sistem diserahkan kepada BPS.

| Informasi | Isian |
|---|---|
| PIC Operasional |  |
| PIC Teknis/Supabase |  |
| Admin Utama |  |
| Admin Cadangan |  |
| Verifikator |  |
| Alamat website operasional |  |
| Tanggal schema final dijalankan |  |
| Lokasi penyimpanan backup |  |
| Tanggal UAT |  |
| Status go-live |  |

> Jangan menuliskan password atau kunci rahasia pada README maupun formulir serah-terima.

---

## 16. Dokumen Pendukung

Dokumen berikut menjadi pendamping README ini:

- Guide Book Operasional ORBIT.
- Panduan Cepat Pengguna Harian ORBIT.
- Checklist UAT dan Serah-Terima.
- Form Informasi PIC dan Akses.
- Schema Supabase konsolidasi final.
- Query pengecekan setelah schema final.
- Laporan magang “Rancang Bangun Website Pemilihan Pegawai Teladan Badan Pusat Statistik Provinsi Sulawesi Utara”.

---

## 17. Catatan Akhir

README ini menjelaskan fungsi, penggunaan, teknologi, alur database, keamanan, dan proses serah-terima ORBIT Final 3.0. Untuk operasional harian yang lebih rinci, gunakan **Guide Book Operasional** dan **Panduan Cepat Pengguna**. Sistem dinyatakan siap digunakan secara resmi setelah schema final diterapkan pada project Supabase yang sama, hasil pengecekan dinyatakan sesuai, dan UAT diselesaikan oleh PIC BPS.

---

**ORBIT — Outstanding Recognition & Benchmarking Tool**  
Portal Pegawai Teladan BPS Provinsi Sulawesi Utara

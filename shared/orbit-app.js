/* ====== SCRIPT BLOCK 1 ====== */
    /* =====================================================
       SUPABASE INIT
       Ganti dua nilai di bawah dengan milik Anda.
       Dapatkan di: Supabase Dashboard → Settings → API
       ===================================================== */
    const SUPABASE_URL = 'https://hfsxtekbieoicedkcacl.supabase.co';
    const SUPABASE_ANON = 'sb_publishable_wGIoFDT-2Clwzc32c1q7_Q_q2W_w95D';
    // Atur true hanya untuk presentasi lokal. Untuk penggunaan nyata biarkan false.
    const ENABLE_DEV_MODE = false;

    let db = null;
    try {
      const { createClient } = supabase;
      if (SUPABASE_URL !== 'GANTI_DENGAN_SUPABASE_URL_ANDA') {
        db = createClient(SUPABASE_URL, SUPABASE_ANON);
      }
    } catch (e) { console.warn('Supabase init skipped:', e.message); }

    /* =====================================================
       STATE
       ===================================================== */
    let currentUser = null;
    let currentRole = null;
    let currentProfile = null;
    let allPegawai = [];
    let finalNominee = [];
    let scoreModalCtx = { juriId: null, pegawaiId: null, juriNama: '', pegawaiNama: '' };
    let collapsed = false;
    let isDevMode = false;
    let allUsers = [];
    let editingUserId = null;
    let nominationLocked = false;

    const TIM_OPTIONS = ['Umum', 'Sosial', 'Produksi', 'Nerwilis', 'IPDS', 'Distribusi'];
    const ROLE_OPTIONS = ['pegawai', 'juri', 'verifikator', 'admin'];
    const STATUS_OPTIONS = ['aktif', 'pending', 'nonaktif'];
    const TIM_CLASS = { Umum: 'tim-umum', Sosial: 'tim-sosial', Produksi: 'tim-produksi', Nerwilis: 'tim-nerwilis', IPDS: 'tim-ipds', Distribusi: 'tim-distribusi' };
    const BULAN_TRIW = { 1: ['Januari', 'Februari', 'Maret'], 2: ['April', 'Mei', 'Juni'], 3: ['Juli', 'Agustus', 'September'], 4: ['Oktober', 'November', 'Desember'] };
    const BULAN_NUM = { Januari: 1, Februari: 2, Maret: 3, April: 4, Mei: 5, Juni: 6, Juli: 7, Agustus: 8, September: 9, Oktober: 10, November: 11, Desember: 12 };

    /* =====================================================
       ICONS SVG HELPERS
       ===================================================== */
    const ICON = {
      dash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      input: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>`,
      users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      award: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
      check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      hist: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
      report: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
      sert: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="18.5" cy="18.5" r="2.5"/><polyline points="4 6 4 2 3 2"/><line x1="1" y1="2" x2="7" y2="2"/></svg>`,
      verf: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      profil: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      chev: `<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
    };

    /* =====================================================
       SECURITY & FORMAT HELPERS
       ===================================================== */
    function esc(value = '') {
      return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    }
    function roleLabel(role = 'pegawai') {
      return ({ pegawai: 'Pegawai', juri: 'Juri', verifikator: 'Verifikator', admin: 'Admin' })[(role || 'pegawai').toLowerCase()] || role;
    }
    function roleClass(role = 'pegawai') { return `role-${(role || 'pegawai').toLowerCase()}`; }
    function statusClass(status = 'pending') { return `status-${(status || 'pending').toLowerCase()}`; }
    function isActiveProfile(profile) { return (profile?.status || 'aktif').toLowerCase() === 'aktif'; }
    function requireDb() { if (!db) { toast('Koneksi Supabase belum tersedia. Periksa konfigurasi dan jaringan.', 'error'); return false; } return true; }

    /* =====================================================
       TOAST
       ===================================================== */
    function toast(msg, type = 'info') {
      const el = document.getElementById('toast');
      el.textContent = msg; el.className = `${type} show`;
      setTimeout(() => { el.className = `${type} hide`; }, 3000);
    }

    /* =====================================================
       TOPBAR DATE
       ===================================================== */
    (function() {
      const el = document.getElementById('topbar-date');
      if (el) el.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    })();

    /* =====================================================
       AUTH: SIGN IN / SIGN UP
       ===================================================== */
    function switchAuth(mode) {
      const signIn = mode === 'signin';
      document.getElementById('signin-form').classList.toggle('hidden', !signIn);
      document.getElementById('signup-form').classList.toggle('hidden', signIn);
      document.getElementById('tab-signin').classList.toggle('active', signIn);
      document.getElementById('tab-signup').classList.toggle('active', !signIn);
      document.getElementById('auth-title').textContent = signIn ? 'MASUK' : 'DAFTAR';
      document.getElementById('auth-subtitle').textContent = signIn ? 'Akses portal sesuai peran akun Anda' : 'Buat akun pengguna baru';
    }
    async function doSignUp() {
      if (!requireDb()) return;
      const nama = document.getElementById('signup-nama').value.trim();
      const email = document.getElementById('signup-email').value.trim().toLowerCase();
      const tim = document.getElementById('signup-tim').value;
      const pass = document.getElementById('signup-pass').value;
      const pass2 = document.getElementById('signup-pass2').value;
      if (!nama || !email || !tim || !pass || !pass2) { toast('Semua data pendaftaran harus diisi.', 'error'); return; }
      if (pass.length < 8) { toast('Password minimal 8 karakter.', 'error'); return; }
      if (pass !== pass2) { toast('Konfirmasi password belum sama.', 'error'); return; }
      const btn = document.getElementById('signup-btn');
      btn.disabled = true; btn.textContent = 'MENDAFTARKAN...';
      const { error } = await db.auth.signUp({ email, password: pass, options: { data: { nama, tim } } });
      btn.disabled = false; btn.textContent = 'DAFTAR AKUN';
      if (error) { toast('Pendaftaran gagal: ' + error.message, 'error'); return; }
      document.getElementById('login-email').value = email;
      document.getElementById('login-pass').value = '';
      ['signup-nama', 'signup-email', 'signup-pass', 'signup-pass2'].forEach(id => document.getElementById(id).value = '');
      switchAuth('signin');
      toast('Pendaftaran berhasil. Verifikasi email lalu tunggu akun diaktifkan Admin.', 'success');
    }

    /* =====================================================
       AUTH: DEV BYPASS (tanpa Supabase)
       ===================================================== */
    function devLogin(role) {
      isDevMode = true;
      currentRole = role;
      currentUser = { id: 'dev-user', email: `dev.${role}@orbit.local` };
      currentProfile = { nama: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`, email: currentUser.email, role };
      // tampilkan dev banner
      const banner = document.getElementById('dev-banner');
      if (banner) { banner.style.display = 'flex'; }
      const devLabel = document.getElementById('dev-role-label');
      if (devLabel) devLabel.textContent = role.toUpperCase();
      // Multi-page: redirect ke halaman role yang sesuai
      if (!document.getElementById('page-login')) {
        bootApp();
      } else {
        const rolePages = { admin: 'admin.html', juri: 'juri.html', verifikator: 'verifikator.html', pegawai: 'pegawai.html' };
        if (rolePages[role]) { window.location.href = rolePages[role]; return; }
        bootApp();
      }
      toast(`Masuk sebagai ${role.toUpperCase()} (Dev Mode — tanpa Supabase)`, 'info', 5000);
    }

    /* =====================================================
       AUTH: LOGIN SUPABASE
       ===================================================== */
    async function doLogin() {
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const pass = document.getElementById('login-pass').value;
      if (!email || !pass) { toast('Isi email dan password.', 'error'); return; }
      if (!requireDb()) return;

      const btn = document.getElementById('login-btn');
      btn.textContent = 'MASUK...'; btn.disabled = true;
      const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
      if (error) { toast('Login gagal: ' + error.message, 'error'); btn.textContent = 'MASUK'; btn.disabled = false; return; }

      let { data: profile } = await db.from('users').select('*').eq('auth_id', data.user.id).maybeSingle();
      if (!profile) {
        const fallback = await db.from('users').select('*').eq('email', email).maybeSingle();
        profile = fallback.data;
      }
      if (!profile) {
        await db.auth.signOut();
        toast('Profil akun belum tersedia. Jalankan setup database atau hubungi Admin.', 'error');
        btn.textContent = 'MASUK'; btn.disabled = false; return;
      }
      if (!isActiveProfile(profile)) {
        await db.auth.signOut();
        const msg = profile.status === 'pending' ? 'Akun masih menunggu persetujuan Admin.' : 'Akun dinonaktifkan. Hubungi Admin.';
        toast(msg, 'error'); btn.textContent = 'MASUK'; btn.disabled = false; return;
      }

      currentUser = data.user; currentProfile = profile; currentRole = (profile.role || 'pegawai').toLowerCase();
      btn.textContent = 'MASUK'; btn.disabled = false;
      // Multi-page: redirect ke halaman role
      const rolePages = { admin: 'admin.html', juri: 'juri.html', verifikator: 'verifikator.html', pegawai: 'pegawai.html' };
      const dest = rolePages[currentRole] || 'pegawai.html';
      window.location.href = dest;
    }
    async function doLogout() {
      if (!isDevMode && db) await db.auth.signOut();
      currentUser = null; currentRole = null; currentProfile = null;
      isDevMode = false; allPegawai = [];
      // Multi-page: selalu redirect ke index.html (login)
      window.location.href = 'index.html';
    }

    /* =====================================================
       SESSION CHECK ON LOAD
       ===================================================== */
    window.addEventListener('DOMContentLoaded', async () => {
      const isLoginPage = Boolean(document.getElementById('page-login'));

      if (isLoginPage) {
        // ===== HALAMAN LOGIN (index.html) =====
        const devAccess = document.getElementById('dev-access');
        if (devAccess) devAccess.classList.toggle('hidden', !ENABLE_DEV_MODE);
        if (!db) return;
        try {
          const { data: { session } } = await db.auth.getSession();
          if (!session) return;
          currentUser = session.user;
          let { data: profile } = await db.from('users').select('*').eq('auth_id', currentUser.id).maybeSingle();
          if (!profile) {
            const fallback = await db.from('users').select('*').eq('email', currentUser.email).maybeSingle();
            profile = fallback.data;
          }
          if (!profile || !isActiveProfile(profile)) { await db.auth.signOut(); return; }
          currentProfile = profile; currentRole = (profile.role || 'pegawai').toLowerCase();
          // Sudah login: redirect ke halaman role
          const rolePages = { admin: 'admin.html', juri: 'juri.html', verifikator: 'verifikator.html', pegawai: 'pegawai.html' };
          window.location.href = rolePages[currentRole] || 'pegawai.html';
        } catch (e) { console.warn('Session check error:', e); }

      } else {
        // ===== HALAMAN ROLE (admin/juri/verifikator/pegawai.html) =====
        // Auth Guard: cek sesi Supabase dan role
        if (!db) { bootApp(); return; } // dev mode tanpa supabase
        try {
          const { data: { session } } = await db.auth.getSession();
          if (!session) { window.location.href = 'index.html'; return; }
          currentUser = session.user;
          let { data: profile } = await db.from('users').select('*').eq('auth_id', currentUser.id).maybeSingle();
          if (!profile) {
            const fallback = await db.from('users').select('*').eq('email', currentUser.email).maybeSingle();
            profile = fallback.data;
          }
          if (!profile || !isActiveProfile(profile)) { await db.auth.signOut(); window.location.href = 'index.html'; return; }
          currentProfile = profile; currentRole = (profile.role || 'pegawai').toLowerCase();
          // Validasi role sesuai halaman
          const pageFile = window.location.pathname.split('/').pop();
          const roleForPage = { 'admin.html': 'admin', 'juri.html': 'juri', 'verifikator.html': 'verifikator', 'pegawai.html': 'pegawai' };
          const expectedRole = roleForPage[pageFile];
          if (expectedRole && currentRole !== expectedRole) {
            const correctPage = { admin: 'admin.html', juri: 'juri.html', verifikator: 'verifikator.html', pegawai: 'pegawai.html' }[currentRole] || 'index.html';
            window.location.href = correctPage; return;
          }
          bootApp();
        } catch (e) { console.warn('Session check error:', e); window.location.href = 'index.html'; }
      }
    });

    /* =====================================================
       BOOT APP
       ===================================================== */
    function bootApp() {
      // Single-page mode (index.html): toggle login/app visibility
      const loginEl = document.getElementById('page-login');
      const appEl = document.getElementById('app');
      if (loginEl) loginEl.classList.add('hidden');
      if (appEl) appEl.classList.remove('hidden');
      renderSidebar();
      updateSidebarProfile();
      collapsed = window.innerWidth > 900 && localStorage.getItem('orbit_sidebar_collapsed') === 'true';
      applySidebarState();
      if (currentRole === 'admin') navigate('admin-dash');
      else if (currentRole === 'juri') navigate('juri-dash');
      else if (currentRole === 'verifikator') navigate('verf-dash');
      else navigate('pegawai-dash');
    }

    /* =====================================================
       SIDEBAR
       ===================================================== */
    function renderSidebar() {
      const nav = document.getElementById('sb-nav');
      let html = '';

      if (currentRole === 'admin') {
        html += sbSection('Admin');
        html += sbItem('admin-dash', ICON.dash, 'Dashboard');
        html += sbItem('admin-input', ICON.input, 'Input Nilai Bulanan');
        html += sbItem('admin-upload', ICON.upload, 'Upload Dokumen');
        html += sbItem('admin-users', ICON.users, 'Kelola Pengguna');
        html += sbItem('admin-pegawai', ICON.users, 'Kelola Pegawai');
        html += sbItem('admin-laporan', ICON.report, 'Generate Laporan');
        html += sbItemDrop();
        html += sbItem('admin-juri', ICON.award, 'Penilaian Juri');
        html += sbItem('admin-notif', ICON.bell, 'Notifikasi');
        html += sbItem('admin-approval', ICON.verf, 'Approval Monitor');
        html += sbItem('admin-history', ICON.hist, 'Arsip / History');
      } else if (currentRole === 'juri') {
        html += sbSection('Juri');
        html += sbItem('juri-dash', ICON.dash, 'Dashboard');
        html += sbItem('juri-penilaian', ICON.award, 'Penilaian');
        html += sbItem('juri-riwayat', ICON.hist, 'Riwayat');
        html += sbItem('juri-profil', ICON.profil, 'Profil');
        html += sbItem('juri-notif', ICON.bell, 'Notifikasi');
      } else if (currentRole === 'verifikator') {
        html += sbSection('Verifikator');
        html += sbItem('verf-dash', ICON.dash, 'Dashboard');
        html += sbItem('verf-verif', ICON.verf, 'Verifikasi Nilai');
        html += sbItem('verf-riwayat', ICON.hist, 'Riwayat');
        html += sbItem('verf-notif', ICON.bell, 'Notifikasi');
      } else {
        html += sbSection('Pegawai');
        html += sbItem('pegawai-dash', ICON.dash, 'Dashboard');
        html += sbItem('pegawai-profil', ICON.profil, 'Profil Saya');
        html += sbItem('pegawai-riwayat', ICON.hist, 'Arsip / History');
      }
      nav.innerHTML = html;
    }

    function sbSection(label) { return `<div class="sb-section">${label}</div>`; }
    function sbItem(page, icon, label) {
      return `<a class="sb-item" id="nav-${page}" title="${label}" aria-label="${label}" onclick="navigate('${page}')" href="javascript:void(0)">${icon}<span>${label}</span></a>`;
    }
    function sbItemDrop() {
      return `<div>
    <button class="sb-item sb-drop-toggle" id="sert-toggle" title="Sertifikat" aria-label="Sertifikat" onclick="toggleSertDrop(this)">
      <div class="flex items-center gap-2">${ICON.sert}<span>Sertifikat</span></div>${ICON.chev}
    </button>
    <div id="sert-sub" class="sb-sub hidden">
      ${sbItem('admin-sert-upload', ICON.upload, 'Upload Sertifikat')}
      ${sbItem('admin-sert-lihat', ICON.input, 'Lihat Sertifikat')}
    </div>
  </div>`;
    }
    function toggleSertDrop(btn) {
      const sub = document.getElementById('sert-sub');
      btn.classList.toggle('open'); sub.classList.toggle('hidden');
    }
    function updateSidebarProfile() {
      const p = currentProfile;
      if (!p) return;
      const initial = (p.nama || p.email || 'U')[0].toUpperCase();
      document.getElementById('sb-avatar').textContent = initial;
      const topAvatar = document.getElementById('topbar-avatar');
      if (topAvatar) topAvatar.textContent = initial;
      document.getElementById('sb-name').textContent = p.nama || p.email || 'User';
      document.getElementById('sb-role').textContent = p.role || 'User';
    }
    function applySidebarState() {
      const sidebar = document.getElementById('sidebar');
      const main = document.getElementById('main');
      const label = document.getElementById('collapse-label');
      const icon = document.getElementById('collapse-icon');
      const sub = document.getElementById('sert-sub');
      const sertToggle = document.getElementById('sert-toggle');
      sidebar.classList.toggle('collapsed', collapsed);
      main.classList.toggle('sidebar-collapsed', collapsed);
      if (label) label.textContent = collapsed ? '' : 'Ciutkan Sidebar';
      if (collapsed && sub) sub.classList.add('hidden');
      if (collapsed && sertToggle) sertToggle.classList.remove('open');
      if (icon) icon.innerHTML = collapsed
        ? `<path d="M13 5l7 7-7 7M6 5l7 7-7 7"/>`
        : `<path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>`;
    }
    function collapseToggle() {
      collapsed = !collapsed;
      localStorage.setItem('orbit_sidebar_collapsed', String(collapsed));
      applySidebarState();
    }
    function toggleSidebar() {
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('sb-overlay');
      sb.classList.toggle('mobile-open');
      ov.classList.toggle('hidden');
    }

    /* =====================================================
       NAVIGATION / ROUTER
       ===================================================== */
    function navigate(page) {
      // hide all pages
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      // deactivate nav items
      document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
      // show target
      const el = document.getElementById('page-' + page);
      if (el) el.classList.remove('hidden');
      const navEl = document.getElementById('nav-' + page);
      if (navEl) navEl.classList.add('active');

      // set topbar title
      const titles = {
        'admin-dash': 'Dashboard', 'admin-input': 'Input Nilai', 'admin-upload': 'Upload Dokumen',
        'admin-users': 'Kelola Pengguna', 'admin-pegawai': 'Kelola Pegawai', 'admin-laporan': 'Laporan', 'admin-sert-upload': 'Upload Sertifikat',
        'admin-sert-lihat': 'Lihat Sertifikat', 'admin-juri': 'Penilaian Juri', 'admin-notif': 'Notifikasi',
        'admin-approval': 'Approval Monitor', 'admin-history': 'Arsip',
        'juri-dash': 'Dashboard Juri', 'juri-penilaian': 'Penilaian', 'juri-riwayat': 'Riwayat', 'juri-profil': 'Profil',
        'verf-dash': 'Dashboard Verifikator', 'verf-verif': 'Verifikasi Nilai', 'verf-riwayat': 'Riwayat',
        'juri-notif': 'Notifikasi', 'verf-notif': 'Notifikasi',
        'pegawai-dash': 'Dashboard Pegawai', 'pegawai-profil': 'Profil Saya', 'pegawai-riwayat': 'Arsip',
      };
      document.getElementById('topbar-title').textContent = titles[page] || page;

      // load data per page
      if (page === 'admin-dash') loadAdminDash();
      if (page === 'admin-input') loadInputNilai();
      if (page === 'admin-upload') loadUploadedFiles();
      if (page === 'admin-users') loadPengguna();
      if (page === 'admin-pegawai') loadMasterPegawai();
      if (page === 'admin-laporan') { }
      if (page === 'admin-sert-upload') { loadSertList(); loadPegawaiSelect('sert-pegawai'); }
      if (page === 'admin-sert-lihat') loadSertLihat();
      if (page === 'admin-juri') { loadJuriList(); loadMonitoring(); }
      if (page === 'admin-notif') loadNotif();
      if (page === 'admin-approval') loadApprovalMonitor();
      if (page === 'admin-history') loadHistory('history-years', 'history-content');
      if (page === 'juri-dash') loadJuriDash();
      if (page === 'juri-penilaian') loadJuriPenilaian();
      if (page === 'juri-riwayat') loadHistory('juri-hist-years', 'juri-hist-content');
      if (page === 'juri-profil') loadJuriProfil();
      if (page === 'juri-notif') loadNotifUser('juri-notif-list', 'juri');
      if (page === 'verf-dash') loadVerfDash();
      if (page === 'verf-verif') loadVerifNominasi();
      if (page === 'verf-riwayat') loadHistory('verf-hist-years', 'verf-hist-content');
      if (page === 'verf-notif') loadNotifUser('verf-notif-list', 'verifikator');
      if (page === 'pegawai-dash') loadPegawaiDash();
      if (page === 'pegawai-profil') loadPegawaiProfil();
      if (page === 'pegawai-riwayat') loadHistory('pegawai-hist-years', 'pegawai-hist-content');

      // close mobile sidebar
      document.getElementById('sidebar').classList.remove('mobile-open');
      document.getElementById('sb-overlay').classList.add('hidden');
    }

    /* =====================================================
       ADMIN: DASHBOARD
       ===================================================== */

    function statCard(icon, title, val, sub) {
      return `<div class="stat-card"><div class="stat-icon">${icon}</div><div><div class="stat-title">${title}</div><div class="stat-val">${val ?? 0}</div><div class="stat-sub">${sub}</div></div></div>`;
    }
    function qaBtn(page, icon, label) {
      return `<div class="qa-btn" onclick="navigate('${page}')">${icon}<span>${label}</span></div>`;
    }









    /* =====================================================
       ADMIN: INPUT NILAI
       ===================================================== */
    async function loadInputNilai() {
      if (!db) { toast('Hubungkan Supabase untuk menggunakan fitur ini', 'warn'); return; }
      await loadPegawaiSelect('in-pegawai');
      await loadDataNilai();
    }
    function updateBulanOptions() {
      const triw = document.getElementById('in-triw').value;
      const sel = document.getElementById('in-bulan');
      sel.innerHTML = '<option value="">Pilih Bulan</option>';
      if (triw && BULAN_TRIW[triw]) BULAN_TRIW[triw].forEach(b => { sel.innerHTML += `<option>${b}</option>`; });
    }

    /* =====================================================
       ADMIN: UPLOAD EXCEL
       ===================================================== */
    let selectedUploadFile = null;
    function handleFileSelect(e) {
      selectedUploadFile = e.target.files[0];
      document.getElementById('file-name').textContent = selectedUploadFile ? selectedUploadFile.name : 'Pilih file...';
    }

    /* =====================================================
       ADMIN: KELOLA PENGGUNA, ROLE & DIVISI
       ===================================================== */
    async function loadPengguna() {
      if (!requireDb()) return;
      const { data: users, error } = await db.from('users').select('*').order('nama');
      const target = document.getElementById('user-list');
      if (error) { if (target) target.innerHTML = `<div class="empty-state">Gagal memuat pengguna: ${esc(error.message)}</div>`; return; }
      allUsers = users || [];
      renderPenggunaStats();
      renderPengguna();
    }
    function renderPenggunaStats() {
      const el = document.getElementById('user-stats');
      if (!el) return;
      const counts = ROLE_OPTIONS.map(role => ({
        role,
        count: allUsers.filter(u => (u.role || 'pegawai').toLowerCase() === role && (u.status || 'pending') === 'aktif').length
      }));
      el.innerHTML = counts.map(item => `<div class="stat-card"><div class="stat-icon">${ICON.users}</div><div><div class="stat-title">${roleLabel(item.role)} Aktif</div><div class="stat-val">${item.count}</div><div class="stat-sub">Akun aktif</div></div></div>`).join('');
    }
    function renderPengguna() {
      const q = (document.getElementById('search-user')?.value || '').toLowerCase();
      const roleFilter = document.getElementById('filter-user-role')?.value || '';
      const timFilter = document.getElementById('filter-user-tim')?.value || '';
      const list = allUsers.filter(u => {
        const matchText = !q || `${u.nama || ''} ${u.email || ''}`.toLowerCase().includes(q);
        return matchText && (!roleFilter || u.role === roleFilter) && (!timFilter || u.tim === timFilter);
      });
      const el = document.getElementById('user-list');
      if (!el) return;
      if (!list.length) { el.innerHTML = '<div class="panel"><div class="empty-state">Tidak ada pengguna sesuai filter.</div></div>'; return; }
      el.innerHTML = `<div class="panel"><div class="sec-head"><h2>Daftar Pengguna <span style="font-family:Rajdhani;font-size:13px;color:var(--text-3)">(${list.length})</span></h2></div>` + list.map(u => `
    <div class="user-row">
      <div><div style="font-size:15px;font-weight:700">${esc(u.nama || '-')}</div><div class="text-xs" style="color:var(--text-3);margin-top:3px">${esc(u.email || 'Belum memiliki akun login')}</div></div>
      <select aria-label="Role ${esc(u.nama)}" onchange="ubahRolePengguna('${u.id}',this.value)">${ROLE_OPTIONS.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${roleLabel(r)}</option>`).join('')}</select>
      <select aria-label="Divisi ${esc(u.nama)}" onchange="ubahDivisiPengguna('${u.id}',this.value)">${TIM_OPTIONS.map(t => `<option ${t === u.tim ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <span class="status-pill ${statusClass(u.status)}">${esc(u.status || 'pending')}</span>
      <div class="flex gap-2 user-actions">
        <button class="btn btn-ghost btn-xs" onclick="editPengguna('${u.id}')">Edit</button>
        <button class="btn ${u.status === 'aktif' ? 'btn-danger' : 'btn-success'} btn-xs" onclick="toggleStatusPengguna('${u.id}','${u.status || 'pending'}')">${u.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
      </div>
    </div>`).join('') + '</div>';
    }
    function editPengguna(id) {
      const u = allUsers.find(item => item.id === id); if (!u) return;
      editingUserId = id;
      document.getElementById('user-new-nama').value = u.nama || '';
      document.getElementById('user-new-email').value = u.email || '';
      document.getElementById('user-new-role').value = u.role || 'pegawai';
      document.getElementById('user-new-tim').value = u.tim || 'Umum';
      document.getElementById('user-new-status').value = u.status || 'pending';
      document.getElementById('user-form-title').textContent = 'Edit Pengguna';
      document.getElementById('save-user-btn').textContent = 'Simpan Perubahan';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function resetUserForm() {
      editingUserId = null;
      ['user-new-nama', 'user-new-email'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('user-new-role').value = 'pegawai';
      document.getElementById('user-new-tim').value = 'Umum';
      document.getElementById('user-new-status').value = 'aktif';
      document.getElementById('user-form-title').textContent = 'Tambah Pengguna';
      document.getElementById('save-user-btn').textContent = '+ Simpan Pengguna';
    }
    async function ubahRolePengguna(id, role) {
      const { error } = await db.from('users').update({ role }).eq('id', id);
      if (error) { toast('Gagal mengubah role: ' + error.message, 'error'); return; }
      toast(`Role berhasil diubah menjadi ${roleLabel(role)}. Daftar pegawai/juri telah disesuaikan.`, 'success');
      loadPengguna();
    }
    async function ubahDivisiPengguna(id, tim) {
      const { error } = await db.from('users').update({ tim }).eq('id', id);
      if (error) { toast('Gagal mengubah divisi: ' + error.message, 'error'); return; }
      toast('Divisi pengguna berhasil diperbarui.', 'success');
      loadPengguna();
    }
    async function toggleStatusPengguna(id, status) {
      const next = status === 'aktif' ? 'nonaktif' : 'aktif';
      const { error } = await db.from('users').update({ status: next }).eq('id', id);
      if (error) { toast('Gagal memperbarui status: ' + error.message, 'error'); return; }
      toast(`Status akun menjadi ${next}.`, 'success');
      loadPengguna();
    }

    /* =====================================================
       ADMIN: KELOLA PEGAWAI — MASTER DATA
       ===================================================== */
    let editingPegawaiId = null;

    async function loadMasterPegawai() {
      if (!requireDb()) return;
      const { data, error } = await db.from('pegawai').select('*').order('nama');
      const el = document.getElementById('pegawai-master-list');
      if (error) { if (el) el.innerHTML = `<div class="empty-state">Gagal memuat pegawai: ${esc(error.message)}</div>`; return; }
      allPegawai = data || [];
      renderMasterPegawaiStats();
      renderMasterPegawai();
    }
    function renderMasterPegawaiStats() {
      const el = document.getElementById('pegawai-master-stats');
      if (!el) return;
      el.innerHTML = TIM_OPTIONS.map(tim => {
        const count = allPegawai.filter(p => p.tim === tim && (p.status || 'aktif') === 'aktif').length;
        return `<div class="stat-card" style="min-width:0"><div class="stat-icon" style="background:var(--bg-input)">${ICON.users}</div>
      <div><div class="stat-title" style="font-size:11px">${tim}</div><div class="stat-val" style="font-size:22px">${count}</div><div class="stat-sub">Pegawai aktif</div></div></div>`;
      }).join('');
    }
    function renderMasterPegawai() {
      const search = (document.getElementById('search-pegawai-master')?.value || '').toLowerCase();
      const timFilter = document.getElementById('filter-pegawai-tim')?.value || '';
      const statusFilter = document.getElementById('filter-pegawai-status')?.value || '';
      const filtered = allPegawai.filter(p => {
        const status = p.status || 'aktif';
        return (!search || (p.nama || '').toLowerCase().includes(search))
          && (!timFilter || p.tim === timFilter)
          && (!statusFilter || status === statusFilter);
      });
      const el = document.getElementById('pegawai-master-list');
      if (!el) return;
      if (!filtered.length) { el.innerHTML = '<div class="panel"><div class="empty-state">Tidak ada pegawai sesuai filter.</div></div>'; return; }
      const grouped = {};
      filtered.forEach(p => { if (!grouped[p.tim]) grouped[p.tim] = []; grouped[p.tim].push(p); });
      let html = '';
      Object.entries(grouped).forEach(([tim, list]) => {
        html += `<div class="panel mb-4"><div class="sec-head"><h2>${esc(tim)} <span style="font-family:Rajdhani;font-size:13px;color:var(--text-3)">(${list.length})</span></h2></div>`;
        list.forEach(p => {
          const status = p.status || 'aktif';
          html += `<div class="pegawai-row">
        <div>
          <div style="font-weight:700">${esc(p.nama)}</div>
          <div class="flex gap-2 mt-2"><span class="badge ${TIM_CLASS[p.tim] || 'badge-cyan'}">${esc(p.tim)}</span><span class="status-pill ${statusClass(status)}">${esc(status)}</span></div>
        </div>
        <div class="flex gap-2" style="align-items:center">
          <select aria-label="Divisi ${esc(p.nama)}" onchange="updateTimPegawaiMaster('${p.id}',this.value)" style="padding:6px 10px;font-size:12px;width:auto">
            ${TIM_OPTIONS.map(t => `<option ${t === p.tim ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-xs" onclick="editPegawaiMaster('${p.id}')">Edit</button>
          <button class="btn ${status === 'aktif' ? 'btn-danger' : 'btn-success'} btn-xs" onclick="toggleStatusPegawaiMaster('${p.id}','${status}')">${status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>
        </div>
      </div>`;
        });
        html += '</div>';
      });
      el.innerHTML = html;
    }
    async function simpanPegawaiMaster() {
      if (!requireDb()) return;
      const nama = document.getElementById('pegawai-new-nama').value.trim();
      const tim = document.getElementById('pegawai-new-tim').value;
      const status = document.getElementById('pegawai-new-status').value;
      if (!nama) { toast('Nama pegawai wajib diisi.', 'error'); return; }
      const payload = { nama, tim, status };
      const result = editingPegawaiId
        ? await db.from('pegawai').update(payload).eq('id', editingPegawaiId)
        : await db.from('pegawai').insert(payload);
      if (result.error) { toast('Gagal menyimpan pegawai: ' + result.error.message, 'error'); return; }
      toast(editingPegawaiId ? 'Data pegawai berhasil diperbarui.' : 'Pegawai berhasil ditambahkan.', 'success');
      resetPegawaiForm();
      loadMasterPegawai();
    }
    function editPegawaiMaster(id) {
      const p = allPegawai.find(item => item.id === id); if (!p) return;
      editingPegawaiId = id;
      document.getElementById('pegawai-new-nama').value = p.nama || '';
      document.getElementById('pegawai-new-tim').value = p.tim || 'Umum';
      document.getElementById('pegawai-new-status').value = p.status || 'aktif';
      document.getElementById('pegawai-form-title').textContent = 'Edit Pegawai';
      document.getElementById('save-pegawai-btn').textContent = 'Simpan Perubahan';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function resetPegawaiForm() {
      editingPegawaiId = null;
      document.getElementById('pegawai-new-nama').value = '';
      document.getElementById('pegawai-new-tim').value = 'Umum';
      document.getElementById('pegawai-new-status').value = 'aktif';
      document.getElementById('pegawai-form-title').textContent = 'Tambah Pegawai';
      document.getElementById('save-pegawai-btn').textContent = '+ Simpan Pegawai';
    }
    async function updateTimPegawaiMaster(id, tim) {
      const { error } = await db.from('pegawai').update({ tim }).eq('id', id);
      if (error) { toast('Gagal mengubah divisi: ' + error.message, 'error'); return; }
      toast('Divisi pegawai berhasil diperbarui.', 'success');
      loadMasterPegawai();
    }
    async function toggleStatusPegawaiMaster(id, status) {
      const next = status === 'aktif' ? 'nonaktif' : 'aktif';
      const { error } = await db.from('pegawai').update({ status: next }).eq('id', id);
      if (error) { toast('Gagal memperbarui status pegawai: ' + error.message, 'error'); return; }
      toast(`Status pegawai menjadi ${next}.`, 'success');
      loadMasterPegawai();
    }

    /* =====================================================
       ADMIN: LAPORAN
       ===================================================== */

    /* =====================================================
       ADMIN: SERTIFIKAT
       ===================================================== */
    let selectedSertFile = null;
    function sertFileSelect(e) { selectedSertFile = e.target.files[0]; document.getElementById('sert-file-name').textContent = selectedSertFile ? selectedSertFile.name : 'Upload file sertifikat'; }

    /* =====================================================
       ADMIN: PENILAIAN JURI
       ===================================================== */
    function tambahJuri() { navigate('admin-users'); toast('Tambahkan atau ubah role pengguna menjadi Juri.', 'info'); }
    function hapusJuri() { navigate('admin-users'); toast('Nonaktifkan atau ubah role juri dari menu Kelola Pengguna.', 'info'); }

    /* =====================================================
       ADMIN: NOTIFIKASI
       ===================================================== */
    async function simpanNotif() {
      const judul = document.getElementById('notif-judul').value.trim();
      const pesan = document.getElementById('notif-pesan').value.trim();
      const role = document.getElementById('notif-role').value;
      const deadline = document.getElementById('notif-deadline').value;
      const tipe = document.getElementById('notif-tipe').value;
      if (!judul || !pesan || !role) { toast('Isi semua field wajib', 'error'); return; }
      const { error } = await db.from('notifikasi').insert({ judul, pesan, role_target: role, deadline, tipe });
      if (error) { toast('Gagal menyimpan notifikasi', 'error'); return; }
      toast('Notifikasi berhasil dibuat!', 'success');
      ['notif-judul', 'notif-pesan', 'notif-deadline'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('notif-role').value = '';
      loadNotif();
    }
    async function hapusNotif(id) {
      if (!confirm('Hapus notifikasi ini?')) return;
      await db.from('notifikasi').delete().eq('id', id);
      toast('Notifikasi dihapus', 'info');
      loadNotif();
    }


    /* =====================================================
       ADMIN: APPROVAL MONITOR
       ===================================================== */

    /* =====================================================
       ADMIN: HISTORY
       ===================================================== */

    /* =====================================================
       JURI: DASHBOARD
       ===================================================== */

    /* =====================================================
       JURI: PENILAIAN
       ===================================================== */

    /* SCORE MODAL */
    function closeScoreModal() { document.getElementById('score-modal').classList.add('hidden'); }

    /* =====================================================
       JURI: PROFIL
       ===================================================== */
    function loadJuriProfil() {
      const p = currentProfile;
      if (!p) return;
      document.getElementById('profil-avatar').textContent = (p.nama || p.email || 'J')[0].toUpperCase();
      document.getElementById('profil-nama').textContent = p.nama || '-';
      document.getElementById('profil-email').textContent = p.email || '-';
      document.getElementById('profil-role').textContent = p.role || 'juri';
    }


    /* =====================================================
       PEGAWAI: DASHBOARD & PROFIL
       ===================================================== */
    async function loadPegawaiDash() {
      const p = currentProfile || {};
      document.getElementById('pegawai-dash-stats').innerHTML = `
    ${statCard(ICON.profil, 'Role', roleLabel(p.role), 'Akses akun')}
    ${statCard(ICON.users, 'Divisi', esc(p.tim || '-'), 'Penempatan saat ini')}
    ${statCard(ICON.check, 'Status', esc(p.status || '-'), 'Status akses')}`;
      document.getElementById('pegawai-info').innerHTML = `
    <div style="font-size:19px;font-weight:700">${esc(p.nama || '-')}</div>
    <div class="text-sm" style="color:var(--text-2);margin:4px 0 14px">${esc(p.email || '-')}</div>
    <span class="badge ${roleClass(p.role)}">${roleLabel(p.role)}</span>
    <span class="badge ${TIM_CLASS[p.tim] || 'badge-cyan'}" style="margin-left:6px">${esc(p.tim || '-')}</span>`;
      await loadNotifUser('pegawai-notif-list', 'pegawai');
    }
    function loadPegawaiProfil() {
      const p = currentProfile || {};
      document.getElementById('pegawai-profil-content').innerHTML = `
    <div style="text-align:center;margin-bottom:22px"><div class="sb-avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px">${esc((p.nama || 'P')[0].toUpperCase())}</div>
    <div style="font-size:20px;font-weight:700">${esc(p.nama || '-')}</div><div class="text-sm" style="color:var(--text-3)">${esc(p.email || '-')}</div></div>
    <div class="card"><div class="form-grid-2"><div><label>Role</label><span class="badge ${roleClass(p.role)}">${roleLabel(p.role)}</span></div><div><label>Divisi / Tim</label><span class="badge ${TIM_CLASS[p.tim] || 'badge-cyan'}">${esc(p.tim || '-')}</span></div></div><div class="mt-4"><label>Status</label><span class="status-pill ${statusClass(p.status)}">${esc(p.status || '-')}</span></div></div>`;
    }

    /* =====================================================
       VERIFIKATOR: DASHBOARD
       ===================================================== */

    /* =====================================================
       VERIFIKATOR: VERIFIKASI NILAI
       ===================================================== */
    let approvedId = null;

    /* =====================================================
       HELPERS: LOAD PEGAWAI SELECT
       ===================================================== */
    async function loadPegawaiSelect(selectId) {
      if (allPegawai.length === 0) {
        const { data } = await db.from('pegawai').select('*').eq('status', 'aktif').order('nama');
        allPegawai = data || [];
      }
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.innerHTML = '<option value="">Pilih Pegawai</option>' + allPegawai.map(p => `<option value="${p.id}">${p.nama} - ${p.tim}</option>`).join('');
    }


    /* ================= FINAL INTEGRATED WORKFLOW MODULE v7 ================= */

    /* ================================================================
       ORBIT FLOW ENGINE FINAL v7
       Finalisasi alur produksi: periode tunggal, transaksi RPC, penilaian
       juri milik sendiri, override audit, approval aman, storage privat.
       ================================================================ */
    let selectedNominationPeriod = '';
    let workflowStage = 'draft';
    let activeWorkflowRows = [];
    let availableNominees = new Map();
    let currentJuriRecord = null;

    function formatPeriodeLabel(dateValue) {
      if (!dateValue) return '-';
      const d = new Date(dateValue + 'T00:00:00');
      const triw = Math.floor(d.getMonth() / 3) + 1;
      return `${d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · Triwulan ${triw}`;
    }
    function fileNameSafe(name = 'file') {
      return String(name).normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
    }
    function validateUpload(file, allowedExts, maxMb = 10) {
      if (!file) return 'Pilih file terlebih dahulu.';
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!allowedExts.includes(ext)) return `Format file .${ext || '-'} tidak diperbolehkan.`;
      if (file.size > maxMb * 1024 * 1024) return `Ukuran file maksimum ${maxMb} MB.`;
      return '';
    }
    function storageObjectPath(pathOrUrl = '') {
      const value = String(pathOrUrl || '');
      if (!/^https?:\/\//i.test(value)) return value;
      const marker = '/doc-pegawai/';
      const pos = value.indexOf(marker);
      return pos >= 0 ? decodeURIComponent(value.slice(pos + marker.length)) : value;
    }
    async function signedFileUrl(pathOrUrl) {
      const path = storageObjectPath(pathOrUrl);
      if (!path || /^https?:\/\//i.test(path)) return '#';
      const { data, error } = await db.storage.from('doc-pegawai').createSignedUrl(path, 3600);
      return error ? '#' : data.signedUrl;
    }
    async function activeLinkedJuri() {
      const { data, error } = await db.from('juri').select('*').eq('status', 'aktif').not('user_id', 'is', null).order('nama');
      if (error) return [];
      return (data || []).filter(j => String(j.nama || '').trim().toLowerCase() !== 'juri penilai');
    }
    async function loadOwnJuriRecord() {
      if (currentRole !== 'juri' || !currentProfile?.id) return null;
      const { data } = await db.from('juri').select('*').eq('user_id', currentProfile.id).eq('status', 'aktif').maybeSingle();
      currentJuriRecord = data || null;
      return currentJuriRecord;
    }

    async function loadAdminDash() {
      let pegCount = 0, nilCount = 0;
      if (db) {
        const [r1, r2] = await Promise.all([
          db.from('pegawai').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
          db.from('nilai_final').select('*', { count: 'exact', head: true })
        ]);
        pegCount = r1.count || 0; nilCount = r2.count || 0;
      }
      document.getElementById('admin-stats').innerHTML = `
    ${statCard(ICON.users, 'Total Pegawai', pegCount, 'Data aktif')}
    ${statCard(ICON.check, 'Data Nilai', nilCount, 'Nilai tersimpan')}
    ${statCard(ICON.award, 'Tahap Proses', workflowStage === 'draft' ? 'SELEKSI' : workflowStage === 'juri' ? 'PENILAIAN' : workflowStage === 'verifikasi' ? 'VERIFIKASI' : 'SELESAI', 'Status siklus aktif')}
    ${statCard(ICON.bell, 'Periode', selectedNominationPeriod ? formatPeriodeLabel(selectedNominationPeriod).split(' · ')[0] : '-', 'Siklus penilaian')}
  `;
      document.getElementById('admin-qa').innerHTML = `
    ${qaBtn('admin-input', ICON.input, 'Input Nilai')}${qaBtn('admin-upload', ICON.upload, 'Upload Dokumen')}
    ${qaBtn('admin-users', ICON.users, 'Kelola Pengguna')}${qaBtn('admin-pegawai', ICON.users, 'Kelola Pegawai')}
    ${qaBtn('admin-laporan', ICON.report, 'Laporan')}${qaBtn('admin-juri', ICON.award, 'Juri')}
    ${qaBtn('admin-notif', ICON.bell, 'Notifikasi')}${qaBtn('admin-approval', ICON.verf, 'Approval')}${qaBtn('admin-history', ICON.hist, 'Arsip')}`;
      await loadNominationWorkflow();
      await loadRanking();
    }

    async function populateNominationPeriods(forcePeriod = '') {
      const select = document.getElementById('nomination-period');
      if (!select || !db) return;
      const { data, error } = await db.from('nilai_final').select('periode_bulan').order('periode_bulan', { ascending: false });
      if (error) { select.innerHTML = '<option value="">Gagal memuat periode</option>'; return; }
      const periods = [...new Set((data || []).map(row => row.periode_bulan).filter(Boolean))];
      select.innerHTML = '<option value="">Pilih periode penilaian</option>' + periods.map(p => `<option value="${esc(p)}">${esc(formatPeriodeLabel(p))}</option>`).join('');
      selectedNominationPeriod = forcePeriod || selectedNominationPeriod || periods[0] || '';
      select.value = selectedNominationPeriod;
      select.disabled = nominationLocked;
    }
    async function changeNominationPeriod(value) {
      if (nominationLocked) { toast('Periode telah dikunci setelah dikirim ke juri.', 'info'); return; }
      selectedNominationPeriod = value;
      finalNominee = [];
      await loadNominasi();
    }
    async function loadNominationWorkflow() {
      nominationLocked = false; workflowStage = 'draft'; finalNominee = []; activeWorkflowRows = [];
      if (!db) { await loadNominasi(); return; }
      const { data, error } = await db.from('nominasi_final')
        .select(`id,pegawai_id,tim,nilai_awal,total_nilai,periode_bulan,triwulan,tahun,status_alur,pegawai:pegawai_id(id,nama,tim)`)
        .order('created_at', { ascending: true });
      if (error) { toast('Gagal memuat status nominasi: ' + error.message, 'error'); return; }
      activeWorkflowRows = data || [];
      if (activeWorkflowRows.length) {
        nominationLocked = true;
        workflowStage = activeWorkflowRows[0].status_alur || 'juri';
        selectedNominationPeriod = activeWorkflowRows[0].periode_bulan || '';
        finalNominee = activeWorkflowRows;
      }
      await populateNominationPeriods(selectedNominationPeriod);
      await loadNominasi();
    }
    async function loadNominasi() {
      const container = document.getElementById('nominasi-container');
      const lockBadge = document.getElementById('nomination-lock-badge');
      const periodBox = document.getElementById('nomination-period-box');
      if (nominationLocked) {
        if (lockBadge) lockBadge.innerHTML = `<span class="workflow-badge locked">${workflowStage === 'juri' ? 'Terkunci · Di Juri' : workflowStage === 'verifikasi' ? 'Terkunci · Verifikasi' : 'Selesai'}</span>`;
        container.innerHTML = `<div class="workflow-phase-note"><strong>${esc(formatPeriodeLabel(selectedNominationPeriod))}</strong><br>${workflowStage === 'juri' ? 'Nominasi telah dikirim kepada juri dan tidak dapat diedit.' : workflowStage === 'verifikasi' ? 'Penilaian juri selesai dan sedang menunggu keputusan verifikator.' : 'Siklus telah selesai dan hasil disimpan pada arsip.'}</div><div class="workflow-locked-state"><div class="workflow-lock-icon">${ICON.check}</div><div class="workflow-lock-title">Pilihan dikunci</div><div class="workflow-lock-text">${finalNominee.length} nominasi final tersimpan pada proses aktif. Hasil proses yang terkunci tetap tersimpan pada arsip.</div></div>`;
        renderFinalList(); return;
      }
      if (lockBadge) lockBadge.innerHTML = '<span class="workflow-badge draft">Seleksi</span>';
      if (!selectedNominationPeriod) { container.innerHTML = '<div class="empty-state">Input nilai terlebih dahulu, lalu pilih periode penilaian.</div>'; renderFinalList(); return; }
      const { data, error } = await db.from('nilai_final').select(`id,nilai,total_nilai,periode_bulan,triwulan,tahun,pegawai:pegawai_id(id,nama,tim,status)`).eq('periode_bulan', selectedNominationPeriod);
      if (error) { container.innerHTML = `<div class="empty-state">Gagal memuat nilai: ${esc(error.message)}</div>`; return; }
      const bestByTim = {};
      (data || []).filter(i => i.pegawai && i.pegawai.status === 'aktif').forEach(item => {
        const tim = item.pegawai.tim;
        if (!bestByTim[tim] || Number(item.total_nilai) > Number(bestByTim[tim].total_nilai)) bestByTim[tim] = item;
      });
      availableNominees = new Map(Object.values(bestByTim).map(i => [String(i.pegawai.id), i]));
      const candidates = Object.values(bestByTim).sort((a, b) => TIM_OPTIONS.indexOf(a.pegawai.tim) - TIM_OPTIONS.indexOf(b.pegawai.tim));
      if (!candidates.length) { container.innerHTML = '<div class="empty-state">Belum ada nilai pegawai aktif pada periode ini.</div>'; renderFinalList(); return; }
      let rendered = `<div class="workflow-helper">Kandidat terbaik per tim untuk periode <strong>${esc(formatPeriodeLabel(selectedNominationPeriod))}</strong>. Pilih kandidat yang akan diteruskan ke juri.</div>`;
      candidates.forEach(item => {
        const selected = finalNominee.some(n => String(n.pegawai?.id) === String(item.pegawai.id));
        rendered += `<div style="margin-bottom:13px"><div style="color:var(--cyan);font-weight:700;font-size:12px;letter-spacing:1px;margin-bottom:7px;text-transform:uppercase">Tim ${esc(item.pegawai.tim)}</div><div class="nominasi-row ${selected ? 'selected-nomination' : ''}"><div><div style="font-weight:650">${esc(item.pegawai.nama)}</div><div class="text-xs" style="color:var(--text-2);margin-top:3px">${esc(formatPeriodeLabel(item.periode_bulan))} · Nilai Awal ${Number(item.total_nilai).toFixed(1)}</div></div><button class="btn btn-approve btn-xs" ${selected ? 'disabled' : ''} onclick="pilihFinalByPegawai('${item.pegawai.id}')">${selected ? 'Dipilih' : 'Pilih'}</button></div></div>`;
      });
      container.innerHTML = rendered; renderFinalList();
    }
    function pilihFinalByPegawai(pegawaiId) {
      if (nominationLocked) return toast('Nominasi telah dikunci.', 'info');
      const item = availableNominees.get(String(pegawaiId)); if (!item) return;
      if (finalNominee.some(n => n.pegawai?.tim === item.pegawai.tim)) return toast('Setiap tim hanya memiliki satu nominasi final.', 'error');
      finalNominee.push(item); loadNominasi();
    }
    function pilihFinal(item) { if (item?.pegawai?.id) pilihFinalByPegawai(item.pegawai.id); }
    function renderFinalList() {
      const el = document.getElementById('final-list'), badge = document.getElementById('final-status-badge'), btn = document.getElementById('send-jury-btn'), label = document.getElementById('send-jury-label'), note = document.getElementById('send-jury-note');
      const labels = { draft: 'Draft', juri: 'Terkirim ke Juri', verifikasi: 'Dikirim ke Verifikator', selesai: 'Selesai' };
      if (badge) badge.innerHTML = `<span class="workflow-badge ${nominationLocked ? (workflowStage === 'juri' ? 'submitted' : 'locked') : 'draft'}">${labels[workflowStage] || 'Draft'}</span>`;
      el.innerHTML = finalNominee.length ? finalNominee.map(item => `<div class="rank-item final-nominee-row"><div style="flex:1"><div style="font-weight:650">${esc(item.pegawai?.nama || '-')}</div><div class="text-xs" style="color:var(--text-3);margin-top:3px">${esc(formatPeriodeLabel(item.periode_bulan || selectedNominationPeriod))}</div></div><span class="badge badge-cyan">${esc(item.pegawai?.tim || item.tim || '-')}</span>${nominationLocked ? '' : `<button class="btn btn-reject btn-xs" onclick="batalkanFinal('${item.pegawai?.id}')">Batalkan</button>`}</div>`).join('') : '<div class="empty-state">Belum ada nominasi dipilih</div>';
      if (!btn) return;
      btn.disabled = nominationLocked || !finalNominee.length || !selectedNominationPeriod;
      btn.classList.toggle('is-sent', nominationLocked);
      label.textContent = nominationLocked ? labels[workflowStage] : 'Kirim ke Juri';
      note.textContent = nominationLocked ? 'Data seleksi telah dikunci untuk menjaga integritas proses.' : (finalNominee.length ? `${finalNominee.length} nominasi siap dikirim. Setelah dikirim, pilihan tidak dapat diubah.` : 'Pilih kandidat dari panel sebelah kiri terlebih dahulu.');
    }
    async function kirimKeJuri() {
      if (nominationLocked) return toast('Nominasi sudah dikunci.', 'info');
      if (!selectedNominationPeriod || !finalNominee.length) return toast('Pilih periode dan nominasi terlebih dahulu.', 'error');
      if (!confirm(`Kirim ${finalNominee.length} nominasi periode ${formatPeriodeLabel(selectedNominationPeriod)} ke juri?\n\nPilihan akan dikunci setelah dikirim.`)) return;
      const { error } = await db.rpc('kirim_nominasi_ke_juri', { p_periode_bulan: selectedNominationPeriod, p_pegawai_ids: finalNominee.map(i => i.pegawai.id) });
      if (error) { toast('Gagal mengirim nominasi: ' + error.message, 'error'); return; }
      toast('Nominasi berhasil dikirim dan dikunci untuk penilaian juri.', 'success');
      await loadAdminDash();
    }
    async function loadRanking() {
      const el = document.getElementById('ranking-container'), send = document.getElementById('send-approval-btn');
      if (!db) { el.innerHTML = '<div class="empty-state">Hubungkan Supabase.</div>'; return; }
      const { data, error } = await db.rpc('get_ranking_live');
      if (error) { el.innerHTML = `<div class="empty-state">Gagal memuat ranking: ${esc(error.message)}</div>`; if (send) send.disabled = true; return; }
      const rows = (data || []).filter(r => r.nilai !== null);
      if (!rows.length) { el.innerHTML = '<div class="empty-state">Belum ada penilaian juri.</div>'; if (send) send.disabled = true; return; }
      el.innerHTML = rows.map((r, i) => `<div class="rank-item"><span class="rank-num ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span><div style="flex:1"><div style="font-weight:650">${esc(r.nama)}</div><div class="text-xs" style="color:var(--text-2)">${esc(r.tim)} · ${r.jumlah_penilai}/${r.jumlah_juri} penilai</div></div><span style="font-family:'Orbitron',monospace;color:var(--cyan)">${Number(r.nilai).toFixed(1)}</span><span class="ranking-pill ${r.is_override ? 'override' : r.lengkap ? 'ready' : ''}">${r.is_override ? 'Override' : r.lengkap ? 'Lengkap' : 'Proses'}</span></div>`).join('');
      if (send) { send.disabled = workflowStage !== 'juri' || !rows.every(r => r.lengkap); send.title = send.disabled ? 'Seluruh juri aktif harus menyelesaikan penilaian terlebih dahulu.' : ''; }
    }
    async function kirimKeApproval() {
      if (workflowStage !== 'juri') return toast('Data tidak berada pada tahap penilaian juri.', 'error');
      if (!confirm('Kirim hasil penilaian final kepada Verifikator? Setelah dikirim, nilai juri tidak dapat diubah.')) return;
      const { error } = await db.rpc('kirim_ranking_ke_verifikator');
      if (error) { toast('Belum dapat dikirim: ' + error.message, 'error'); return; }
      toast('Ranking final berhasil dikirim kepada Verifikator.', 'success'); await loadAdminDash();
    }
    async function handleResetPenilaian() {
      if (!confirm('Bersihkan proses aktif?\n\nNominasi dan penilaian proses aktif akan dikosongkan. Data nilai bulanan, arsip pemenang, sertifikat, pengguna, dan pegawai tetap tersimpan.')) return;
      const { error } = await db.rpc('reset_penilaian_baru');
      if (error) { toast('Gagal memulai siklus baru: ' + error.message, 'error'); return; }
      selectedNominationPeriod = ''; finalNominee = []; nominationLocked = false; workflowStage = 'draft'; toast('Siklus baru siap dimulai. Data historis tetap aman.', 'success'); await loadAdminDash();
    }
    async function simpanNilai() {
      const pegawaiId = document.getElementById('in-pegawai').value, nilai = Number(document.getElementById('in-nilai').value), kipapp = Number(document.getElementById('in-kipapp').value || 0), triw = Number(document.getElementById('in-triw').value), bulan = document.getElementById('in-bulan').value, tahun = Number(document.getElementById('in-tahun').value);
      if (!pegawaiId || !Number.isFinite(nilai) || !triw || !bulan || !tahun) return toast('Lengkapi periode, pegawai, dan nilai.', 'error');
      if (nilai < 0 || nilai > 100 || kipapp < 0) return toast('Nilai harus 0–100 dan jumlah KIPAPP tidak boleh negatif.', 'error');
      const periodeDate = `${tahun}-${String(BULAN_NUM[bulan]).padStart(2, '0')}-01`, peg = allPegawai.find(p => p.id === pegawaiId);
      const { error } = await db.from('nilai_final').upsert({ pegawai_id: pegawaiId, nilai, jumlah_kipapp: kipapp, total_nilai: nilai, periode_bulan: periodeDate, triwulan: triw, tahun, periode: `Triwulan ${triw}`, tim: peg?.tim, status: 'draft' }, { onConflict: 'pegawai_id,periode_bulan' });
      if (error) return toast('Gagal menyimpan nilai: ' + error.message, 'error');
      toast('Nilai berhasil disimpan.', 'success');['in-pegawai', 'in-nilai', 'in-kipapp', 'in-bulan', 'in-triw'].forEach(id => document.getElementById(id).value = ''); await loadDataNilai();
    }
    async function loadMonitoring() {
      const [juries, ranking] = await Promise.all([activeLinkedJuri(), db.rpc('get_ranking_live')]);
      const rows = ranking.data || [], totalN = rows.length, totalJ = juries.length, entered = rows.reduce((a, r) => a + Number(r.jumlah_penilai || 0), 0), target = totalN * totalJ, done = totalN > 0 && totalJ > 0 && entered === target;
      document.getElementById('monitoring-content').innerHTML = `<div class="stats-grid mb-4">${statCard(ICON.users, 'Total Nominasi', totalN, '')}${statCard(ICON.award, 'Juri Aktif', totalJ, 'Akun terhubung')}${statCard(ICON.check, 'Penilaian Masuk', entered, 'dari ' + target)}</div><div class="callout">${done ? '✓ Seluruh penilaian telah lengkap. Admin dapat mengirim ranking ke Verifikator.' : '⏳ Penilaian belum lengkap. Hanya juri aktif yang telah memiliki akun terhubung yang dihitung.'}</div>`;
    }
    async function loadJuriList() {
      const data = await activeLinkedJuri(), el = document.getElementById('juri-list-admin');
      if (!data.length) { el.innerHTML = '<div class="empty-state">Belum ada juri aktif yang terhubung dengan akun login. Ubah role pengguna aktif menjadi Juri pada Kelola Pengguna.</div>'; return; }
      el.innerHTML = data.map(j => `<div class="nominasi-row"><div><div style="font-weight:650">${esc(j.nama)}</div><span class="badge badge-cyan">${esc(j.tim || '-')}</span></div><span class="status-pill status-aktif">aktif</span></div>`).join('');
    }

    async function loadJuriDash() {
      if (!db) return;
      const own = await loadOwnJuriRecord();
      const [{ data: nominasi }, { data: penilaian }] = await Promise.all([db.from('nominasi_final').select('pegawai_id,status_alur'), db.from('penilaian').select('pegawai_id,juri_id')]);
      const active = (nominasi || []).filter(n => n.status_alur === 'juri'), completed = own ? (penilaian || []).filter(p => String(p.juri_id) === String(own.id) && active.some(n => String(n.pegawai_id) === String(p.pegawai_id))).length : 0;
      const sisa = Math.max(active.length - completed, 0), persen = active.length ? Math.round(completed / active.length * 100) : 0;
      document.getElementById('juri-stats').innerHTML = `${statCard(ICON.award, 'Nominasi Aktif', active.length, 'Tugas penilaian')}${statCard(ICON.check, 'Sudah Saya Nilai', completed, 'Tersimpan')}${statCard(ICON.bell, 'Sisa Tugas', sisa, 'Belum diisi')}`;
      document.getElementById('juri-progress-content').innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>Progres penilaian saya</span><strong style="color:var(--cyan)">${persen}%</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${persen}%"></div></div>${own ? '' : '<div class="jury-access-note">Akun juri belum ditautkan dengan daftar juri aktif. Hubungi Admin.</div>'}`;
    }
    async function loadJuriPenilaian() {
      const el = document.getElementById('juri-penilaian-list'); currentJuriRecord = await loadOwnJuriRecord();
      const [nomRes, juries, penRes] = await Promise.all([db.from('nominasi_final').select(`id,pegawai_id,status_alur,pegawai:pegawai_id(id,nama,tim)`), activeLinkedJuri(), db.from('penilaian').select('*')]);
      const nominasi = nomRes.data || [], penilaian = (penRes.data || []).filter(p => p.juri_id !== 'override');
      if (!nominasi.length) { el.innerHTML = '<div class="empty-state">Belum ada nominasi yang dikirim Admin.</div>'; return; }
      workflowStage = nominasi[0].status_alur || 'juri';
      const myReady = Boolean(currentJuriRecord) && workflowStage === 'juri';
      const header = !currentJuriRecord ? '<div class="jury-access-note">Akun ini memiliki role Juri, tetapi belum tertaut dengan daftar juri aktif. Admin perlu mengaktifkan role Juri dari menu Kelola Pengguna.</div>' : workflowStage !== 'juri' ? '<div class="jury-access-note">Penilaian telah ditutup dan diteruskan ke Verifikator. Data hanya dapat dilihat.</div>' : '<div class="jury-access-note">Kamu hanya dapat mengisi atau memperbarui nilai milikmu sendiri. Status juri lain ditampilkan sebagai monitoring.</div>';
      el.innerHTML = header + nominasi.map(item => {
        const ownRows = penilaian.filter(p => String(p.pegawai_id) === String(item.pegawai.id));
        const rata = ownRows.length ? ownRows.reduce((a, p) => a + Number(p.total_nilai), 0) / ownRows.length : null;
        return `<div class="panel mb-4"><div style="font-size:11px;color:var(--cyan);text-transform:uppercase">${esc(item.pegawai.tim)}</div><div style="font-size:19px;font-weight:700;margin:3px 0 12px">${esc(item.pegawai.nama)}</div><div class="juri-grid">${juries.map(j => { const record = ownRows.find(p => String(p.juri_id) === String(j.id)), own = currentJuriRecord && String(j.id) === String(currentJuriRecord.id), completed = Boolean(record), clickable = own && myReady; return `<button class="juri-btn-item ${completed ? 'completed' : 'waiting'} ${clickable ? '' : 'readonly'}" ${clickable ? `onclick="openScoreModal('${j.id}','${escapeJsText(j.nama)}','${item.pegawai.id}','${escapeJsText(item.pegawai.nama)}')"` : 'disabled'}><span class="jury-name"><span class="jury-status-dot"></span><span class="jury-name-label">${esc(j.nama)}${own ? ' (Saya)' : ''}</span></span><span class="${completed ? 'jury-score' : 'jury-score-placeholder'}">${completed ? Number(record.total_nilai).toFixed(1) : 'Menunggu'}</span></button>`; }).join('')}</div><div class="jury-summary"><div class="jury-summary-item">Nilai Juri Sementara:<span class="jury-summary-value">${rata === null ? '--' : rata.toFixed(1)}</span></div><div class="jury-summary-item">Penilaian Masuk:<span class="jury-summary-value">${ownRows.length}/${juries.length}</span></div></div></div>`;
      }).join('');
    }
    function openScoreModal(juriId, juriNama, pegId, pegNama) {
      if (!currentJuriRecord || String(currentJuriRecord.id) !== String(juriId) || workflowStage !== 'juri') return toast('Kamu hanya dapat mengubah nilai milik sendiri pada tahap penilaian juri.', 'error');
      scoreModalCtx = { juriId, juriNama, pegId, pegNama }; document.getElementById('modal-juri-name').textContent = `Nilai Saya · ${juriNama}`; document.getElementById('modal-pegawai-name').textContent = pegNama; document.getElementById('modal-nilai').value = ''; document.getElementById('score-modal').classList.remove('hidden');
      db.from('penilaian').select('total_nilai').eq('pegawai_id', pegId).eq('juri_id', juriId).maybeSingle().then(({ data }) => { if (data) document.getElementById('modal-nilai').value = data.total_nilai; });
    }
    async function submitNilaiJuri() {
      const nilai = Number(document.getElementById('modal-nilai').value), { juriId, pegId } = scoreModalCtx;
      if (!currentJuriRecord || String(juriId) !== String(currentJuriRecord.id)) return toast('Akses penilaian tidak valid.', 'error');
      if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) return toast('Masukkan nilai 0 sampai 100.', 'error');
      const { error } = await db.from('penilaian').upsert({ pegawai_id: pegId, juri_id: juriId, total_nilai: nilai }, { onConflict: 'pegawai_id,juri_id' });
      if (error) return toast('Gagal menyimpan nilai: ' + error.message, 'error');
      closeScoreModal(); toast('Nilai kamu berhasil disimpan.', 'success'); await Promise.all([loadJuriPenilaian(), loadJuriDash()]);
    }
    async function hapusNilaiJuri() {
      const { juriId, pegId } = scoreModalCtx; if (!currentJuriRecord || String(juriId) !== String(currentJuriRecord.id)) return toast('Akses tidak valid.', 'error');
      const { error } = await db.from('penilaian').delete().match({ pegawai_id: pegId, juri_id: juriId }); if (error) return toast('Gagal menghapus nilai: ' + error.message, 'error');
      closeScoreModal(); toast('Nilai kamu telah dihapus.', 'info'); await Promise.all([loadJuriPenilaian(), loadJuriDash()]);
    }
    async function loadVerifNominasi() {
      const el = document.getElementById('verif-nominasi-list');
      const { data, error } = await db.from('nominasi_final').select(`id,total_nilai,status_alur,triwulan,tahun,pegawai:pegawai_id(id,nama,tim)`).eq('status_alur', 'verifikasi').order('total_nilai', { ascending: false });
      if (error) { el.innerHTML = `<div class="empty-state">Gagal memuat verifikasi: ${esc(error.message)}</div>`; return; }
      if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada ranking final yang dikirim Admin untuk diverifikasi.</div>'; return; }
      el.innerHTML = data.map(item => `<div class="approval-card"><div><div class="tim">${esc(item.pegawai?.tim || '-')}</div><div class="nama">${esc(item.pegawai?.nama || '-')}</div><div style="margin-top:8px;color:var(--text-2)">Nilai Final: <strong style="color:var(--cyan)">${Number(item.total_nilai).toFixed(1)}</strong></div><div class="text-xs" style="margin-top:5px;color:var(--text-3)">Triwulan ${item.triwulan} ${item.tahun}</div></div><button class="btn btn-approve" onclick="approvePegawai('${item.id}','${item.pegawai?.nama || '-'}')">Tetapkan sebagai Pemenang</button></div>`).join('');
    }
    async function approvePegawai(nominasiId, nama) {
      if (!confirm(`Tetapkan ${nama} sebagai Pegawai Teladan? Keputusan akan masuk ke arsip resmi.`)) return;
      const { error } = await db.rpc('tetapkan_pemenang', { p_nominasi_id: nominasiId }); if (error) return toast('Gagal menetapkan pemenang: ' + error.message, 'error');
      toast(`${nama} berhasil ditetapkan dan diarsipkan.`, 'success'); await Promise.all([loadVerifNominasi(), loadVerfDash()]);
    }
    async function doUploadFile() {
      const msg = validateUpload(selectedUploadFile, ['xlsx', 'xls', 'pdf', 'doc', 'docx'], 10); if (msg) return toast(msg, 'error');
      const btn = document.getElementById('upload-btn'); btn.disabled = true; btn.textContent = 'Mengunggah...';
      const path = `dokumen/${Date.now()}-${fileNameSafe(selectedUploadFile.name)}`;
      const { error: uploadError } = await db.storage.from('doc-pegawai').upload(path, selectedUploadFile, { upsert: false });
      if (uploadError) { btn.disabled = false; btn.textContent = 'Upload File'; return toast('Gagal upload: ' + uploadError.message, 'error'); }
      const { error } = await db.from('excel_uploads').insert({ file_name: selectedUploadFile.name, file_path: path, file_url: path });
      btn.disabled = false; btn.textContent = 'Upload File'; if (error) return toast('File terunggah tetapi metadata gagal disimpan: ' + error.message, 'error');
      selectedUploadFile = null; document.getElementById('file-input').value = ''; document.getElementById('file-name').textContent = 'Klik atau drag file ke sini (.xlsx, .xls, .pdf, .doc)'; toast('Dokumen berhasil disimpan secara privat.', 'success'); await loadUploadedFiles();
    }
    async function loadUploadedFiles() {
      const { data, error } = await db.from('excel_uploads').select('*').order('uploaded_at', { ascending: false }); const el = document.getElementById('uploaded-files');
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada dokumen.</div>'; return; }
      const entries = await Promise.all(data.map(async f => ({ ...f, url: await signedFileUrl(f.file_path || f.file_url) })));
      el.innerHTML = `<table class="tbl"><thead><tr><th>Nama File</th><th>Tanggal Upload</th><th>Aksi</th></tr></thead><tbody>${entries.map(f => `<tr><td>${esc(f.file_name)}</td><td>${new Date(f.uploaded_at).toLocaleDateString('id-ID')}</td><td><a class="btn btn-ghost btn-xs" href="${esc(f.url)}" target="_blank">Buka</a> <button class="btn btn-danger btn-xs" onclick="hapusFile('${f.id}','${esc(storageObjectPath(f.file_path || f.file_url))}')">Hapus</button></td></tr>`).join('')}</tbody></table><div class="private-file-note">Dokumen disimpan pada storage privat. Tautan buka bersifat sementara.</div>`;
    }
    async function hapusFile(id, path) { if (!confirm('Hapus dokumen ini?')) return; const { error: removeErr } = await db.storage.from('doc-pegawai').remove([path]); if (removeErr) return toast('Gagal menghapus file: ' + removeErr.message, 'error'); const { error } = await db.from('excel_uploads').delete().eq('id', id); if (error) return toast('Gagal menghapus metadata: ' + error.message, 'error'); toast('Dokumen dihapus.', 'success'); await loadUploadedFiles(); }
    async function uploadSertifikat() {
      const pegId = document.getElementById('sert-pegawai').value, triw = Number(document.getElementById('sert-triw').value), tahun = new Date().getFullYear(); const msg = validateUpload(selectedSertFile, ['jpg', 'jpeg', 'png', 'pdf'], 8);
      if (!pegId || !triw) return toast('Pilih pegawai dan triwulan.', 'error'); if (msg) return toast(msg, 'error');
      const path = `sertifikat/${Date.now()}-${fileNameSafe(selectedSertFile.name)}`, upload = await db.storage.from('doc-pegawai').upload(path, selectedSertFile, { upsert: false }); if (upload.error) return toast('Gagal upload sertifikat: ' + upload.error.message, 'error');
      const { error } = await db.from('sertifikat').insert({ pegawai_id: pegId, triwulan: triw, tahun, file_name: selectedSertFile.name, file_path: path, file_url: path }); if (error) return toast('Metadata sertifikat gagal disimpan: ' + error.message, 'error');
      selectedSertFile = null; document.getElementById('sert-file').value = ''; document.getElementById('sert-file-name').textContent = 'Upload file sertifikat (JPG/PNG/PDF)'; toast('Sertifikat berhasil disimpan.', 'success'); await loadSertList();
    }
    async function loadSertList() {
      const { data } = await db.from('sertifikat').select(`*,pegawai:pegawai_id(nama,tim)`).order('created_at', { ascending: false }); const el = document.getElementById('sert-list'); if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada sertifikat.</div>'; return; }
      const arr = await Promise.all(data.map(async s => ({ ...s, url: await signedFileUrl(s.file_path || s.file_url) })));
      el.innerHTML = `<table class="tbl"><thead><tr><th>Pegawai</th><th>Tim</th><th>Periode</th><th>File</th></tr></thead><tbody>${arr.map(s => `<tr><td>${esc(s.pegawai?.nama || '-')}</td><td>${esc(s.pegawai?.tim || '-')}</td><td>Triwulan ${s.triwulan} ${s.tahun || ''}</td><td><a href="${esc(s.url)}" target="_blank" class="btn btn-ghost btn-xs">Lihat</a></td></tr>`).join('')}</tbody></table>`;
    }
    async function loadSertLihat() {
      const { data } = await db.from('sertifikat').select(`*,pegawai:pegawai_id(nama,tim)`).order('created_at', { ascending: false }); const el = document.getElementById('sert-lihat-list'); if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada sertifikat.</div>'; return; }
      const arr = await Promise.all(data.map(async s => ({ ...s, url: await signedFileUrl(s.file_path || s.file_url) })));
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">${arr.map(s => `<div class="sert-card"><div style="font-weight:650">${esc(s.pegawai?.nama || '-')}</div><div class="text-xs" style="color:var(--text-2);margin:5px 0 12px">${esc(s.pegawai?.tim || '-')} · Triwulan ${s.triwulan} ${s.tahun || ''}</div><a href="${esc(s.url)}" target="_blank" class="btn btn-ghost btn-xs">Buka Sertifikat</a></div>`).join('')}</div>`;
    }
    async function simpanPengguna() {
      const nama = document.getElementById('user-new-nama').value.trim(), email = document.getElementById('user-new-email').value.trim().toLowerCase(), role = document.getElementById('user-new-role').value, tim = document.getElementById('user-new-tim').value, status = document.getElementById('user-new-status').value;
      if (!nama || !email) return toast('Nama dan email wajib diisi.', 'error');
      if (editingUserId) { const existing = allUsers.find(u => u.id === editingUserId); if (existing?.auth_id && email !== existing.email) return toast('Email akun yang sudah terhubung Auth tidak dapat diubah dari aplikasi. Ubah melalui Supabase Authentication oleh PIC teknis.', 'error'); }
      const payload = { nama, email, role, tim, status }; const result = editingUserId ? await db.from('users').update(payload).eq('id', editingUserId) : await db.from('users').insert(payload);
      if (result.error) return toast('Gagal menyimpan pengguna: ' + result.error.message, 'error'); toast(editingUserId ? 'Data pengguna diperbarui.' : 'Profil pengguna dibuat. Pengguna harus Sign Up dengan email yang sama untuk memperoleh akun login.', 'success'); resetUserForm(); await loadPengguna();
    }


    function batalkanFinal(pegawaiId) {
      if (nominationLocked) return toast('Nominasi telah dikunci.', 'info');
      finalNominee = finalNominee.filter(n => String(n.pegawai?.id || n.pegawai_id) !== String(pegawaiId));
      loadNominasi();
    }
    async function loadDataNilai() {
      const { data, error } = await db.from('nilai_final').select(`id,nilai,jumlah_kipapp,total_nilai,periode_bulan,triwulan,tahun,pegawai:pegawai_id(id,nama,tim)`).order('periode_bulan', { ascending: false });
      const el = document.getElementById('data-nilai-list'); if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada data.</div>'; return; }
      const grouped = {}; data.forEach(item => { const label = formatPeriodeLabel(item.periode_bulan); if (!grouped[label]) grouped[label] = []; grouped[label].push(item); });
      el.innerHTML = Object.entries(grouped).map(([label, items]) => `<div style="margin-bottom:25px"><h3 style="color:var(--cyan);font-size:14px;font-weight:700;margin-bottom:12px">${esc(label)}</h3><table class="tbl"><thead><tr><th>Pegawai</th><th>Tim</th><th>Nilai</th><th>KIPAPP</th><th>Aksi</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.pegawai?.nama || '-')}</td><td>${esc(i.pegawai?.tim || '-')}</td><td>${Number(i.nilai).toFixed(1)}</td><td>${Number(i.jumlah_kipapp || 0)}</td><td><button class="btn btn-ghost btn-xs" onclick="editNilai('${i.pegawai?.id}',${Number(i.nilai)},${Number(i.jumlah_kipapp || 0)},'${i.periode_bulan}')">Edit</button></td></tr>`).join('')}</tbody></table></div>`).join('');
    }
    function editNilai(pegawaiId, nilai, kipapp, periodeBulan) {
      const date = new Date(periodeBulan + 'T00:00:00'), triw = Math.floor(date.getMonth() / 3) + 1, namaBulan = Object.keys(BULAN_NUM).find(k => BULAN_NUM[k] === date.getMonth() + 1);
      document.getElementById('in-pegawai').value = pegawaiId; document.getElementById('in-nilai').value = nilai; document.getElementById('in-kipapp').value = kipapp; document.getElementById('in-tahun').value = date.getFullYear(); document.getElementById('in-triw').value = String(triw); updateBulanOptions(); document.getElementById('in-bulan').value = namaBulan || ''; window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    async function generateLaporan() {
      const tahun = Number(document.getElementById('lap-tahun').value), triw = Number(document.getElementById('lap-triw').value), start = `${tahun}-${String((triw - 1) * 3 + 1).padStart(2, '0')}-01`, endMonth = triw * 3, end = new Date(tahun, endMonth, 0).toISOString().slice(0, 10), el = document.getElementById('laporan-hasil');
      const { data, error } = await db.from('nilai_final').select(`total_nilai,periode_bulan,pegawai:pegawai_id(id,nama,tim)`).gte('periode_bulan', start).lte('periode_bulan', end).order('total_nilai', { ascending: false });
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Tidak ada data untuk periode ini.</div>'; return; }
      const best = {}; data.forEach(i => { const tim = i.pegawai?.tim; if (tim && !best[tim]) best[tim] = i; });
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">${Object.values(best).map(i => `<div class="card"><div class="badge badge-cyan" style="margin-bottom:8px">${esc(i.pegawai?.tim || '-')}</div><div style="font-size:16px;font-weight:700">${esc(i.pegawai?.nama || '-')}</div><div class="text-sm" style="color:var(--text-2);margin-top:7px">Nilai: <strong style="color:var(--cyan)">${Number(i.total_nilai).toFixed(1)}</strong></div></div>`).join('')}</div>`;
    }


    function switchPJTab(tab, btn) {
      ['manajemen', 'monitoring', 'override'].forEach(t => document.getElementById(`pj-${t}`).classList.add('hidden'));
      document.getElementById(`pj-${tab}`).classList.remove('hidden');
      document.querySelectorAll('#pj-tabs button').forEach(b => { b.className = 'btn btn-ghost btn-sm'; }); btn.className = 'btn btn-primary btn-sm';
      if (tab === 'monitoring') loadMonitoring();
    }
    async function loadApprovalMonitor() {
      const el = document.getElementById('approval-monitor-content');
      const [juries, rankingRes] = await Promise.all([activeLinkedJuri(), db.rpc('get_ranking_live')]);
      if (rankingRes.error) { el.innerHTML = `<div class="empty-state">${esc(rankingRes.error.message)}</div>`; return; }
      const rows = rankingRes.data || [], status = rows[0]?.status_alur || 'draft', target = rows.length * juries.length, masuk = rows.reduce((a, r) => a + Number(r.jumlah_penilai || 0), 0), lengkap = rows.length > 0 && rows.every(r => r.lengkap);
      const stageText = status === 'verifikasi' ? 'Ranking telah dikirim ke Verifikator.' : status === 'selesai' ? 'Pemenang telah ditetapkan dan masuk arsip.' : lengkap ? 'Seluruh nilai lengkap; siap dikirim ke Verifikator.' : 'Penilaian juri masih berlangsung.';
      el.innerHTML = `<div class="stats-grid mb-6">${statCard(ICON.users, 'Total Nominasi', rows.length, '')}${statCard(ICON.award, 'Juri Aktif', juries.length, 'Akun tertaut')}${statCard(ICON.check, 'Penilaian Masuk', masuk, 'dari ' + target)}${statCard(ICON.verf, 'Tahap', status.toUpperCase(), 'Proses aktif')}</div><div class="panel"><div class="callout">${esc(stageText)}</div></div>`;
    }
    async function loadVerfDash() {
      const [{ count: pendingCount }, { count: historyCount }] = await Promise.all([db.from('nominasi_final').select('*', { count: 'exact', head: true }).eq('status_alur', 'verifikasi'), db.from('history_penghargaan').select('*', { count: 'exact', head: true })]);
      document.getElementById('verf-stats').innerHTML = `${statCard(ICON.users, 'Menunggu Keputusan', pendingCount || 0, 'Ranking final')}${statCard(ICON.hist, 'Total Ditetapkan', historyCount || 0, 'Arsip penghargaan')}`;
    }
    async function loadNotif() {
      const el = document.getElementById('notif-list'), { data, error } = await db.from('notifikasi').select('*').order('created_at', { ascending: false });
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada notifikasi.</div>'; return; }
      el.innerHTML = data.map(n => `<div class="card mb-3 notif-${esc(n.tipe || 'info')}" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px"><div><div style="font-weight:700;color:var(--text-1)">${esc(n.judul)}</div><div class="text-sm" style="color:var(--text-2);margin-top:4px">${esc(n.pesan)}</div>${n.deadline ? `<div class="text-xs" style="color:var(--gold);margin-top:6px">Deadline: ${new Date(n.deadline).toLocaleDateString('id-ID')}</div>` : ''}<span class="badge ${n.tipe === 'warning' ? 'badge-red' : n.tipe === 'deadline' ? 'badge-gold' : 'badge-cyan'}" style="margin-top:7px">${esc(n.tipe || 'info')} · ${esc((n.role_target || '').toUpperCase())}</span></div><button class="btn btn-danger btn-xs" onclick="hapusNotif('${n.id}')">Hapus</button></div>`).join('');
    }
    async function loadNotifUser(elId, role) {
      const el = document.getElementById(elId), { data, error } = await db.from('notifikasi').select('*').or(`role_target.eq.${role},role_target.eq.semua`).order('created_at', { ascending: false });
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Tidak ada notifikasi untukmu saat ini.</div>'; return; }
      el.innerHTML = data.map(n => `<div class="card" style="margin-bottom:12px;border-left:3px solid ${n.tipe === 'warning' ? 'var(--red)' : n.tipe === 'deadline' ? 'var(--gold)' : 'var(--accent)'}"><div style="display:flex;justify-content:space-between;gap:12px"><div><div style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:5px">${esc(n.judul)}</div><div style="font-size:13px;color:var(--text-2);line-height:1.6">${esc(n.pesan)}</div>${n.deadline ? `<div style="font-size:11px;color:var(--gold);margin-top:8px;font-weight:600">Deadline: ${new Date(n.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}</div><div class="text-xs" style="color:var(--text-3);white-space:nowrap">${new Date(n.created_at).toLocaleDateString('id-ID')}</div></div></div>`).join('');
    }
    const orbitHistoryCache = {};
    async function loadHistory(yearsElId, contentElId) {
      const yearsEl = document.getElementById(yearsElId), contentEl = document.getElementById(contentElId), { data, error } = await db.from('history_penghargaan').select('id,nama,tim,total_nilai,tahun,triwulan,created_at').order('tahun', { ascending: false }).order('triwulan', { ascending: false });
      if (error) { contentEl.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { yearsEl.innerHTML = ''; contentEl.innerHTML = '<div class="empty-state">Belum ada data arsip.</div>'; return; }
      orbitHistoryCache[contentElId] = { data, yearsElId }; renderHistoryYear(contentElId, [...new Set(data.map(d => d.tahun))][0]);
    }
    function renderHistoryYear(contentElId, year) {
      const cache = orbitHistoryCache[contentElId]; if (!cache) return; const years = [...new Set(cache.data.map(d => d.tahun))];
      document.getElementById(cache.yearsElId).innerHTML = years.map(y => `<button class="year-tab ${y === year ? 'active' : ''}" onclick="renderHistoryYear('${contentElId}',${y})">${y}</button>`).join('');
      const data = cache.data.filter(d => d.tahun === year); document.getElementById(contentElId).innerHTML = data.map(d => `<div class="history-card mb-4"><div class="trophy-icon">🏆</div><div class="text-xs" style="color:var(--cyan)">PEGAWAI TELADAN · TRIWULAN ${d.triwulan}</div><div style="font-size:17px;font-weight:700">${esc(d.nama)}</div><div class="text-sm" style="color:var(--text-2)">Tim ${esc(d.tim || '-')} · Nilai ${Number(d.total_nilai).toFixed(1)}</div><div class="text-xs" style="color:var(--text-3);margin-top:8px">Ditetapkan ${new Date(d.created_at).toLocaleDateString('id-ID')}</div></div>`).join('');
    }


/* ====== SCRIPT BLOCK 2 ====== */
    /* ================================================================
       ORBIT FINAL KONSISTEN
       - Nilai diinput per bulan.
       - Nominasi memantau triwulan berjalan secara real-time.
       - Kandidat berdasarkan NILAI TERTINGGI bulanan, bukan rata-rata.
       - Tidak ada penutupan bulan; finalisasi hanya per triwulan.
       - Verifikator menetapkan SATU pemenang akhir per triwulan.
       ================================================================ */
    let finalCalendar = null;
    let finalAvailableNominees = new Map();
    let finalClock = null;

    function qKey(year, q) { return `${Number(year)}|${Number(q)}`; }
    function qLabel(year, q) { return year && q ? `Triwulan ${q} Tahun ${year}` : '-'; }
    function monthDate(year, monthName) { return `${Number(year)}-${String(BULAN_NUM[monthName]).padStart(2, '0')}-01`; }
    function monthLabel(date) { return date ? new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-'; }
    function finalClockStart() {
      const el = document.getElementById('topbar-date'); if (!el) return;
      el.classList.add('live-clock'); if (finalClock) clearInterval(finalClock);
      const tick = () => { el.textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Makassar', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()).replace(/\./g, ':') + ' WITA'; };
      tick(); finalClock = setInterval(tick, 1000);
    }
    async function loadFinalCalendar() {
      if (!db) return null;
      const { data, error } = await db.rpc('get_kalender_operasional');
      if (error) { toast('Gagal membaca triwulan aktif: ' + error.message, 'error'); return null; }
      finalCalendar = Array.isArray(data) ? data[0] : data; return finalCalendar;
    }
    function finalApplyStaticCopy() {
      const inputSub = document.querySelector('#page-admin-input .page-sub');
      if (inputSub) inputSub.textContent = 'Input nilai pegawai setiap bulan. Monitoring nominasi diperbarui otomatis pada triwulan berjalan.';
      const juriSub = document.querySelector('#page-admin-juri .page-sub');
      if (juriSub) juriSub.textContent = 'Kelola kesiapan akun Juri dan pantau penyelesaian penilaian.';
      document.querySelectorAll('button').forEach(btn => {
        const text = (btn.textContent || '').trim(); const action = btn.getAttribute('onclick') || '';
        if (action.includes('handleResetPenilaian') || text.includes('Buat Penilaian Baru')) btn.remove();
      });
      const overridePanel = document.getElementById('pj-override'); if (overridePanel) overridePanel.remove();
      const oldMonth = document.getElementById('month-control'); if (oldMonth) oldMonth.remove();
      const userPage = document.getElementById('page-admin-users');
      if (userPage && !document.getElementById('account-integrity-note')) {
        const note = document.createElement('div'); note.id = 'account-integrity-note'; note.className = 'guide-inline';
        note.innerHTML = '<strong>Status Juri:</strong> pengguna siap menilai setelah sudah Sign Up, berstatus Aktif, dan diberi role Juri. Sistem menyinkronkan daftar Juri secara otomatis.';
        userPage.querySelector('.page-sub').insertAdjacentElement('afterend', note);
      }
    }
    function renderFlowSummary() {
      if (!finalCalendar) return '';
      const monitoring = qLabel(finalCalendar.tahun_monitoring, finalCalendar.triwulan_monitoring);
      const selection = qLabel(finalCalendar.tahun_seleksi, finalCalendar.triwulan_seleksi);
      return `<div class="flow-grid">
    <div class="flow-card cyan"><div class="lbl">Monitoring Berjalan</div><div class="val">${esc(monitoring)}<br>Nilai bulanan masuk otomatis</div></div>
    <div class="flow-card purple"><div class="lbl">Periode Nominasi</div><div class="val">${esc(selection)}<br>${finalCalendar.siap_finalisasi ? 'Siap difinalisasi' : 'Kandidat sementara'}</div></div>
    <div class="flow-card gold"><div class="lbl">Keputusan Akhir</div><div class="val">1 pemenang / triwulan<br>Oleh Verifikator</div></div>
  </div>`;
    }
    async function loadAdminDash() {
      finalApplyStaticCopy(); finalClockStart(); await loadFinalCalendar();
      let pegCount = 0, nilCount = 0;
      if (db) { const [p, n] = await Promise.all([db.from('pegawai').select('*', { count: 'exact', head: true }).eq('status', 'aktif'), db.from('nilai_final').select('*', { count: 'exact', head: true })]); pegCount = p.count || 0; nilCount = n.count || 0; }
      const stage = workflowStage === 'juri' ? 'PENILAIAN JURI' : workflowStage === 'verifikasi' ? 'VERIFIKASI' : workflowStage === 'dikembalikan' ? 'PERLU PERBAIKAN' : workflowStage === 'selesai' ? 'SELESAI' : (finalCalendar?.siap_finalisasi ? 'FINALISASI' : 'MONITORING');
      document.getElementById('admin-stats').innerHTML = `${statCard(ICON.users, 'Pegawai Aktif', pegCount, 'Master data')}${statCard(ICON.check, 'Nilai Tersimpan', nilCount, 'Data bulanan')}${statCard(ICON.award, 'Tahap', stage, 'Alur triwulan')}${statCard(ICON.bell, 'Pemenang Akhir', '1 Orang', 'Setiap triwulan')}`;
      document.getElementById('admin-qa').innerHTML = `${qaBtn('admin-input', ICON.input, 'Input Nilai Bulanan')}${qaBtn('admin-upload', ICON.upload, 'Upload Dokumen')}${qaBtn('admin-users', ICON.users, 'Kelola Pengguna')}${qaBtn('admin-pegawai', ICON.users, 'Kelola Pegawai')}${qaBtn('admin-laporan', ICON.report, 'Laporan')}${qaBtn('admin-juri', ICON.award, 'Penilaian Juri')}${qaBtn('admin-notif', ICON.bell, 'Notifikasi')}${qaBtn('admin-approval', ICON.verf, 'Approval')}${qaBtn('admin-history', ICON.hist, 'Arsip')}`;
      await loadNominationWorkflow(); await loadRanking();
    }
    async function populateNominationPeriods() {
      const el = document.getElementById('nomination-period'); if (!el || !finalCalendar) return;
      const label = document.querySelector('#nomination-period-box label'); const help = document.querySelector('.nomination-period-help');
      if (label) label.textContent = 'Triwulan Nominasi';
      const active = nominationLocked && activeWorkflowRows.length ? activeWorkflowRows[0] : null;
      const year = active ? active.tahun : finalCalendar.tahun_seleksi, q = active ? active.triwulan : finalCalendar.triwulan_seleksi;
      selectedNominationPeriod = qKey(year, q);
      const mode = active ? 'Proses Terkunci' : (finalCalendar.siap_finalisasi ? 'Siap Finalisasi' : 'Monitoring');
      el.innerHTML = `<option value="${selectedNominationPeriod}">${esc(qLabel(year, q))} · ${mode}</option>`; el.value = selectedNominationPeriod; el.disabled = true;
      if (help) help.textContent = finalCalendar.siap_finalisasi ? 'Data tiga bulan lengkap. Pilih kandidat final tiap divisi lalu kirim ke Juri.' : 'Kandidat diperbarui berdasarkan nilai tertinggi bulanan yang sudah masuk. Tidak menggunakan rata-rata.';
    }
    async function loadNominationWorkflow() {
      nominationLocked = false; workflowStage = 'draft'; finalNominee = []; activeWorkflowRows = [];
      if (!db) { return loadNominasi(); }
      if (!finalCalendar) await loadFinalCalendar();
      const { data, error } = await db.from('nominasi_final').select(`id,pegawai_id,tim,nilai_awal,total_nilai,bulan_sumber,triwulan,tahun,status_alur,catatan_verifikator,pegawai:pegawai_id(id,nama,tim)`).in('status_alur', ['juri', 'verifikasi', 'dikembalikan']).order('created_at');
      if (error) { toast('Gagal memuat nominasi: ' + error.message, 'error'); return; }
      activeWorkflowRows = data || [];
      if (activeWorkflowRows.length) { nominationLocked = true; workflowStage = activeWorkflowRows[0].status_alur; finalNominee = activeWorkflowRows; }
      await populateNominationPeriods(); await loadNominasi();
    }
    async function loadNominasi() {
      const container = document.getElementById('nominasi-container'); const badge = document.getElementById('nomination-lock-badge');
      const summary = renderFlowSummary();
      if (nominationLocked) {
        if (badge) badge.innerHTML = `<span class="pill-terkunci">${workflowStage === 'juri' ? 'Di Juri' : workflowStage === 'verifikasi' ? 'Di Verifikator' : 'Dikembalikan'}</span>`;
        const returned = workflowStage === 'dikembalikan';
        container.innerHTML = summary + `<div class="flow-simple-note"><strong>Proses terkunci.</strong> ${returned ? `Verifikator mengembalikan proses dengan catatan: ${esc(finalNominee[0]?.catatan_verifikator || '-')}` : 'Kandidat final sudah dikirim dan tidak dapat berubah selama proses penilaian.'}${returned ? '<br><button class="btn btn-primary btn-sm mt-4" onclick="bukaKembaliKoreksi()">Perbaiki Nominasi</button>' : ''}</div>`;
        renderFinalList(); return;
      }
      if (badge) badge.innerHTML = finalCalendar?.siap_finalisasi ? '<span class="pill-finalisasi">Siap Finalisasi</span>' : '<span class="pill-monitoring">Monitoring</span>';
      if (!finalCalendar) { container.innerHTML = '<div class="empty-state">Triwulan belum dapat dimuat.</div>'; return; }
      const year = finalCalendar.tahun_seleksi, q = finalCalendar.triwulan_seleksi;
      const { data, error } = await db.rpc('get_kandidat_nominasi_triwulan', { p_tahun: year, p_triwulan: q });
      if (error) { container.innerHTML = summary + `<div class="empty-state">${esc(error.message)}</div>`; return; }
      const rows = (data || []).map(x => ({ pegawai: { id: x.pegawai_id, nama: x.nama, tim: x.tim }, pegawai_id: x.pegawai_id, nilai_awal: x.nilai_tertinggi, bulan_sumber: x.bulan_sumber, tahun: year, triwulan: q, jumlah_nilai_masuk: Number(x.jumlah_nilai_masuk || 0), jumlah_nilai_wajib: Number(x.jumlah_nilai_wajib || 0), siap_finalisasi: Boolean(x.siap_finalisasi), berstatus_tie: Boolean(x.berstatus_tie) }));
      finalAvailableNominees = new Map(rows.map(r => [String(r.pegawai_id), r]));
      let body = summary + `<div class="flow-simple-note"><strong>Aturan final:</strong> kandidat tiap divisi adalah pegawai dengan nilai paling tinggi dari pemenang bulanan dalam triwulan ini. Nilai tidak dirata-ratakan. Finalisasi hanya dilakukan setelah triwulan selesai dan data tiga bulan lengkap.</div>`;
      if (!rows.length) { container.innerHTML = body + '<div class="empty-state">Belum ada nilai pada periode ini.</div>'; renderFinalList(); return; }
      const group = {}; rows.forEach(r => (group[r.pegawai.tim] ||= []).push(r));
      TIM_OPTIONS.filter(t => group[t]).forEach(t => {
        body += `<div style="color:var(--cyan);font-weight:700;font-size:12px;letter-spacing:1px;margin:13px 0 7px;text-transform:uppercase">Tim ${esc(t)}</div>`; group[t].forEach(r => {
          const chosen = finalNominee.some(n => String(n.pegawai?.id) === String(r.pegawai_id)); const ready = r.siap_finalisasi && finalCalendar.siap_finalisasi;
          body += `<div class="nominasi-row"><div><div style="font-weight:650">${esc(r.pegawai.nama)}${r.berstatus_tie ? '<span class="quarter-tie">Nilai Seri</span>' : ''}</div><div class="nominee-source-detail">Nilai tertinggi: <strong>${Number(r.nilai_awal).toFixed(1)}</strong> · Sumber: <strong>${esc(monthLabel(r.bulan_sumber))}</strong></div><span class="${ready ? 'pill-finalisasi' : 'pill-monitoring'}">${ready ? 'Kandidat Final' : 'Pemimpin Sementara'}</span><span class="progress-simple">${r.jumlah_nilai_masuk}/${r.jumlah_nilai_wajib} nilai</span></div>${ready ? `<button class="btn btn-approve btn-xs" ${chosen ? 'disabled' : ''} onclick="pilihFinalByPegawai('${r.pegawai_id}')">${chosen ? 'Dipilih' : 'Pilih'}</button>` : ''}</div>`;
        });
      });
      container.innerHTML = body; renderFinalList();
    }
    function pilihFinalByPegawai(id) { const item = finalAvailableNominees.get(String(id)); if (!item || !item.siap_finalisasi) return toast('Kandidat belum siap difinalisasi.', 'info'); if (finalNominee.some(n => n.pegawai?.tim === item.pegawai.tim)) return toast('Setiap divisi hanya boleh memiliki satu kandidat.', 'error'); finalNominee.push(item); loadNominasi(); }
    function renderFinalList() {
      const el = document.getElementById('final-list'), btn = document.getElementById('send-jury-btn'), note = document.getElementById('send-jury-note'), badge = document.getElementById('final-status-badge'), label = document.getElementById('send-jury-label');
      if (label) label.textContent = 'Finalisasi Triwulan & Kirim ke Juri';
      if (badge) badge.innerHTML = nominationLocked ? '<span class="pill-terkunci">Terkunci</span>' : (finalCalendar?.siap_finalisasi ? '<span class="pill-finalisasi">Final</span>' : '<span class="pill-monitoring">Sementara</span>');
      el.innerHTML = finalNominee.length ? finalNominee.map(n => `<div class="rank-item"><div style="flex:1"><div style="font-weight:650">${esc(n.pegawai?.nama || '-')}</div><div class="text-xs" style="color:var(--text-3)">${esc(n.pegawai?.tim || n.tim || '-')} · Nilai ${Number(n.nilai_awal || 0).toFixed(1)} · ${esc(monthLabel(n.bulan_sumber))}</div></div>${nominationLocked ? '' : `<button class="btn btn-reject btn-xs" onclick="batalkanFinal('${n.pegawai?.id}')">Batalkan</button>`}</div>`).join('') : '<div class="empty-state">Belum ada kandidat final dipilih.</div>';
      const readyRows = [...finalAvailableNominees.values()].filter(x => x.siap_finalisasi); const teamCount = new Set(readyRows.map(x => x.pegawai.tim)).size; const ready = Boolean(finalCalendar?.siap_finalisasi) && teamCount > 0 && finalNominee.length === teamCount;
      if (btn) btn.disabled = nominationLocked || !ready;
      if (note) note.textContent = nominationLocked ? 'Proses telah dikunci.' : finalCalendar?.siap_finalisasi ? (ready ? 'Seluruh kandidat final siap dikirim ke Juri.' : 'Pilih satu kandidat final dari setiap divisi.') : 'Monitoring triwulan berjalan. Finalisasi tersedia setelah periode selesai dan data lengkap.';
    }
    async function kirimKeJuri() {
      if (!finalCalendar?.siap_finalisasi) return toast('Triwulan belum siap difinalisasi.', 'info');
      if (!confirm(`Finalisasi ${qLabel(finalCalendar.tahun_seleksi, finalCalendar.triwulan_seleksi)} dan kirim kandidat kepada Juri? Data nominasi akan dikunci.`)) return;
      const { error } = await db.rpc('kirim_nominasi_ke_juri', { p_tahun: finalCalendar.tahun_seleksi, p_triwulan: finalCalendar.triwulan_seleksi, p_pegawai_ids: finalNominee.map(n => n.pegawai.id) });
      if (error) return toast(error.message, 'error'); toast('Triwulan berhasil difinalisasi dan dikirim kepada Juri.', 'success'); await loadAdminDash();
    }
    async function bukaKembaliKoreksi() {
      if (!confirm('Buka kembali nominasi yang dikembalikan Verifikator? Penilaian Juri pada proses tersebut akan dibersihkan agar dapat diperbaiki.')) return;
      const { error } = await db.rpc('buka_kembali_setelah_koreksi'); if (error) return toast(error.message, 'error'); toast('Nominasi dibuka kembali untuk diperbaiki.', 'success'); await loadAdminDash();
    }
    async function loadInputNilai() {
      finalApplyStaticCopy(); await loadFinalCalendar(); await loadPegawaiSelect('in-pegawai');
      if (finalCalendar) { document.getElementById('in-tahun').value = finalCalendar.tahun_monitoring; document.getElementById('in-triw').value = String(finalCalendar.triwulan_monitoring); updateBulanOptions(); const m = Number(String(finalCalendar.bulan_berjalan).slice(5, 7)); const match = Object.entries(BULAN_NUM).find(([_, v]) => Number(v) === m); if (match) document.getElementById('in-bulan').value = match[0]; }
      await loadDataNilai();
    }
    async function simpanNilai() {
      const peg = document.getElementById('in-pegawai').value, nilai = Number(document.getElementById('in-nilai').value), kip = Number(document.getElementById('in-kipapp').value || 0), year = Number(document.getElementById('in-tahun').value), month = document.getElementById('in-bulan').value;
      if (!peg || !month || !Number.isFinite(nilai)) return toast('Lengkapi pegawai, bulan, dan nilai.', 'error');
      const { data, error } = await db.rpc('simpan_nilai_bulanan_realtime', { p_pegawai_id: peg, p_nilai: nilai, p_jumlah_kipapp: kip, p_periode_bulan: monthDate(year, month) });
      if (error) return toast(error.message, 'error'); const r = Array.isArray(data) ? data[0] : data; toast(r?.pesan || 'Nilai disimpan.', 'success'); await Promise.all([loadDataNilai(), loadAdminDash()]);
    }
    async function loadDataNilai() {
      const { data, error } = await db.from('nilai_final').select(`id,nilai,jumlah_kipapp,total_nilai,periode_bulan,triwulan,tahun,mode_rekam,pegawai:pegawai_id(id,nama,tim)`).order('periode_bulan', { ascending: false });
      const el = document.getElementById('data-nilai-list'); if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada data nilai.</div>'; return; }
      const grouped = {}; data.forEach(x => (grouped[monthLabel(x.periode_bulan)] ||= []).push(x));
      el.innerHTML = Object.entries(grouped).map(([periode, arr]) => `<div class="mb-6"><h3 style="font-size:14px;color:var(--cyan);margin-bottom:10px">${esc(periode)}</h3><table class="tbl"><thead><tr><th>Pegawai</th><th>Tim</th><th>Nilai</th><th>KIPAPP</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${arr.map(x => `<tr><td>${esc(x.pegawai?.nama || '-')}</td><td>${esc(x.pegawai?.tim || '-')}</td><td>${Number(x.total_nilai).toFixed(1)}</td><td>${Number(x.jumlah_kipapp || 0)}</td><td><span class="${x.mode_rekam === 'arsip' ? 'pill-warning' : 'pill-monitoring'}">${x.mode_rekam === 'arsip' ? 'Arsip' : 'Monitoring Triwulan'}</span></td><td><button class="btn btn-ghost btn-xs" onclick="editNilai('${x.pegawai?.id}',${Number(x.nilai)},${Number(x.jumlah_kipapp || 0)},'${x.periode_bulan}')">Edit</button></td></tr>`).join('')}</tbody></table></div>`).join('');
    }
    async function loadJuriList() {
      const el = document.getElementById('juri-list-admin'); const { data, error } = await db.rpc('get_daftar_juri_status');
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; }
      if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada pengguna ber-role Juri. Atur role melalui Kelola Pengguna.</div>'; return; }
      el.innerHTML = `<div class="guide-inline"><strong>Status siap menilai:</strong> role Juri, akun Aktif, dan sudah terhubung Sign Up/login.</div><div class="jury-readiness">${data.map(j => `<div class="jury-ready-card"><div class="name">${esc(j.nama)}</div><div class="mail">${esc(j.email)}</div><div class="meta"><span class="badge badge-cyan">${esc(j.tim)}</span><span class="${j.kesiapan === 'Siap Menilai' ? 'pill-ok' : 'pill-warning'}">${esc(j.kesiapan)}</span></div></div>`).join('')}</div>`;
    }
    async function activeLinkedJuri() { const { data } = await db.from('juri').select('*').eq('status', 'aktif').not('user_id', 'is', null).order('nama'); return data || []; }
    async function loadJuriPenilaian() {
      const el = document.getElementById('juri-penilaian-list'); const myJuri = await loadOwnJuriRecord();
      if (!myJuri) { el.innerHTML = '<div class="empty-state">Akun Juri belum berstatus Siap Menilai. Admin perlu memeriksa Kelola Pengguna.</div>'; return; }
      const [{ data: noms, error }, { data: scores }] = await Promise.all([db.from('nominasi_final').select(`id,pegawai_id,tim,nilai_awal,triwulan,tahun,status_alur,pegawai:pegawai_id(id,nama,tim)`).eq('status_alur', 'juri'), db.from('penilaian').select('*').eq('juri_id', myJuri.id)]);
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!noms?.length) { el.innerHTML = '<div class="empty-state">Belum ada nominasi final yang dikirim Admin.</div>'; return; }
      el.innerHTML = noms.map(n => { const saved = (scores || []).find(s => s.nominasi_id === n.id); return `<div class="panel mb-4"><div style="font-size:11px;color:var(--cyan);font-weight:700">${esc(n.pegawai?.tim || n.tim)}</div><div style="font-size:19px;font-weight:700;margin:4px 0 12px">${esc(n.pegawai?.nama || '-')}</div><button class="juri-btn-item ${saved ? 'completed' : 'waiting'}" onclick="openFinalScoreModal('${n.id}','${n.pegawai_id}','${encodeURIComponent(n.pegawai?.nama || '-')}')"><span class="jury-name"><span class="jury-status-dot"></span><span>${saved ? 'Nilai Saya Tersimpan' : 'Isi Nilai Saya'}</span></span><span class="${saved ? 'jury-score' : 'jury-score-placeholder'}">${saved ? Number(saved.total_nilai).toFixed(1) : 'Isi'}</span></button></div>`; }).join('');
    }
    function openFinalScoreModal(nominasiId, pegawaiId, encodedNama) { const nama = decodeURIComponent(encodedNama); scoreModalCtx = { nominasiId, pegId: pegawaiId, pegawaiNama: nama }; document.getElementById('modal-juri-name').textContent = 'Nilai Saya'; document.getElementById('modal-pegawai-name').textContent = nama; document.getElementById('modal-nilai').value = ''; document.getElementById('score-modal').classList.remove('hidden'); }
    async function submitNilaiJuri() { const nilai = Number(document.getElementById('modal-nilai').value); if (!Number.isFinite(nilai) || nilai < 0 || nilai > 100) return toast('Nilai harus 0 sampai 100.', 'error'); const { error } = await db.rpc('simpan_penilaian_juri', { p_nominasi_id: scoreModalCtx.nominasiId, p_nilai: nilai, p_catatan: null }); if (error) return toast(error.message, 'error'); closeScoreModal(); toast('Nilai berhasil disimpan.', 'success'); await Promise.all([loadJuriPenilaian(), loadJuriDash()]); }
    async function hapusNilaiJuri() { const { error } = await db.rpc('hapus_penilaian_juri', { p_nominasi_id: scoreModalCtx.nominasiId }); if (error) return toast(error.message, 'error'); closeScoreModal(); toast('Nilai dihapus.', 'info'); await Promise.all([loadJuriPenilaian(), loadJuriDash()]); }
    async function loadVerifNominasi() {
      const el = document.getElementById('verif-nominasi-list'); const { data, error } = await db.from('nominasi_final').select(`id,total_nilai,status_alur,triwulan,tahun,pegawai:pegawai_id(id,nama,tim)`).eq('status_alur', 'verifikasi').order('total_nilai', { ascending: false });
      if (error) { el.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; } if (!data?.length) { el.innerHTML = '<div class="empty-state">Belum ada ranking yang dikirim Admin.</div>'; return; }
      el.innerHTML = `<div class="guide-inline"><strong>Keputusan akhir:</strong> Verifikator menetapkan satu pemenang untuk triwulan ini, atau mengembalikan proses dengan alasan.</div>${data.map((n, i) => `<div class="approval-card"><div><div class="tim">Peringkat #${i + 1} · ${esc(n.pegawai?.tim || '-')}</div><div class="nama">${esc(n.pegawai?.nama || '-')}</div><div style="margin-top:8px;color:var(--text-2)">Nilai Juri: <strong style="color:var(--cyan)">${Number(n.total_nilai).toFixed(1)}</strong></div><div class="text-xs">Triwulan ${n.triwulan} Tahun ${n.tahun}</div></div><div class="verf-actions"><button class="btn btn-approve" onclick="approvePegawai('${n.id}','${esc(n.pegawai?.nama || '-')}')">Tetapkan Pemenang</button></div></div>`).join('')}<div class="panel mt-4"><div class="sec-head"><h2>Kembalikan untuk Perbaikan</h2></div><div class="mb-4"><label>Alasan</label><textarea id="return-reason" rows="3" placeholder="Tuliskan alasan pengembalian proses..."></textarea></div><button class="btn btn-ghost verf-return" onclick="kembalikanProses()">Kembalikan kepada Admin</button></div>`;
    }
    async function kembalikanProses() { const alasan = document.getElementById('return-reason')?.value.trim(); if (!alasan) return toast('Alasan wajib diisi.', 'error'); if (!confirm('Kembalikan proses kepada Admin untuk diperbaiki?')) return; const { error } = await db.rpc('kembalikan_ke_admin', { p_alasan: alasan }); if (error) return toast(error.message, 'error'); toast('Proses dikembalikan kepada Admin.', 'success'); await Promise.all([loadVerifNominasi(), loadVerfDash()]); }

    async function loadRanking() {
      const el = document.getElementById('ranking-container'), send = document.getElementById('send-approval-btn');
      if (!db) { el.innerHTML = '<div class="empty-state">Hubungkan Supabase.</div>'; return; }
      const { data, error } = await db.rpc('get_ranking_live');
      if (error) { el.innerHTML = `<div class="empty-state">Gagal memuat ranking: ${esc(error.message)}</div>`; if (send) send.disabled = true; return; }
      const rows = (data || []).filter(r => r.nilai !== null);
      if (!rows.length) { el.innerHTML = '<div class="empty-state">Belum ada penilaian juri.</div>'; if (send) send.disabled = true; return; }
      el.innerHTML = rows.map((r, i) => `<div class="rank-item"><span class="rank-num ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span><div style="flex:1"><div style="font-weight:650">${esc(r.nama)}</div><div class="text-xs" style="color:var(--text-2)">${esc(r.tim)} · ${r.jumlah_penilai}/${r.jumlah_juri} penilai</div></div><span style="font-family:'Orbitron',monospace;color:var(--cyan)">${Number(r.nilai).toFixed(1)}</span><span class="ranking-pill ${r.lengkap ? 'ready' : ''}">${r.lengkap ? 'Lengkap' : 'Proses'}</span></div>`).join('');
      if (send) { send.disabled = workflowStage !== 'juri' || !rows.every(r => r.lengkap); send.title = send.disabled ? 'Seluruh juri aktif harus menyelesaikan penilaian terlebih dahulu.' : ''; }
    }

    function switchPJTab(tab, btn) { if (tab === 'override') return;['manajemen', 'monitoring'].forEach(t => document.getElementById(`pj-${t}`).classList.add('hidden')); document.getElementById(`pj-${tab}`).classList.remove('hidden'); document.querySelectorAll('#pj-tabs button').forEach(b => b.className = 'btn btn-ghost btn-sm'); btn.className = 'btn btn-primary btn-sm'; if (tab === 'monitoring') loadMonitoring(); }

/* ====== SCRIPT BLOCK 3 ====== */
    let monthlyNomineeRows = [];
    let monthlyRejected = new Set();
    function monthlyKey(row) { return `${row.pegawai_id}|${row.bulan_sumber}`; }
    function hasThreeMonthlyWinners(team) { return new Set(monthlyNomineeRows.filter(r => r.tim === team).map(r => r.bulan_sumber)).size === 3; }
    function renderFlowSummary() {
      if (!finalCalendar) return '';
      const shown = qLabel(finalCalendar.tahun_seleksi, finalCalendar.triwulan_seleksi);
      return `<div class="flow-grid"><div class="flow-card cyan"><div class="lbl">Periode Dipantau</div><div class="val">${esc(shown)}<br>Pemenang bulanan per tim</div></div><div class="flow-card purple"><div class="lbl">Nominasi Final</div><div class="val">1 kandidat per tim<br>Total 6 kandidat</div></div><div class="flow-card gold"><div class="lbl">Keputusan Akhir</div><div class="val">1 pemenang per triwulan<br>Oleh Verifikator</div></div></div>`;
    }
    async function populateNominationPeriods() {
      const el = document.getElementById('nomination-period'); if (!el || !finalCalendar) return;
      const label = document.querySelector('#nomination-period-box label'), help = document.querySelector('.nomination-period-help');
      if (label) label.textContent = 'Triwulan Nominasi';
      const active = nominationLocked && activeWorkflowRows.length ? activeWorkflowRows[0] : null;
      const year = active ? active.tahun : finalCalendar.tahun_seleksi, q = active ? active.triwulan : finalCalendar.triwulan_seleksi;
      selectedNominationPeriod = qKey(year, q);
      el.innerHTML = `<option value="${selectedNominationPeriod}">${esc(qLabel(year, q))}</option>`; el.value = selectedNominationPeriod; el.disabled = true;
      if (help) help.textContent = 'Pemenang nilai bulanan per tim langsung tampil. Pilih nilai tertinggi dalam triwulan untuk Nominasi Final.';
    }
    async function loadNominasi() {
      const container = document.getElementById('nominasi-container'), badge = document.getElementById('nomination-lock-badge'), summary = renderFlowSummary();
      if (nominationLocked) {
        if (badge) badge.innerHTML = `<span class="pill-terkunci">${workflowStage === 'juri' ? 'Di Juri' : workflowStage === 'verifikasi' ? 'Di Verifikator' : 'Dikembalikan'}</span>`;
        container.innerHTML = summary + `<div class="simple-flow-note"><strong>Nominasi telah dikirim.</strong> Enam kandidat final tidak dapat diubah selama proses berlangsung.</div>`;
        renderFinalList(); return;
      }
      if (badge) badge.innerHTML = '<span class="pill-monitoring">Seleksi</span>';
      if (!finalCalendar) { container.innerHTML = '<div class="empty-state">Periode belum dapat dimuat.</div>'; return; }
      const year = finalCalendar.tahun_seleksi, q = finalCalendar.triwulan_seleksi;
      const { data, error } = await db.rpc('get_nominasi_bulanan_per_tim', { p_tahun: year, p_triwulan: q });
      if (error) { container.innerHTML = summary + `<div class="empty-state">${esc(error.message)}</div>`; return; }
      monthlyNomineeRows = (data || []).map(r => ({ tim: r.tim, bulan_sumber: r.bulan_sumber, pegawai_id: r.pegawai_id, pegawai: { id: r.pegawai_id, nama: r.nama, tim: r.tim }, nilai_awal: Number(r.nilai_bulanan), nilai_tertinggi_triwulan: Number(r.nilai_tertinggi_triwulan), kandidat_tertinggi: Boolean(r.kandidat_tertinggi), seri_tertinggi: Boolean(r.seri_tertinggi), tahun: year, triwulan: q }));
      finalAvailableNominees = new Map(monthlyNomineeRows.filter(r => r.kandidat_tertinggi).map(r => [String(r.pegawai_id), r]));
      finalNominee = finalNominee.filter(chosen => monthlyNomineeRows.some(r => r.tim === chosen.pegawai.tim && r.pegawai_id === chosen.pegawai_id && r.kandidat_tertinggi));
      let html = summary + `<div class="simple-flow-note"><strong>Aturan:</strong> pegawai dengan nilai tertinggi setiap bulan ditampilkan per tim. Dari maksimal 3 pemenang bulanan dalam satu triwulan, pilih kandidat dengan nilai tertinggi untuk masuk Nominasi Final. Nilai tidak dirata-ratakan.</div>`;
      if (!monthlyNomineeRows.length) { container.innerHTML = html + '<div class="empty-state">Belum ada nilai bulanan.</div>'; renderFinalList(); return; }
      TIM_OPTIONS.forEach(team => {
        const rows = monthlyNomineeRows.filter(r => r.tim === team); if (!rows.length) return;
        html += `<div style="color:var(--cyan);font-weight:700;font-size:12px;letter-spacing:1px;margin:14px 0 7px;text-transform:uppercase">Tim ${esc(team)}</div><div class="team-status-note">${rows.length === 3 ? 'Tiga pemenang bulanan tersedia - pilih kandidat tertinggi.' : `${rows.length} pemenang bulanan tersedia.`}</div>`;
        rows.forEach(row => {
          const selected = finalNominee.some(n => n.pegawai.tim === team && n.pegawai_id === row.pegawai_id);
          const refused = monthlyRejected.has(monthlyKey(row));
          html += `<div class="monthly-nominee ${row.kandidat_tertinggi ? 'top' : ''} ${refused ? 'rejected' : ''}"><div><div class="monthly-title">${esc(row.pegawai.nama)}${row.kandidat_tertinggi ? `<span class="top-score-pill">${row.seri_tertinggi ? 'Seri Tertinggi' : 'Tertinggi Triwulan'}</span>` : ''}</div><div class="monthly-meta">Nilai ${Number(row.nilai_awal).toFixed(1)} - ${esc(monthLabel(row.bulan_sumber))}</div><span class="month-source-pill">Pemenang Bulanan ${esc(monthLabel(row.bulan_sumber))}</span></div><div class="monthly-actions"><button class="btn btn-approve btn-xs" ${row.kandidat_tertinggi ? '' : 'disabled'} onclick="pilihFinalMonthly('${row.pegawai_id}','${row.bulan_sumber}','${esc(team)}')">${selected ? 'Dipilih' : 'Pilih'}</button><button class="btn btn-xs btn-no" onclick="tidakPilihMonthly('${row.pegawai_id}','${row.bulan_sumber}','${esc(team)}')">${refused ? 'Tidak Dipilih' : 'Tidak'}</button></div></div>`;
        });
      });
      container.innerHTML = html; renderFinalList();
    }
    function pilihFinalMonthly(pegawaiId, bulanSumber, team) {
      const row = monthlyNomineeRows.find(r => String(r.pegawai_id) === String(pegawaiId) && r.bulan_sumber === bulanSumber && r.tim === team);
      if (!row || !row.kandidat_tertinggi) return toast('Hanya kandidat dengan nilai tertinggi triwulan yang dapat dipilih.', 'info');
      finalNominee = finalNominee.filter(n => n.pegawai.tim !== team); finalNominee.push(row); monthlyRejected.delete(monthlyKey(row)); loadNominasi();
    }
    function tidakPilihMonthly(pegawaiId, bulanSumber, team) {
      const row = monthlyNomineeRows.find(r => String(r.pegawai_id) === String(pegawaiId) && r.bulan_sumber === bulanSumber && r.tim === team); finalNominee = finalNominee.filter(n => !(n.pegawai.tim === team && String(n.pegawai_id) === String(pegawaiId))); if (row) monthlyRejected.add(monthlyKey(row)); loadNominasi();
    }
    function pilihFinalByPegawai(id) { const row = monthlyNomineeRows.find(r => String(r.pegawai_id) === String(id) && r.kandidat_tertinggi); if (row) pilihFinalMonthly(row.pegawai_id, row.bulan_sumber, row.tim); }
    function renderFinalList() {
      const el = document.getElementById('final-list'), badge = document.getElementById('final-status-badge'), btn = document.getElementById('send-jury-btn'), label = document.getElementById('send-jury-label'), note = document.getElementById('send-jury-note');
      if (badge) badge.innerHTML = nominationLocked ? '<span class="pill-terkunci">Terkunci</span>' : '<span class="pill-monitoring">Seleksi</span>';
      el.innerHTML = finalNominee.length ? finalNominee.map(item => `<div class="rank-item final-nominee-row"><div style="flex:1"><div style="font-weight:650">${esc(item.pegawai.nama)}</div><div class="text-xs" style="color:var(--text-3);margin-top:3px">${esc(item.pegawai.tim)} - Nilai ${Number(item.nilai_awal).toFixed(1)} - ${esc(monthLabel(item.bulan_sumber))}</div></div>${nominationLocked ? '' : `<button class="btn btn-reject btn-xs" onclick="batalkanFinal('${item.pegawai.id}')">Batalkan</button>`}</div>`).join('') : '<div class="empty-state">Belum ada kandidat final dipilih.</div>';
      if (!btn) return;
      const tigaBulan = TIM_OPTIONS.every(team => hasThreeMonthlyWinners(team));
      const enamTerpilih = TIM_OPTIONS.every(team => finalNominee.some(n => n.pegawai.tim === team));
      btn.disabled = nominationLocked || !tigaBulan || !enamTerpilih;
      if (label) label.textContent = nominationLocked ? 'Terkunci' : 'Kirim 6 Kandidat ke Juri';
      if (note) note.textContent = nominationLocked ? 'Nominasi final telah dikunci.' : !tigaBulan ? 'Kirim aktif setelah tersedia pemenang bulanan dari 3 bulan untuk seluruh 6 tim.' : !enamTerpilih ? 'Pilih satu kandidat tertinggi dari masing-masing 6 tim.' : 'Enam kandidat final siap dikirim ke Juri.';
    }
    async function kirimKeJuri() {
      if (nominationLocked) return toast('Nominasi sudah dikunci.', 'info');
      if (!TIM_OPTIONS.every(team => hasThreeMonthlyWinners(team))) return toast('Belum tersedia pemenang bulanan tiga bulan untuk seluruh tim.', 'info');
      if (!TIM_OPTIONS.every(team => finalNominee.some(n => n.pegawai.tim === team))) return toast('Pilih satu kandidat final dari masing-masing enam tim.', 'info');
      if (!confirm(`Kirim 6 kandidat final ${qLabel(finalCalendar.tahun_seleksi, finalCalendar.triwulan_seleksi)} ke Juri?\n\nSetelah dikirim, nominasi tidak dapat diubah.`)) return;
      const { error } = await db.rpc('kirim_nominasi_ke_juri', { p_tahun: finalCalendar.tahun_seleksi, p_triwulan: finalCalendar.triwulan_seleksi, p_pegawai_ids: finalNominee.map(n => n.pegawai.id) });
      if (error) return toast('Gagal mengirim nominasi: ' + error.message, 'error');
      toast('Enam kandidat final berhasil dikirim ke Juri.', 'success'); await loadAdminDash();
    }


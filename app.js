
const SUPABASE_URL = "https://srfhamdyewblyuangxzz.supabase.co/rest/v1/
";
const SUPABASE_KEY = "sb_publishable_GBr3oKysuufZHQ4Ol-1J0Q_QJWabH1q";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// DAFTAR MODUL
// ==========================================

const modules = {
  keuangan: ["💰", "Pencatatan Keuangan", "Pencatatan pemasukan, pengeluaran, dan transaksi kas."],
  coa: ["📚", "Chart of Accounts", "Pengelolaan daftar akun dan kode perkiraan."],
  jurnal: ["📖", "Jurnal Umum", "Pencatatan jurnal debit dan kredit."],
  "buku-besar": ["📒", "Buku Besar", "Riwayat mutasi dan saldo setiap akun."],
  laporan: ["📊", "Laporan Keuangan", "Neraca, laba rugi, dan laporan arus kas."],
  "utang-piutang": ["💳", "Utang & Piutang", "Pengelolaan kewajiban dan tagihan koperasi."],
  bank: ["🏦", "Rekonsiliasi Bank", "Pencocokan catatan kas dengan rekening bank."],
  invoice: ["🧾", "Invoice", "Pembuatan dan pengelolaan faktur."],
  toko: ["🛒", "Transaksi Toko", "Pencatatan penjualan dan transaksi toko."],
  simpanan: ["👥", "Simpanan & Pinjaman", "Pengelolaan simpanan anggota dan pinjaman."],
  persediaan: ["📦", "Persediaan Barang", "Pengelolaan stok masuk dan stok keluar."],
  bulanan: ["📅", "Laporan Bulanan", "Rekapitulasi keuangan setiap bulan."],
  monitoring: ["🛡️", "Monitoring Manajer", "Pemantauan aktivitas dan kondisi keuangan."],
  pengaturan: ["⚙️", "Pengaturan", "Pengaturan sistem dan pengguna."]
};

// ==========================================
// TAMPILAN LOGIN
// ==========================================

const loginStyle = document.createElement("style");

loginStyle.textContent = `
  #loginScreen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #f5f6fa;
    font-family: Arial, sans-serif;
  }

  .login-card {
    width: 100%;
    max-width: 410px;
    background: white;
    padding: 35px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,.08);
  }

  .login-logo {
    width: 58px;
    height: 58px;
    background: #a71925;
    color: white;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 20px;
  }

  .login-card h2 {
    color: #222;
    margin: 0 0 8px;
  }

  .login-card p {
    color: #777;
    font-size: 14px;
    margin-bottom: 25px;
  }

  .login-card label {
    display: block;
    font-size: 13px;
    font-weight: bold;
    margin: 15px 0 7px;
    color: #444;
  }

  .login-card input {
    width: 100%;
    box-sizing: border-box;
    padding: 13px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 15px;
  }

  .login-card button {
    width: 100%;
    padding: 14px;
    margin-top: 22px;
    border: none;
    border-radius: 8px;
    background: #a71925;
    color: white;
    font-size: 15px;
    font-weight: bold;
    cursor: pointer;
  }

  .login-card button:disabled {
    opacity: .6;
    cursor: wait;
  }

  #loginError {
    color: #b91c2c;
    font-size: 13px;
    margin-top: 14px;
    line-height: 1.5;
  }

  #logoutButton {
    border: 1px solid #ddd;
    background: white;
    padding: 8px 12px;
    border-radius: 7px;
    cursor: pointer;
    margin-left: 15px;
  }
`;

document.head.appendChild(loginStyle);

const loginScreen = document.createElement("div");
loginScreen.id = "loginScreen";

loginScreen.innerHTML = `
  <div class="login-card">
    <div class="login-logo">KD</div>
    <h2>KDMP ERP</h2>
    <p>Pendowo Asri Management System</p>

    <form id="loginForm">
      <label for="loginEmail">Email</label>
      <input
        type="email"
        id="loginEmail"
        placeholder="Masukkan email"
        autocomplete="username"
        required
      >

      <label for="loginPassword">Password</label>
      <input
        type="password"
        id="loginPassword"
        placeholder="Masukkan password"
        autocomplete="current-password"
        required
      >

      <button type="submit" id="loginButton">Masuk ke Sistem</button>
      <div id="loginError" role="alert"></div>
    </form>
  </div>
`;

document.body.prepend(loginScreen);

// ==========================================
// FUNGSI LOGIN
// ==========================================

const layout = document.querySelector(".layout");

if (layout) {
  layout.style.display = "none";
}

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Memeriksa akun...";
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = "Login gagal. Periksa email dan password.";
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }

  await loadUserProfile(data.user);
});

// ==========================================
// MEMBACA PROFIL DAN JABATAN
// ==========================================

async function loadUserProfile(user) {
  loginError.textContent = "";

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("nama_lengkap, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    loginError.textContent =
      "Profil pengguna tidak ditemukan. Hubungi manajer sistem.";

    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }

  loginScreen.style.display = "none";

  if (layout) {
    layout.style.display = "";
  }

  const userInfo = document.querySelector(".user-info");
  const avatar = document.querySelector(".avatar");

  if (userInfo) {
    userInfo.replaceChildren();

    const name = document.createTextNode(profile.nama_lengkap);
    const role = document.createElement("small");

    role.textContent = profile.role.replaceAll("_", " ");

    userInfo.append(name, role);
  }

  if (avatar) {
    avatar.textContent = profile.nama_lengkap.charAt(0).toUpperCase();
  }

  addLogoutButton();

  window.currentUser = {
    id: user.id,
    nama: profile.nama_lengkap,
    role: profile.role
  };

  console.log("Login berhasil:", profile.nama_lengkap, profile.role);
}

// ==========================================
// TOMBOL LOGOUT
// ==========================================

function addLogoutButton() {
  const topActions = document.querySelector(".top-actions");

  if (!topActions || document.getElementById("logoutButton")) return;

  const button = document.createElement("button");

  button.id = "logoutButton";
  button.textContent = "Keluar";

  button.addEventListener("click", async function() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      alert("Gagal keluar. Silakan coba lagi.");
      return;
    }

    window.location.reload();
  });

  topActions.appendChild(button);
}

// ==========================================
// MEMERIKSA SESSION SAAT HALAMAN DIBUKA
// ==========================================

async function checkLoginSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    loginError.textContent = "Tidak dapat memeriksa sesi login.";
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }

  if (data.session) {
    await loadUserProfile(data.session.user);
  }
}

// ==========================================
// NAVIGASI
// ==========================================

function showPage(page, button) {
  document.querySelectorAll(".page").forEach(element => {
    element.style.display = "none";
  });

  const dashboard = document.getElementById("dashboard");
  const modulePage = document.getElementById("modulePage");

  if (page === "dashboard") {
    dashboard.style.display = "block";
    document.getElementById("pageTitle").textContent = "Dashboard";

  } else if (modules[page]) {
    modulePage.style.display = "block";

    const data = modules[page];

    document.getElementById("moduleIcon").textContent = data[0];
    document.getElementById("moduleName").textContent = data[1];
    document.getElementById("moduleDescription").textContent = data[2];
    document.getElementById("pageTitle").textContent = data[1];
  }

  document.querySelectorAll(".menu button").forEach(element => {
    element.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  } else {
    document.querySelectorAll(".menu button").forEach(element => {
      if (element.getAttribute("onclick")?.includes("'" + page + "'")) {
        element.classList.add("active");
      }
    });
  }

  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// Jalankan pemeriksaan sesi
checkLoginSession();

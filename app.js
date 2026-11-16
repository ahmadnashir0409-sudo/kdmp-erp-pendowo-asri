
const SUPABASE_URL = "https://srfhamdyewblyuangxzz.supabase.co";
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

  /* CHART OF ACCOUNTS */

  #coaContent {
    margin-top: 28px;
    width: 100%;
  }

  .coa-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .coa-summary {
    color: #666;
    font-size: 14px;
  }

  .coa-add-button {
    background: #a71925;
    color: white;
    border: none;
    padding: 11px 17px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  .coa-add-button:hover {
    background: #80121c;
  }

  .coa-table-wrap {
    width: 100%;
    overflow-x: auto;
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
  }

  .coa-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 650px;
  }

  .coa-table th,
  .coa-table td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #eee;
    font-size: 13px;
  }

  .coa-table th {
    background: #fafafa;
    color: #555;
    font-weight: 700;
  }

  .coa-table td {
    color: #333;
  }

  .coa-table tr:last-child td {
    border-bottom: none;
  }

  .coa-status {
    display: inline-block;
    padding: 5px 9px;
    border-radius: 20px;
    background: #e8f7ed;
    color: #18743b;
    font-size: 11px;
    font-weight: bold;
  }

  .coa-form {
    display: none;
    background: white;
    border: 1px solid #eee;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .coa-form h3 {
    margin-top: 0;
    color: #333;
  }

  .coa-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .coa-field label {
    display: block;
    margin-bottom: 7px;
    font-size: 13px;
    font-weight: bold;
    color: #555;
  }

  .coa-field input,
  .coa-field select {
    box-sizing: border-box;
    width: 100%;
    padding: 11px;
    border: 1px solid #ddd;
    border-radius: 7px;
    background: white;
    font-size: 14px;
  }

  .coa-form-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
  }

  .coa-form-actions button {
    border: none;
    border-radius: 7px;
    padding: 11px 17px;
    cursor: pointer;
    font-weight: bold;
  }

  .coa-save {
    background: #a71925;
    color: white;
  }

  .coa-cancel {
    background: #eee;
    color: #444;
  }

  #coaMessage {
    margin: 12px 0;
    font-size: 13px;
  }

  .coa-error {
    color: #b91c2c;
  }

  .coa-success {
    color: #18743b;
  }

  .coa-empty {
    padding: 25px;
    text-align: center;
    color: #777;
  }

  @media(max-width: 600px) {
    .coa-form-grid {
      grid-template-columns: 1fr;
    }
  }
`;

document.head.appendChild(loginStyle);

// ==========================================
// MEMBUAT HALAMAN LOGIN
// ==========================================

const loginScreen = document.createElement("div");
loginScreen.id = "loginScreen";

loginScreen.innerHTML = `
  <div class="login-card">
    <div class="login-logo">KD</div>
    <h2>KDMP ERP</h2>
    <p>Pendowo Asri Management System</p>

    <form id="loginForm">
      <label for="loginEmail">Email</label>
      <input type="email" id="loginEmail"
        placeholder="Masukkan email"
        autocomplete="username" required>

      <label for="loginPassword">Password</label>
      <input type="password" id="loginPassword"
        placeholder="Masukkan password"
        autocomplete="current-password" required>

      <button type="submit" id="loginButton">
        Masuk ke Sistem
      </button>

      <div id="loginError" role="alert"></div>
    </form>
  </div>
`;

document.body.prepend(loginScreen);

const layout = document.querySelector(".layout");

if (layout) {
  layout.style.display = "none";
}

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

// ==========================================
// LOGIN
// ==========================================

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
// MEMBACA PROFIL
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

  window.currentUser = {
    id: user.id,
    nama: profile.nama_lengkap,
    role: profile.role
  };

  addLogoutButton();

  console.log("Login berhasil:", profile.nama_lengkap, profile.role);
}

// ==========================================
// LOGOUT
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
// CHART OF ACCOUNTS
// ==========================================

function setupCOA() {
  const modulePage = document.getElementById("modulePage");

  if (!modulePage || document.getElementById("coaContent")) return;

  const content = document.createElement("section");
  content.id = "coaContent";

  content.innerHTML = `
    <div class="coa-toolbar">
      <div class="coa-summary" id="coaSummary">
        Memuat daftar akun...
      </div>

      <button class="coa-add-button" id="coaAddButton">
        + Tambah Akun
      </button>
    </div>

    <div class="coa-form" id="coaForm">
      <h3>Tambah Akun Baru</h3>

      <form id="coaCreateForm">
        <div class="coa-form-grid">

          <div class="coa-field">
            <label for="coaCode">Kode Akun</label>
            <input id="coaCode" required maxlength="20"
              placeholder="Contoh: 1105">
          </div>

          <div class="coa-field">
            <label for="coaName">Nama Akun</label>
            <input id="coaName" required maxlength="100"
              placeholder="Nama akun">
          </div>

          <div class="coa-field">
            <label for="coaCategory">Kategori</label>
            <select id="coaCategory" required>
              <option value="aset">Aset</option>
              <option value="kewajiban">Kewajiban</option>
              <option value="ekuitas">Ekuitas</option>
              <option value="pendapatan">Pendapatan</option>
              <option value="beban">Beban</option>
            </select>
          </div>

          <div class="coa-field">
            <label for="coaNormal">Saldo Normal</label>
            <select id="coaNormal" required>
              <option value="debit">Debit</option>
              <option value="kredit">Kredit</option>
            </select>
          </div>

        </div>

        <div id="coaMessage"></div>

        <div class="coa-form-actions">
          <button type="submit" class="coa-save" id="coaSaveButton">
            Simpan Akun
          </button>

          <button type="button" class="coa-cancel" id="coaCancelButton">
            Batal
          </button>
        </div>
      </form>
    </div>

    <div class="coa-table-wrap">
      <table class="coa-table">
        <thead>
          <tr>
            <th>Kode Akun</th>
            <th>Nama Akun</th>
            <th>Kategori</th>
            <th>Saldo Normal</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody id="coaTableBody">
          <tr>
            <td colspan="5" class="coa-empty">
              Memuat data akun...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  modulePage.appendChild(content);

  document.getElementById("coaAddButton").addEventListener("click", () => {
    document.getElementById("coaForm").style.display = "block";
    document.getElementById("coaMessage").textContent = "";
  });

  document.getElementById("coaCancelButton").addEventListener("click", () => {
    document.getElementById("coaForm").style.display = "none";
    document.getElementById("coaCreateForm").reset();
  });

  document.getElementById("coaCreateForm").addEventListener(
    "submit",
    createCOAAccount
  );

  if (window.currentUser?.role !== "manajer") {
    document.getElementById("coaAddButton").style.display = "none";
  }
}

// ==========================================
// MENGAMBIL DATA AKUN DARI SUPABASE
// ==========================================

async function loadCOA() {
  setupCOA();

  const summary = document.getElementById("coaSummary");
  const tableBody = document.getElementById("coaTableBody");

  if (!summary || !tableBody) return;

  summary.textContent = "Memuat daftar akun...";

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="coa-empty">
        Sedang mengambil data dari database...
      </td>
    </tr>
  `;

  const { data: accounts, error } = await supabaseClient
    .from("accounts")
    .select("id, kode_akun, nama_akun, kategori, saldo_normal, aktif")
    .order("kode_akun", { ascending: true });

  if (error) {
    summary.textContent = "Gagal mengambil data akun.";

    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="coa-empty coa-error">
          ${escapeHTML(error.message)}
        </td>
      </tr>
    `;

    console.error("Kesalahan mengambil akun:", error);
    return;
  }

  summary.textContent = `Total ${accounts.length} akun terdaftar`;

  if (accounts.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="coa-empty">
          Belum ada akun yang terdaftar.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.replaceChildren();

  accounts.forEach(account => {
    const row = document.createElement("tr");

    const values = [
      account.kode_akun,
      account.nama_akun,
      capitalize(account.kategori),
      capitalize(account.saldo_normal)
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const status = document.createElement("span");

    status.className = account.aktif ? "coa-status" : "";
    status.textContent = account.aktif ? "Aktif" : "Nonaktif";

    statusCell.appendChild(status);
    row.appendChild(statusCell);

    tableBody.appendChild(row);
  });
}

// ==========================================
// TAMBAH AKUN BARU
// ==========================================

async function createCOAAccount(event) {
  event.preventDefault();

  if (window.currentUser?.role !== "manajer") {
    alert("Hanya manajer yang dapat menambah akun.");
    return;
  }

  const code = document.getElementById("coaCode").value.trim();
  const name = document.getElementById("coaName").value.trim();
  const category = document.getElementById("coaCategory").value;
  const normal = document.getElementById("coaNormal").value;

  const saveButton = document.getElementById("coaSaveButton");
  const message = document.getElementById("coaMessage");

  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan...";
  message.textContent = "";

  const { error } = await supabaseClient
    .from("accounts")
    .insert({
      kode_akun: code,
      nama_akun: name,
      kategori: category,
      saldo_normal: normal
    });

  saveButton.disabled = false;
  saveButton.textContent = "Simpan Akun";

  if (error) {
    message.className = "coa-error";
    message.textContent =
      "Gagal menyimpan akun: " + error.message;
    return;
  }

  message.className = "coa-success";
  message.textContent = "Akun berhasil disimpan.";

  document.getElementById("coaCreateForm").reset();

  await loadCOA();
}

// ==========================================
// FUNGSI BANTU
// ==========================================

function capitalize(value) {
  if (!value) return "-";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

// ==========================================
// MEMERIKSA SESSION LOGIN
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

    const coaContent = document.getElementById("coaContent");

    if (coaContent) {
      coaContent.style.display = page === "coa" ? "block" : "none";
    }

    if (page === "coa") {
      loadCOA();
    }
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

// Memastikan fungsi bisa dipanggil dari tombol HTML
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;

// Jalankan pemeriksaan sesi
checkLoginSession();

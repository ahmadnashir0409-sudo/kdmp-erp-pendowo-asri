
const SUPABASE_URL = "https://srfhamdyewblyuangxzz.supabase.co";
const SUPABASE_KEY = "sb_publishable_GBr3oKysuufZHQ4Ol-1J0Q_QJWabH1q";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

let coaCache = [];
let journalRowCount = 0;

// ==========================================
// CSS TAMBAHAN
// ==========================================

const style = document.createElement("style");

style.textContent = `
#loginScreen {
  min-height:100vh;display:flex;align-items:center;
  justify-content:center;padding:20px;background:#f5f6fa;
  font-family:Arial,sans-serif;
}
.login-card {
  width:100%;max-width:410px;background:white;padding:35px;
  border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08);
}
.login-logo {
  width:58px;height:58px;background:#a71925;color:white;
  border-radius:14px;display:flex;align-items:center;
  justify-content:center;font-size:22px;font-weight:bold;
  margin-bottom:20px;
}
.login-card h2 {color:#222;margin:0 0 8px}
.login-card p {color:#777;font-size:14px;margin-bottom:25px}
.login-card label {
  display:block;font-size:13px;font-weight:bold;
  margin:15px 0 7px;color:#444;
}
.login-card input {
  width:100%;box-sizing:border-box;padding:13px;
  border:1px solid #ddd;border-radius:8px;font-size:15px;
}
.login-card button {
  width:100%;padding:14px;margin-top:22px;border:none;
  border-radius:8px;background:#a71925;color:white;
  font-size:15px;font-weight:bold;cursor:pointer;
}
.login-card button:disabled {opacity:.6;cursor:wait}
#loginError {color:#b91c2c;font-size:13px;margin-top:14px}
#logoutButton {
  border:1px solid #ddd;background:white;padding:8px 12px;
  border-radius:7px;cursor:pointer;margin-left:15px;
}

/* AREA MODUL */
.erp-content {margin-top:25px;width:100%}
.erp-toolbar {
  display:flex;justify-content:space-between;
  align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;
}
.erp-button {
  background:#a71925;color:white;border:0;padding:11px 16px;
  border-radius:8px;cursor:pointer;font-weight:600;
}
.erp-button:disabled {opacity:.6;cursor:wait}
.erp-button.secondary {background:#eee;color:#444}
.erp-form {
  display:none;background:white;border:1px solid #eee;
  border-radius:12px;padding:20px;margin-bottom:20px;
}
.erp-form h3 {margin-top:0}
.erp-field label {
  display:block;font-size:13px;font-weight:bold;
  margin-bottom:7px;color:#555;
}
.erp-field input,.erp-field select {
  box-sizing:border-box;width:100%;padding:11px;
  border:1px solid #ddd;border-radius:7px;background:white;
  font-size:14px;
}
.erp-grid {
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
}
.erp-table-wrap {
  width:100%;overflow-x:auto;background:white;
  border:1px solid #eee;border-radius:12px;
}
.erp-table {width:100%;border-collapse:collapse;min-width:650px}
.erp-table th,.erp-table td {
  padding:13px 15px;text-align:left;
  border-bottom:1px solid #eee;font-size:13px;
}
.erp-table th {background:#fafafa;color:#555}
.erp-table tr:last-child td {border-bottom:0}
.erp-message {font-size:13px;margin:12px 0}
.erp-error {color:#b91c2c}
.erp-success {color:#18743b}
.erp-muted {color:#777;font-size:13px}
.erp-actions {display:flex;gap:10px;margin-top:18px}
.erp-actions button {
  border:0;border-radius:7px;padding:11px 16px;
  cursor:pointer;font-weight:bold;
}
.erp-status {
  display:inline-block;padding:5px 9px;border-radius:20px;
  background:#e8f7ed;color:#18743b;font-size:11px;font-weight:bold;
}

/* FORM JURNAL */
.journal-line {
  display:grid;
  grid-template-columns:1.1fr 1.5fr 1fr 1fr auto;
  gap:9px;align-items:end;padding:12px 0;
  border-bottom:1px solid #eee;
}
.journal-line .erp-field {min-width:0}
.journal-line input,.journal-line select {
  min-width:0;width:100%;box-sizing:border-box;
}
.journal-remove {
  border:0;background:#fee;color:#a71925;
  padding:10px;border-radius:7px;cursor:pointer;
}
.journal-totals {
  display:flex;justify-content:flex-end;gap:25px;
  flex-wrap:wrap;margin-top:18px;font-size:14px;
}
.journal-total {font-weight:bold}
.journal-balance {margin-top:12px;font-size:13px;font-weight:bold}
@media(max-width:700px) {
  .erp-grid {grid-template-columns:1fr}
  .journal-line {
    grid-template-columns:1fr 1fr;
    border:1px solid #eee;border-radius:9px;
    padding:12px;margin-bottom:12px;
  }
  .journal-line .account-field,
  .journal-line .description-field {grid-column:1/-1}
  .journal-remove {grid-column:1/-1}
}
`;

document.head.appendChild(style);

// ==========================================
// LOGIN
// ==========================================

const loginScreen = document.createElement("div");
loginScreen.id = "loginScreen";
loginScreen.innerHTML = `
  <div class="login-card">
    <div class="login-logo">KD</div>
    <h2>KDMP ERP</h2>
    <p>Pendowo Asri Management System</p>
    <form id="loginForm">
      <label>Email</label>
      <input type="email" id="loginEmail" required autocomplete="username">
      <label>Password</label>
      <input type="password" id="loginPassword" required autocomplete="current-password">
      <button type="submit" id="loginButton">Masuk ke Sistem</button>
      <div id="loginError" role="alert"></div>
    </form>
  </div>
`;

document.body.prepend(loginScreen);

const layout = document.querySelector(".layout");
if (layout) layout.style.display = "none";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Memeriksa akun...";
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const {data, error} = await supabaseClient.auth.signInWithPassword({
    email, password
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
// PROFIL PENGGUNA
// ==========================================

async function loadUserProfile(user) {
  const {data: profile, error} = await supabaseClient
    .from("profiles")
    .select("nama_lengkap, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    loginError.textContent = "Profil pengguna tidak ditemukan.";
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }

  loginScreen.style.display = "none";
  if (layout) layout.style.display = "";

  window.currentUser = {
    id:user.id,
    nama:profile.nama_lengkap,
    role:profile.role
  };

  const userInfo = document.querySelector(".user-info");
  const avatar = document.querySelector(".avatar");

  if (userInfo) {
    userInfo.replaceChildren();
    userInfo.append(document.createTextNode(profile.nama_lengkap));
    const role = document.createElement("small");
    role.textContent = profile.role.replaceAll("_"," ");
    userInfo.append(role);
  }

  if (avatar) {
    avatar.textContent = profile.nama_lengkap.charAt(0).toUpperCase();
  }

  addLogoutButton();
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

  button.addEventListener("click", async () => {
    const {error} = await supabaseClient.auth.signOut();
    if (error) {
      alert("Gagal keluar. Silakan coba lagi.");
      return;
    }
    window.location.reload();
  });

  topActions.appendChild(button);
}

// ==========================================
// FUNGSI UMUM
// ==========================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[character]);
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "-";
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style:"currency",currency:"IDR",maximumFractionDigits:0
  }).format(value || 0);
}

// ==========================================
// CHART OF ACCOUNTS
// ==========================================

function setupCOA() {
  const page = document.getElementById("modulePage");
  if (!page || document.getElementById("coaContent")) return;

  const section = document.createElement("section");
  section.id = "coaContent";
  section.className = "erp-content";

  section.innerHTML = `
    <div class="erp-toolbar">
      <div class="erp-muted" id="coaSummary">Memuat akun...</div>
      <button class="erp-button" id="coaAddButton">+ Tambah Akun</button>
    </div>
    <div class="erp-form" id="coaForm">
      <h3>Tambah Akun Baru</h3>
      <form id="coaCreateForm">
        <div class="erp-grid">
          <div class="erp-field">
            <label>Kode Akun</label>
            <input id="coaCode" required maxlength="20" placeholder="Contoh: 1105">
          </div>
          <div class="erp-field">
            <label>Nama Akun</label>
            <input id="coaName" required maxlength="100">
          </div>
          <div class="erp-field">
            <label>Kategori</label>
            <select id="coaCategory">
              <option value="aset">Aset</option>
              <option value="kewajiban">Kewajiban</option>
              <option value="ekuitas">Ekuitas</option>
              <option value="pendapatan">Pendapatan</option>
              <option value="beban">Beban</option>
            </select>
          </div>
          <div class="erp-field">
            <label>Saldo Normal</label>
            <select id="coaNormal">
              <option value="debit">Debit</option>
              <option value="kredit">Kredit</option>
            </select>
          </div>
        </div>
        <div id="coaMessage" class="erp-message"></div>
        <div class="erp-actions">
          <button class="erp-button" id="coaSaveButton">Simpan Akun</button>
          <button type="button" class="erp-button secondary" id="coaCancelButton">Batal</button>
        </div>
      </form>
    </div>
    <div class="erp-table-wrap">
      <table class="erp-table">
        <thead><tr>
          <th>Kode Akun</th><th>Nama Akun</th><th>Kategori</th>
          <th>Saldo Normal</th><th>Status</th>
        </tr></thead>
        <tbody id="coaTableBody"></tbody>
      </table>
    </div>
  `;

  page.appendChild(section);

  document.getElementById("coaAddButton").addEventListener("click", () => {
    document.getElementById("coaForm").style.display = "block";
  });

  document.getElementById("coaCancelButton").addEventListener("click", () => {
    document.getElementById("coaForm").style.display = "none";
    document.getElementById("coaCreateForm").reset();
  });

  document.getElementById("coaCreateForm").addEventListener("submit", createCOAAccount);

  if (window.currentUser?.role !== "manajer") {
    document.getElementById("coaAddButton").style.display = "none";
  }
}

async function loadCOA() {
  setupCOA();

  const summary = document.getElementById("coaSummary");
  const body = document.getElementById("coaTableBody");
  if (!summary || !body) return;

  summary.textContent = "Memuat akun...";

  const {data,error} = await supabaseClient
    .from("accounts")
    .select("id,kode_akun,nama_akun,kategori,saldo_normal,aktif")
    .order("kode_akun");

  if (error) {
    summary.textContent = "Gagal mengambil akun.";
    body.innerHTML = `<tr><td colspan="5">${escapeHTML(error.message)}</td></tr>`;
    return;
  }

  coaCache = data || [];
  summary.textContent = `Total ${coaCache.length} akun terdaftar`;
  body.replaceChildren();

  coaCache.forEach(account => {
    const row = document.createElement("tr");

    [
      account.kode_akun,
      account.nama_akun,
      capitalize(account.kategori),
      capitalize(account.saldo_normal),
      account.aktif ? "Aktif" : "Nonaktif"
    ].forEach((value,index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === 4 && account.aktif) {
        const status = document.createElement("span");
        status.className = "erp-status";
        status.textContent = "Aktif";
        cell.replaceChildren(status);
      }
      row.appendChild(cell);
    });

    body.appendChild(row);
  });
}

async function createCOAAccount(event) {
  event.preventDefault();

  if (window.currentUser?.role !== "manajer") return;

  const button = document.getElementById("coaSaveButton");
  const message = document.getElementById("coaMessage");
  button.disabled = true;

  const {error} = await supabaseClient.from("accounts").insert({
    kode_akun:document.getElementById("coaCode").value.trim(),
    nama_akun:document.getElementById("coaName").value.trim(),
    kategori:document.getElementById("coaCategory").value,
    saldo_normal:document.getElementById("coaNormal").value
  });

  button.disabled = false;

  if (error) {
    message.className = "erp-message erp-error";
    message.textContent = error.message;
    return;
  }

  message.className = "erp-message erp-success";
  message.textContent = "Akun berhasil ditambahkan.";
  document.getElementById("coaCreateForm").reset();
  await loadCOA();
}

// ==========================================
// JURNAL UMUM - TAMPILAN
// ==========================================

function setupJournal() {
  const page = document.getElementById("modulePage");
  if (!page || document.getElementById("journalContent")) return;

  const section = document.createElement("section");
  section.id = "journalContent";
  section.className = "erp-content";

  section.innerHTML = `
    <div class="erp-toolbar">
      <div class="erp-muted">Pencatatan transaksi debit dan kredit</div>
      <button class="erp-button" id="journalNewButton">+ Buat Jurnal</button>
    </div>

    <div class="erp-form" id="journalForm">
      <h3>Buat Jurnal Umum</h3>

      <form id="journalCreateForm">
        <div class="erp-grid">
          <div class="erp-field">
            <label>Tanggal Transaksi</label>
            <input type="date" id="journalDate" required>
          </div>
          <div class="erp-field">
            <label>Keterangan Transaksi</label>
            <input id="journalDescription" required
              placeholder="Contoh: Pembelian perlengkapan toko">
          </div>
        </div>

        <h4 style="margin:22px 0 8px">Rincian Jurnal</h4>
        <div class="erp-muted">
          Setiap baris hanya boleh diisi debit atau kredit.
        </div>

        <div id="journalLines"></div>

        <button type="button" class="erp-button secondary"
          id="journalAddLine" style="margin-top:14px">
          + Tambah Baris
        </button>

        <div class="journal-totals">
          <div>Total Debit: <span id="journalDebitTotal" class="journal-total">Rp0</span></div>
          <div>Total Kredit: <span id="journalCreditTotal" class="journal-total">Rp0</span></div>
        </div>

        <div id="journalBalance" class="journal-balance"></div>
        <div id="journalMessage" class="erp-message"></div>

        <div class="erp-actions">
          <button type="submit" class="erp-button" id="journalSaveButton">
            Simpan dan Posting
          </button>
          <button type="button" class="erp-button secondary" id="journalCancelButton">
            Batal
          </button>
        </div>
      </form>
    </div>

    <h3>Riwayat Jurnal</h3>
    <div class="erp-table-wrap">
      <table class="erp-table">
        <thead><tr>
          <th>Nomor Jurnal</th><th>Tanggal</th>
          <th>Keterangan</th><th>Status</th>
          <th>Total Debit</th><th>Total Kredit</th>
        </tr></thead>
        <tbody id="journalHistoryBody">
          <tr><td colspan="6">Memuat riwayat jurnal...</td></tr>
        </tbody>
      </table>
    </div>
  `;

  page.appendChild(section);

  document.getElementById("journalNewButton").addEventListener("click", openJournalForm);
  document.getElementById("journalAddLine").addEventListener("click", addJournalLine);
  document.getElementById("journalCancelButton").addEventListener("click", closeJournalForm);
  document.getElementById("journalCreateForm").addEventListener("submit", saveJournal);

  document.getElementById("journalDate").value =
    new Date().toLocaleDateString("en-CA");

  if (!["manajer","admin_keuangan"].includes(window.currentUser?.role)) {
    document.getElementById("journalNewButton").style.display = "none";
  }
}

async function openJournalForm() {
  const {data,error} = await supabaseClient
    .from("accounts")
    .select("id,kode_akun,nama_akun,aktif")
    .eq("aktif",true)
    .order("kode_akun");

  if (error) {
    alert("Gagal memuat daftar akun: " + error.message);
    return;
  }

  coaCache = data || [];

  if (coaCache.length < 2) {
    alert("Minimal harus tersedia dua akun aktif.");
    return;
  }

  document.getElementById("journalForm").style.display = "block";
  document.getElementById("journalCreateForm").reset();
  document.getElementById("journalDate").value =
    new Date().toLocaleDateString("en-CA");

  document.getElementById("journalLines").replaceChildren();
  journalRowCount = 0;

  addJournalLine();
  addJournalLine();
  updateJournalTotals();

  document.getElementById("journalMessage").textContent = "";
  document.getElementById("journalBalance").textContent = "";
}

function closeJournalForm() {
  document.getElementById("journalForm").style.display = "none";
}

function addJournalLine() {
  const container = document.getElementById("journalLines");
  const row = document.createElement("div");

  row.className = "journal-line";
  row.dataset.row = String(++journalRowCount);

  const options = coaCache.map(account =>
    `<option value="${escapeHTML(account.id)}">${escapeHTML(account.kode_akun)} - ${escapeHTML(account.nama_akun)}</option>`
  ).join("");

  row.innerHTML = `
    <div class="erp-field account-field">
      <label>Akun</label>
      <select class="line-account" required>
        <option value="">Pilih akun</option>${options}
      </select>
    </div>
    <div class="erp-field description-field">
      <label>Keterangan</label>
      <input class="line-description" placeholder="Keterangan baris">
    </div>
    <div class="erp-field">
      <label>Debit (Rp)</label>
      <input class="line-debit" type="number" min="0" step="0.01" value="0">
    </div>
    <div class="erp-field">
      <label>Kredit (Rp)</label>
      <input class="line-credit" type="number" min="0" step="0.01" value="0">
    </div>
    <button type="button" class="journal-remove" title="Hapus baris">Hapus</button>
  `;

  row.querySelector(".line-debit").addEventListener("input", () => {
    if (Number(row.querySelector(".line-debit").value) > 0) {
      row.querySelector(".line-credit").value = "0";
    }
    updateJournalTotals();
  });

  row.querySelector(".line-credit").addEventListener("input", () => {
    if (Number(row.querySelector(".line-credit").value) > 0) {
      row.querySelector(".line-debit").value = "0";
    }
    updateJournalTotals();
  });

  row.querySelector(".journal-remove").addEventListener("click", () => {
    if (container.children.length <= 2) {
      alert("Jurnal minimal harus memiliki dua baris.");
      return;
    }
    row.remove();
    updateJournalTotals();
  });

  container.appendChild(row);
}

function updateJournalTotals() {
  const rows = [...document.querySelectorAll(".journal-line")];

  const debit = rows.reduce((sum,row) =>
    sum + Number(row.querySelector(".line-debit").value || 0),0);

  const credit = rows.reduce((sum,row) =>
    sum + Number(row.querySelector(".line-credit").value || 0),0);

  document.getElementById("journalDebitTotal").textContent = formatRupiah(debit);
  document.getElementById("journalCreditTotal").textContent = formatRupiah(credit);

  const balance = document.getElementById("journalBalance");

  if (debit > 0 && Math.abs(debit-credit) < 0.005) {
    balance.textContent = "✓ Debit dan kredit seimbang.";
    balance.className = "journal-balance erp-success";
  } else {
    balance.textContent = "Belum seimbang. Selisih: " + formatRupiah(Math.abs(debit-credit));
    balance.className = "journal-balance erp-error";
  }
}

// ==========================================
// SIMPAN DAN POSTING JURNAL
// ==========================================

async function saveJournal(event) {
  event.preventDefault();

  const button = document.getElementById("journalSaveButton");
  const message = document.getElementById("journalMessage");

  if (!["manajer","admin_keuangan"].includes(window.currentUser?.role)) {
    message.textContent = "Akses tidak diizinkan.";
    message.className = "erp-message erp-error";
    return;
  }

  const rows = [...document.querySelectorAll(".journal-line")];

  if (rows.length < 2) {
    message.textContent = "Jurnal minimal memiliki dua baris.";
    message.className = "erp-message erp-error";
    return;
  }

  const lines = [];

  for (const row of rows) {
    const accountId = row.querySelector(".line-account").value;
    const debit = Number(row.querySelector(".line-debit").value || 0);
    const credit = Number(row.querySelector(".line-credit").value || 0);
    const description = row.querySelector(".line-description").value.trim();

    if (!accountId || !Number.isFinite(debit) || !Number.isFinite(credit)) {
      message.textContent = "Lengkapi akun dan nilai transaksi.";
      message.className = "erp-message erp-error";
      return;
    }

    if (debit < 0 || credit < 0 || (debit > 0 && credit > 0) ||
        (debit === 0 && credit === 0)) {
      message.textContent = "Setiap baris harus berisi debit atau kredit saja.";
      message.className = "erp-message erp-error";
      return;
    }

    lines.push({
      account_id:accountId,
      keterangan:description || null,
      debit,
      kredit:credit
    });
  }

  const totalDebit = lines.reduce((sum,line) => sum + line.debit,0);
  const totalCredit = lines.reduce((sum,line) => sum + line.kredit,0);

  if (totalDebit <= 0 || Math.abs(totalDebit-totalCredit) >= 0.005) {
    message.textContent = "Total debit dan kredit harus sama dan lebih dari nol.";
    message.className = "erp-message erp-error";
    return;
  }

  const date = document.getElementById("journalDate").value;
  const description = document.getElementById("journalDescription").value.trim();

  if (!date || !description) {
    message.textContent = "Tanggal dan keterangan transaksi wajib diisi.";
    message.className = "erp-message erp-error";
    return;
  }

  button.disabled = true;
  button.textContent = "Menyimpan jurnal...";
  message.textContent = "";

  const journalNumber =
    "JU-" + date.replaceAll("-","") + "-" + Date.now().toString().slice(-6);

  // 1. Simpan header sebagai draft terlebih dahulu.
  const {data:header,error:headerError} = await supabaseClient
    .from("journal_entries")
    .insert({
      nomor_jurnal:journalNumber,
      tanggal:date,
      keterangan:description,
      status:"draft",
      created_by:window.currentUser.id
    })
    .select("id")
    .single();

  if (headerError) {
    button.disabled = false;
    button.textContent = "Simpan dan Posting";
    message.textContent = "Gagal membuat jurnal: " + headerError.message;
    message.className = "erp-message erp-error";
    return;
  }

  // 2. Simpan baris debit dan kredit.
  const journalLines = lines.map(line => ({
    ...line,
    journal_id:header.id
  }));

  const {error:lineError} = await supabaseClient
    .from("journal_lines")
    .insert(journalLines);

  if (lineError) {
    await supabaseClient.from("journal_entries").delete().eq("id",header.id);
    button.disabled = false;
    button.textContent = "Simpan dan Posting";
    message.textContent = "Gagal menyimpan rincian: " + lineError.message;
    message.className = "erp-message erp-error";
    return;
  }

  // 3. Posting. Trigger database memeriksa keseimbangan.
  const {error:postError} = await supabaseClient
    .from("journal_entries")
    .update({status:"posted"})
    .eq("id",header.id);

  if (postError) {
    // Bersihkan jurnal draft jika posting gagal.
    await supabaseClient.from("journal_entries").delete().eq("id",header.id);

    button.disabled = false;
    button.textContent = "Simpan dan Posting";
    message.textContent = "Jurnal belum berhasil diposting: " + postError.message;
    message.className = "erp-message erp-error";
    return;
  }

  button.disabled = false;
  button.textContent = "Simpan dan Posting";

  message.textContent = "Jurnal berhasil disimpan dan diposting!";
  message.className = "erp-message erp-success";

  document.getElementById("journalCreateForm").reset();
  document.getElementById("journalLines").replaceChildren();
  closeJournalForm();

  await loadJournalHistory();
}

// ==========================================
// RIWAYAT JURNAL
// ==========================================

async function loadJournalHistory() {
  const body = document.getElementById("journalHistoryBody");
  if (!body) return;

  body.innerHTML = `<tr><td colspan="6">Memuat riwayat jurnal...</td></tr>`;

  const {data:entries,error} = await supabaseClient
    .from("journal_entries")
    .select("id,nomor_jurnal,tanggal,keterangan,status")
    .order("tanggal",{ascending:false})
    .limit(50);

  if (error) {
    body.innerHTML = `<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;
    return;
  }

  if (!entries || entries.length === 0) {
    body.innerHTML = `<tr><td colspan="6">Belum ada jurnal.</td></tr>`;
    return;
  }

  const ids = entries.map(entry => entry.id);

  const {data:lines,error:lineError} = await supabaseClient
    .from("journal_lines")
    .select("journal_id,debit,kredit")
    .in("journal_id",ids);

  if (lineError) {
    body.innerHTML = `<tr><td colspan="6">${escapeHTML(lineError.message)}</td></tr>`;
    return;
  }

  body.replaceChildren();

  entries.forEach(entry => {
    const related = (lines || []).filter(line => line.journal_id === entry.id);
    const debit = related.reduce((sum,line) => sum + Number(line.debit),0);
    const credit = related.reduce((sum,line) => sum + Number(line.kredit),0);

    const row = document.createElement("tr");

    [
      entry.nomor_jurnal,
      entry.tanggal,
      entry.keterangan,
      entry.status,
      formatRupiah(debit),
      formatRupiah(credit)
    ].forEach((value,index) => {
      const cell = document.createElement("td");
      cell.textContent = value;

      if (index === 3 && entry.status === "posted") {
        const badge = document.createElement("span");
        badge.className = "erp-status";
        badge.textContent = "Posted";
        cell.replaceChildren(badge);
      }

      row.appendChild(cell);
    });

    body.appendChild(row);
  });
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

    const coa = document.getElementById("coaContent");
    const journal = document.getElementById("journalContent");

    if (coa) coa.style.display = page === "coa" ? "block" : "none";
    if (journal) journal.style.display = page === "jurnal" ? "block" : "none";

    if (page === "coa") loadCOA();

    if (page === "jurnal") {
      setupJournal();
      loadJournalHistory();
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
  window.scrollTo(0,0);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

window.showPage = showPage;
window.toggleSidebar = toggleSidebar;

// ==========================================
// PERIKSA SESSION
// ==========================================

async function checkLoginSession() {
  const {data,error} = await supabaseClient.auth.getSession();

  if (error) {
    loginError.textContent = "Tidak dapat memeriksa sesi login.";
    return;
  }

  if (data.session) {
    await loadUserProfile(data.session.user);
  }
}

checkLoginSession();

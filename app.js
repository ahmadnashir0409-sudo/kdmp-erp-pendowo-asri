
const SUPABASE_URL = "https://srfhamdyewblyuangxzz.supabase.co";
const SUPABASE_KEY = "sb_publishable_GBr3oKysuufZHQ4Ol-1J0Q_QJWabH1q";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.kdmpSupabase = supabaseClient;
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
let financialAccountsCache = [];
let journalRowCount = 0;
let financialType = "pemasukan";

// CSS TAMBAHAN
const style = document.createElement("style");
style.textContent = `
#loginScreen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f5f6fa;font-family:Arial,sans-serif}
.login-card{width:100%;max-width:410px;background:white;padding:35px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08)}
.login-logo{width:58px;height:58px;background:#a71925;color:white;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;margin-bottom:20px}
.login-card h2{color:#222;margin:0 0 8px}.login-card p{color:#777;font-size:14px;margin-bottom:25px}
.login-card label{display:block;font-size:13px;font-weight:bold;margin:15px 0 7px;color:#444}
.login-card input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #ddd;border-radius:8px;font-size:15px}
.login-card button{width:100%;padding:14px;margin-top:22px;border:none;border-radius:8px;background:#a71925;color:white;font-size:15px;font-weight:bold;cursor:pointer}
.login-card button:disabled{opacity:.6;cursor:wait}#loginError{color:#b91c2c;font-size:13px;margin-top:14px}
#logoutButton{border:1px solid #ddd;background:white;padding:8px 12px;border-radius:7px;cursor:pointer;margin-left:15px}
.erp-content{margin-top:25px;width:100%}
.erp-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.erp-button{background:#a71925;color:white;border:0;padding:11px 16px;border-radius:8px;cursor:pointer;font-weight:600}
.erp-button:disabled{opacity:.6;cursor:wait}.erp-button.secondary{background:#eee;color:#444}
.erp-form{display:none;background:white;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:20px}
.erp-form h3{margin-top:0}.erp-field label{display:block;font-size:13px;font-weight:bold;margin-bottom:7px;color:#555}
.erp-field input,.erp-field select{box-sizing:border-box;width:100%;padding:11px;border:1px solid #ddd;border-radius:7px;background:white;font-size:14px}
.erp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.erp-table-wrap{width:100%;overflow-x:auto;background:white;border:1px solid #eee;border-radius:12px}
.erp-table{width:100%;border-collapse:collapse;min-width:650px}
.erp-table th,.erp-table td{padding:13px 15px;text-align:left;border-bottom:1px solid #eee;font-size:13px;white-space:nowrap}
.erp-table th{background:#fafafa;color:#555}.erp-table tr:last-child td{border-bottom:0}
.erp-message{font-size:13px;margin:12px 0}.erp-error{color:#b91c2c}.erp-success{color:#18743b}
.erp-muted{color:#777;font-size:13px}.erp-actions{display:flex;gap:10px;margin-top:18px}
.erp-actions button{border:0;border-radius:7px;padding:11px 16px;cursor:pointer;font-weight:bold}
.erp-status{display:inline-block;padding:5px 9px;border-radius:20px;background:#e8f7ed;color:#18743b;font-size:11px;font-weight:bold}
.journal-line{display:grid;grid-template-columns:1.1fr 1.5fr 1fr 1fr auto;gap:9px;align-items:end;padding:12px 0;border-bottom:1px solid #eee}
.journal-line .erp-field{min-width:0}.journal-line input,.journal-line select{min-width:0;width:100%;box-sizing:border-box}
.journal-remove{border:0;background:#fee;color:#a71925;padding:10px;border-radius:7px;cursor:pointer}
.journal-totals{display:flex;justify-content:flex-end;gap:25px;flex-wrap:wrap;margin-top:18px;font-size:14px}
.journal-total{font-weight:bold}.journal-balance{margin-top:12px;font-size:13px;font-weight:bold}
.financial-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:20px}
.financial-card{background:white;border:1px solid #eee;border-radius:12px;padding:18px}
.financial-card small{color:#777;display:block;margin-bottom:9px}.financial-card strong{font-size:20px;color:#222}
.financial-tabs{display:flex;gap:10px;margin-bottom:18px}
.financial-tabs button{border:1px solid #ddd;background:white;color:#555;padding:10px 18px;border-radius:8px;cursor:pointer;font-weight:bold}
.financial-tabs button.active{background:#a71925;color:white;border-color:#a71925}
.financial-note{background:#fff8e8;border:1px solid #f1dfb7;color:#75551c;padding:12px;border-radius:8px;font-size:12px;margin-bottom:16px}
.ledger-filter{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end;background:white;border:1px solid #eee;border-radius:12px;padding:18px;margin-bottom:20px}
.ledger-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}
.ledger-card{background:white;border:1px solid #eee;border-radius:12px;padding:16px;min-width:0}
.ledger-card small{display:block;color:#777;margin-bottom:8px}.ledger-card strong{font-size:17px;color:#222;overflow-wrap:anywhere}
.ledger-opening{background:#fff8e8;color:#75551c;padding:13px;border-radius:8px;margin-bottom:15px;font-size:13px}
.report-filter{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;background:white;border:1px solid #eee;border-radius:12px;padding:18px;margin-bottom:20px}
.report-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}
.report-card{background:white;border:1px solid #eee;border-radius:12px;padding:18px;min-width:0}
.report-card small{display:block;color:#777;margin-bottom:9px}
.report-card strong{font-size:20px;color:#222;overflow-wrap:anywhere}
.report-card.profit{border-left:4px solid #18743b}
.report-card.loss{border-left:4px solid #b91c2c}
.report-section-title{margin:25px 0 12px;font-size:16px}
.report-total-row{font-weight:bold;background:#fafafa}
.report-empty{padding:18px;text-align:center;color:#777}
@media(max-width:700px){
 .erp-grid{grid-template-columns:1fr}
 .journal-line{grid-template-columns:1fr 1fr;border:1px solid #eee;border-radius:9px;padding:12px;margin-bottom:12px}
 .journal-line .account-field,.journal-line .description-field{grid-column:1/-1}
 .journal-remove{grid-column:1/-1}
 .ledger-filter{grid-template-columns:1fr}
 .ledger-summary{grid-template-columns:1fr 1fr}
 .report-filter{grid-template-columns:1fr}
 .report-summary{grid-template-columns:1fr}
}
@media(max-width:600px){.financial-summary{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

// ==========================================
// DASHBOARD - DATA DARI SUPABASE
// ==========================================

const dashboardStyle = document.createElement("style");
dashboardStyle.textContent = `
.dashboard-chart-wrap {
  background:white;
  border:1px solid #eee;
  border-radius:12px;
  padding:20px;
  overflow-x:auto;
}
.dashboard-chart {
  display:flex;
  align-items:flex-end;
  justify-content:space-around;
  gap:12px;
  min-height:220px;
  min-width:320px;
  padding-top:15px;
}
.dashboard-chart-group {
  flex:1;
  min-width:35px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:flex-end;
  height:200px;
}
.dashboard-bars {
  height:170px;
  display:flex;
  align-items:flex-end;
  justify-content:center;
  gap:4px;
  width:100%;
}
.dashboard-bar {
  width:35%;
  min-height:2px;
  border-radius:5px 5px 0 0;
}
.dashboard-bar.income {background:#16a36a}
.dashboard-bar.expense {background:#d34b55}
.dashboard-chart-label {
  font-size:11px;
  color:#777;
  margin-top:8px;
}
.dashboard-legend {
  display:flex;
  gap:18px;
  flex-wrap:wrap;
  margin-top:15px;
  font-size:12px;
  color:#666;
}
.dashboard-legend span {
  display:flex;
  align-items:center;
  gap:6px;
}
.dashboard-dot {
  width:9px;
  height:9px;
  border-radius:3px;
  display:inline-block;
}
.dashboard-error {
  color:#b91c2c;
  font-size:13px;
  padding:12px 0;
}
`;
document.head.appendChild(dashboardStyle);

async function getAllFinancialTransactions() {
  const all = [];
  const pageSize = 500;
  let from = 0;

  while (true) {
    const {data,error} = await supabaseClient
      .from("financial_transactions")
      .select("id,tanggal,jenis,akun_kas_id,akun_lawan_id,nominal,keterangan,journal_id,created_at")
      .order("tanggal",{ascending:false})
      .range(from,from+pageSize-1);

    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function getDashboardCashBalance() {
  const {data:accounts,error:accountError} = await supabaseClient
    .from("accounts")
    .select("id,kode_akun,nama_akun")
    .in("kode_akun",["1101","1102"]);

  if (accountError) throw accountError;
  const accountIds = (accounts || []).map(a=>a.id);
  if (!accountIds.length) return 0;

  let balance = 0;
  let from = 0;
  const pageSize = 500;

  while (true) {
    const {data,error} = await supabaseClient
      .from("journal_lines")
      .select("account_id,debit,kredit,journal_entries!inner(status)")
      .in("account_id",accountIds)
      .eq("journal_entries.status","posted")
      .range(from,from+pageSize-1);

    if (error) throw error;
    (data || []).forEach(line=>{
      balance += Number(line.debit || 0) - Number(line.kredit || 0);
    });
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return balance;
}

function dashboardMonthKey(date) {
  return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
}

function renderDashboardChart(transactions) {
  const chart = document.getElementById("dashboardChart");
  const periodSelect = document.getElementById("dashboardPeriod");
  if (!chart) return;

  const months = Number(periodSelect?.value || 1);
  const now = new Date();
  const start = new Date(now.getFullYear(),now.getMonth()-months+1,1);
  const totals = {};

  for (let i=0;i<months;i++) {
    const date = new Date(start.getFullYear(),start.getMonth()+i,1);
    totals[dashboardMonthKey(date)] = {
      label:date.toLocaleDateString("id-ID",{month:"short"}),
      income:0,
      expense:0
    };
  }

  transactions.forEach(item=>{
    const date = new Date(item.tanggal+"T00:00:00");
    const key = dashboardMonthKey(date);
    if (!totals[key]) return;
    if (item.jenis==="pemasukan") totals[key].income += Number(item.nominal);
    else if (item.jenis==="pengeluaran") totals[key].expense += Number(item.nominal);
  });

  const values = Object.values(totals);
  const maximum = Math.max(1,...values.map(x=>Math.max(x.income,x.expense)));

  chart.className = "dashboard-chart-wrap";
  chart.innerHTML = `
    <div class="dashboard-chart">
      ${values.map(item=>{
        const incomeHeight = item.income/maximum*100;
        const expenseHeight = item.expense/maximum*100;
        return `
          <div class="dashboard-chart-group">
            <div class="dashboard-bars">
              <div class="dashboard-bar income" style="height:${incomeHeight}%" title="Pemasukan: ${formatRupiah(item.income)}"></div>
              <div class="dashboard-bar expense" style="height:${expenseHeight}%" title="Pengeluaran: ${formatRupiah(item.expense)}"></div>
            </div>
            <div class="dashboard-chart-label">${escapeHTML(item.label)}</div>
          </div>`;
      }).join("")}
    </div>
    <div class="dashboard-legend">
      <span><i class="dashboard-dot" style="background:#16a36a"></i>Pemasukan</span>
      <span><i class="dashboard-dot" style="background:#d34b55"></i>Pengeluaran</span>
    </div>`;
}

function renderDashboardRecent(transactions) {
  const container = document.getElementById("dashboardRecentTransactions");
  if (!container) return;

  const latest = [...transactions]
    .sort((a,b)=>{
      const dateCompare = String(b.tanggal).localeCompare(String(a.tanggal));
      if (dateCompare !== 0) return dateCompare;
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    }).slice(0,5);

  if (!latest.length) {
    container.innerHTML = `<tr><td colspan="5">Belum ada transaksi keuangan.</td></tr>`;
    return;
  }

  container.innerHTML = latest.map(item=>`
    <tr>
      <td>${escapeHTML(item.tanggal)}</td>
      <td>${item.jenis==="pemasukan"?"Pemasukan":"Pengeluaran"}</td>
      <td>${escapeHTML(item.keterangan)}</td>
      <td>${formatRupiah(item.nominal)}</td>
      <td><span class="erp-status">Posted</span></td>
    </tr>
  `).join("");
}

async function loadDashboard() {
  const incomeElement = document.getElementById("dashboardIncome");
  if (!incomeElement) return;
  incomeElement.textContent = "Memuat...";

  try {
    const [transactions,cashBalance] = await Promise.all([
      getAllFinancialTransactions(),
      getDashboardCashBalance()
    ]);

    const income = transactions.filter(x=>x.jenis==="pemasukan").reduce((sum,x)=>sum+Number(x.nominal),0);
    const expense = transactions.filter(x=>x.jenis==="pengeluaran").reduce((sum,x)=>sum+Number(x.nominal),0);

    incomeElement.textContent = formatRupiah(income);
    const expenseElement = document.getElementById("dashboardExpense");
    if (expenseElement) expenseElement.textContent = formatRupiah(expense);
    const cashElement = document.getElementById("dashboardCash");
    if (cashElement) cashElement.textContent = formatRupiah(cashBalance);
    const countElement = document.getElementById("dashboardTransactionCount");
    if (countElement) countElement.textContent = transactions.length;

    renderDashboardChart(transactions);
    renderDashboardRecent(transactions);
  } catch (error) {
    console.error("Dashboard error:",error);
    incomeElement.textContent = "Gagal memuat";
    ["dashboardExpense","dashboardCash","dashboardTransactionCount"].forEach(id=>{
      const element = document.getElementById(id);
      if (element) element.textContent = "-";
    });
    const chart = document.getElementById("dashboardChart");
    if (chart) chart.innerHTML = `<div class="dashboard-error">Dashboard gagal mengambil data. Periksa hak akses database dan koneksi Supabase.</div>`;
    const recent = document.getElementById("dashboardRecentTransactions");
    if (recent) recent.innerHTML = `<tr><td colspan="5">Gagal memuat transaksi.</td></tr>`;
  }
}

document.getElementById("dashboardPeriod")?.addEventListener("change",async ()=>{
  await loadDashboard();
});

// LOGIN
const loginScreen = document.createElement("div");
loginScreen.id = "loginScreen";
loginScreen.innerHTML = `
  <div class="login-card">
    <div class="login-logo">KD</div>
    <h2>KDMP ERP</h2>
    <p>Pendowo Asri Management System</p>
    <form id="loginForm">
      <label>Email</label><input type="email" id="loginEmail" required autocomplete="username">
      <label>Password</label><input type="password" id="loginPassword" required autocomplete="current-password">
      <button type="submit" id="loginButton">Masuk ke Sistem</button>
      <div id="loginError" role="alert"></div>
    </form>
  </div>`;
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
  const {data,error} = await supabaseClient.auth.signInWithPassword({email,password});

  if (error) {
    loginError.textContent = "Login gagal. Periksa email dan password.";
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }
  await loadUserProfile(data.user);
});

async function loadUserProfile(user) {
  const {data:profile,error} = await supabaseClient
    .from("profiles").select("nama_lengkap, role").eq("id",user.id).single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    loginError.textContent = "Profil pengguna tidak ditemukan.";
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Sistem";
    return;
  }

  loginScreen.style.display = "none";
  if (layout) layout.style.display = "";

  window.currentUser = {id:user.id,nama:profile.nama_lengkap,role:profile.role};

  const userInfo = document.querySelector(".user-info");
  const avatar = document.querySelector(".avatar");
  if (userInfo) {
    userInfo.replaceChildren(document.createTextNode(profile.nama_lengkap));
    const role = document.createElement("small");
    role.textContent = profile.role.replaceAll("_"," ");
    userInfo.append(role);
  }
  if (avatar) avatar.textContent = profile.nama_lengkap.charAt(0).toUpperCase();
  addLogoutButton();
}

function addLogoutButton() {
  const topActions = document.querySelector(".top-actions");
  if (!topActions || document.getElementById("logoutButton")) return;
  const button = document.createElement("button");
  button.id = "logoutButton";
  button.textContent = "Keluar";
  button.addEventListener("click", async () => {
    const {error} = await supabaseClient.auth.signOut();
    if (error) { alert("Gagal keluar. Silakan coba lagi."); return; }
    window.location.reload();
  });
  topActions.appendChild(button);
}

// FUNGSI UMUM
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[character]);
}
function capitalize(value) { return value ? value.charAt(0).toUpperCase()+value.slice(1) : "-"; }
function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value || 0);
}
function todayDate() {
  const now = new Date();
  const local = new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}
function firstDayOfMonth() { return todayDate().slice(0,8)+"01"; }

// CHART OF ACCOUNTS
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
          <div class="erp-field"><label>Kode Akun</label><input id="coaCode" required maxlength="20" placeholder="Contoh: 1105"></div>
          <div class="erp-field"><label>Nama Akun</label><input id="coaName" required maxlength="100"></div>
          <div class="erp-field"><label>Kategori</label><select id="coaCategory">
            <option value="aset">Aset</option><option value="kewajiban">Kewajiban</option><option value="ekuitas">Ekuitas</option><option value="pendapatan">Pendapatan</option><option value="beban">Beban</option>
          </select></div>
          <div class="erp-field"><label>Saldo Normal</label><select id="coaNormal"><option value="debit">Debit</option><option value="kredit">Kredit</option></select></div>
        </div>
        <div id="coaMessage" class="erp-message"></div>
        <div class="erp-actions"><button class="erp-button" id="coaSaveButton">Simpan Akun</button><button type="button" class="erp-button secondary" id="coaCancelButton">Batal</button></div>
      </form>
    </div>
    <div class="erp-table-wrap"><table class="erp-table">
      <thead><tr><th>Kode Akun</th><th>Nama Akun</th><th>Kategori</th><th>Saldo Normal</th><th>Status</th></tr></thead>
      <tbody id="coaTableBody"></tbody>
    </table></div>`;
  page.appendChild(section);

  document.getElementById("coaAddButton").addEventListener("click",()=>document.getElementById("coaForm").style.display="block");
  document.getElementById("coaCancelButton").addEventListener("click",()=>{
    document.getElementById("coaForm").style.display="none";
    document.getElementById("coaCreateForm").reset();
  });
  document.getElementById("coaCreateForm").addEventListener("submit",createCOAAccount);
  if (window.currentUser?.role!=="manajer") document.getElementById("coaAddButton").style.display="none";
}

async function loadCOA() {
  setupCOA();
  const summary=document.getElementById("coaSummary"),body=document.getElementById("coaTableBody");
  if (!summary||!body) return;
  summary.textContent="Memuat akun...";
  const {data,error}=await supabaseClient.from("accounts")
    .select("id,kode_akun,nama_akun,kategori,saldo_normal,aktif").order("kode_akun");
  if (error) {
    summary.textContent="Gagal mengambil akun.";
    body.innerHTML=`<tr><td colspan="5">${escapeHTML(error.message)}</td></tr>`;
    return;
  }
  coaCache=data||[];
  summary.textContent=`Total ${coaCache.length} akun terdaftar`;
  body.replaceChildren();
  coaCache.forEach(account=>{
    const row=document.createElement("tr");
    [account.kode_akun,account.nama_akun,capitalize(account.kategori),capitalize(account.saldo_normal),account.aktif?"Aktif":"Nonaktif"].forEach((value,index)=>{
      const cell=document.createElement("td");
      cell.textContent=value;
      if(index===4&&account.aktif){
        const badge=document.createElement("span");
        badge.className="erp-status";badge.textContent="Aktif";cell.replaceChildren(badge);
      }
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
}

async function createCOAAccount(event) {
  event.preventDefault();
  if(window.currentUser?.role!=="manajer") return;
  const button=document.getElementById("coaSaveButton"),message=document.getElementById("coaMessage");
  button.disabled=true;
  const {error}=await supabaseClient.from("accounts").insert({
    kode_akun:document.getElementById("coaCode").value.trim(),
    nama_akun:document.getElementById("coaName").value.trim(),
    kategori:document.getElementById("coaCategory").value,
    saldo_normal:document.getElementById("coaNormal").value
  });
  button.disabled=false;
  if(error){message.className="erp-message erp-error";message.textContent=error.message;return;}
  message.className="erp-message erp-success";message.textContent="Akun berhasil ditambahkan.";
  document.getElementById("coaCreateForm").reset();
  await loadCOA();
}

// ==========================================
// PENCATATAN KEUANGAN
// ==========================================
function setupFinancial() {
  const page=document.getElementById("modulePage");
  if(!page||document.getElementById("financialContent")) return;
  const section=document.createElement("section"); section.id="financialContent";section.className="erp-content";
  section.innerHTML=`
    <div class="financial-summary">
      <div class="financial-card"><small>Total Pemasukan</small><strong id="financialIncome">Rp0</strong></div>
      <div class="financial-card"><small>Total Pengeluaran</small><strong id="financialExpense">Rp0</strong></div>
    </div>
    <div class="erp-toolbar"><div><h3 style="margin:0 0 5px">Transaksi Keuangan</h3><div class="erp-muted">Catat pemasukan dan pengeluaran KDMP.</div></div><button class="erp-button" id="financialNewButton">+ Catat Transaksi</button></div>
    <div class="erp-form" id="financialForm"><h3 id="financialFormTitle">Catat Pemasukan</h3>
      <div class="financial-tabs"><button type="button" id="financialIncomeTab" class="active">Pemasukan</button><button type="button" id="financialExpenseTab">Pengeluaran</button></div>
      <div class="financial-note">Transaksi yang disimpan akan otomatis membentuk jurnal debit dan kredit.</div>
      <form id="financialCreateForm"><div class="erp-grid">
        <div class="erp-field"><label>Tanggal Transaksi</label><input type="date" id="financialDate" required></div>
        <div class="erp-field"><label>Nominal (Rp)</label><input type="number" id="financialAmount" min="1" step="0.01" required placeholder="Contoh: 500000"></div>
        <div class="erp-field"><label>Akun Kas / Bank</label><select id="financialCashAccount" required><option value="">Memuat akun...</option></select></div>
        <div class="erp-field"><label id="financialCounterpartLabel">Akun Pendapatan</label><select id="financialCounterpartAccount" required><option value="">Pilih akun</option></select></div>
        <div class="erp-field" style="grid-column:1/-1"><label>Keterangan Transaksi</label><input id="financialDescription" required maxlength="500" placeholder="Contoh: Penjualan barang toko"></div>
      </div><div id="financialMessage" class="erp-message"></div>
      <div class="erp-actions"><button type="submit" class="erp-button" id="financialSaveButton">Simpan Transaksi</button><button type="button" class="erp-button secondary" id="financialCancelButton">Batal</button></div></form>
    </div>
    <h3>Riwayat Transaksi</h3><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Keterangan</th><th>Akun Kas/Bank</th><th>Akun Lawan</th><th>Nominal</th><th>Nomor Jurnal</th></tr></thead><tbody id="financialHistoryBody"><tr><td colspan="7">Memuat transaksi...</td></tr></tbody></table></div>`;
  page.appendChild(section);
  document.getElementById("financialNewButton").addEventListener("click",openFinancialForm);
  document.getElementById("financialIncomeTab").addEventListener("click",()=>setFinancialType("pemasukan"));
  document.getElementById("financialExpenseTab").addEventListener("click",()=>setFinancialType("pengeluaran"));
  document.getElementById("financialCancelButton").addEventListener("click",closeFinancialForm);
  document.getElementById("financialCreateForm").addEventListener("submit",saveFinancialTransaction);
  if(!["manajer","admin_keuangan"].includes(window.currentUser?.role)) document.getElementById("financialNewButton").style.display="none";
}

function setFinancialType(type) {
  financialType=type;
  const incomeTab=document.getElementById("financialIncomeTab"),expenseTab=document.getElementById("financialExpenseTab");
  incomeTab.classList.toggle("active",type==="pemasukan");expenseTab.classList.toggle("active",type==="pengeluaran");
  document.getElementById("financialFormTitle").textContent=type==="pemasukan"?"Catat Pemasukan":"Catat Pengeluaran";
  document.getElementById("financialCounterpartLabel").textContent=type==="pemasukan"?"Akun Pendapatan":"Akun Beban";
  loadFinancialAccountOptions();
}

function loadFinancialAccountOptions() {
  const cashSelect=document.getElementById("financialCashAccount"), counterpartSelect=document.getElementById("financialCounterpartAccount");
  if(!cashSelect||!counterpartSelect)return;
  const cashAccounts=financialAccountsCache.filter(a=>a.aktif&&a.kategori==="aset"&&/(kas|bank)/i.test(a.nama_akun));
  const targetCategory=financialType==="pemasukan"?"pendapatan":"beban";
  const counterpartAccounts=financialAccountsCache.filter(a=>a.aktif&&a.kategori===targetCategory);
  cashSelect.innerHTML='<option value="">Pilih akun kas/bank</option>'+cashAccounts.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.kode_akun)} - ${escapeHTML(a.nama_akun)}</option>`).join("");
  counterpartSelect.innerHTML=`<option value="">Pilih akun ${financialType==="pemasukan"?"pendapatan":"beban"}</option>`+counterpartAccounts.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.kode_akun)} - ${escapeHTML(a.nama_akun)}</option>`).join("");
  if(!cashAccounts.length)cashSelect.innerHTML='<option value="">Akun Kas/Bank belum tersedia</option>';
  if(!counterpartAccounts.length)counterpartSelect.innerHTML='<option value="">Akun belum tersedia</option>';
}

async function openFinancialForm() {
  const button=document.getElementById("financialNewButton");button.disabled=true;
  const {data,error}=await supabaseClient.from("accounts").select("id,kode_akun,nama_akun,kategori,aktif").eq("aktif",true).order("kode_akun");
  button.disabled=false;if(error){alert("Gagal memuat akun: "+error.message);return;}
  financialAccountsCache=data||[];
  document.getElementById("financialCreateForm").reset();document.getElementById("financialDate").value=todayDate();
  document.getElementById("financialMessage").textContent="";setFinancialType("pemasukan");
  document.getElementById("financialForm").style.display="block";
  if(!financialAccountsCache.some(a=>a.aktif&&a.kategori==="aset"&&/(kas|bank)/i.test(a.nama_akun))){
    const msg=document.getElementById("financialMessage");msg.textContent="Belum ada akun dengan nama Kas atau Bank. Periksa Chart of Accounts.";msg.className="erp-message erp-error";
  }
}

function closeFinancialForm(){document.getElementById("financialForm").style.display="none";}

async function saveFinancialTransaction(event) {
  event.preventDefault();
  const button=document.getElementById("financialSaveButton"),message=document.getElementById("financialMessage");
  if(!["manajer","admin_keuangan"].includes(window.currentUser?.role)){message.textContent="Akses tidak diizinkan.";message.className="erp-message erp-error";return;}
  const date=document.getElementById("financialDate").value,amount=Number(document.getElementById("financialAmount").value);
  const cashAccount=document.getElementById("financialCashAccount").value,counterpartAccount=document.getElementById("financialCounterpartAccount").value;
  const description=document.getElementById("financialDescription").value.trim();
  if(!date||!cashAccount||!counterpartAccount||!description||!Number.isFinite(amount)||amount<=0){message.textContent="Lengkapi semua data dengan benar.";message.className="erp-message erp-error";return;}
  if(cashAccount===counterpartAccount){message.textContent="Akun kas dan akun lawan tidak boleh sama.";message.className="erp-message erp-error";return;}
  button.disabled=true;button.textContent="Menyimpan transaksi...";message.textContent="";
  const {error}=await supabaseClient.rpc("catat_transaksi_keuangan",{p_tanggal:date,p_jenis:financialType,p_akun_kas_id:cashAccount,p_akun_lawan_id:counterpartAccount,p_nominal:amount,p_keterangan:description});
  button.disabled=false;button.textContent="Simpan Transaksi";
  if(error){message.textContent="Gagal menyimpan transaksi: "+error.message;message.className="erp-message erp-error";return;}
  document.getElementById("financialCreateForm").reset();closeFinancialForm();await loadFinancialHistory();
  alert("Transaksi berhasil disimpan dan jurnal otomatis sudah dibuat!");
}

async function loadFinancialHistory() {
  const body=document.getElementById("financialHistoryBody");if(!body)return;
  body.innerHTML='<tr><td colspan="7">Memuat transaksi...</td></tr>';
  const {data:transactions,error}=await supabaseClient.from("financial_transactions")
    .select("id,tanggal,jenis,akun_kas_id,akun_lawan_id,nominal,keterangan,journal_id")
    .order("tanggal",{ascending:false}).limit(100);
  if(error){body.innerHTML=`<tr><td colspan="7">${escapeHTML(error.message)}</td></tr>`;return;}
  if(!transactions?.length){
    body.innerHTML='<tr><td colspan="7">Belum ada transaksi keuangan.</td></tr>';
    document.getElementById("financialIncome").textContent=formatRupiah(0);
    document.getElementById("financialExpense").textContent=formatRupiah(0);
    return;
  }
  const [{data:accounts},{data:journals}]=await Promise.all([
    supabaseClient.from("accounts").select("id,kode_akun,nama_akun"),
    supabaseClient.from("journal_entries").select("id,nomor_jurnal")
  ]);
  const accountMap=new Map((accounts||[]).map(a=>[a.id,a])),journalMap=new Map((journals||[]).map(j=>[j.id,j.nomor_jurnal]));
  const income=transactions.filter(x=>x.jenis==="pemasukan").reduce((s,x)=>s+Number(x.nominal),0);
  const expense=transactions.filter(x=>x.jenis==="pengeluaran").reduce((s,x)=>s+Number(x.nominal),0);
  document.getElementById("financialIncome").textContent=formatRupiah(income);
  document.getElementById("financialExpense").textContent=formatRupiah(expense);
  body.replaceChildren();
  transactions.forEach(item=>{
    const cash=accountMap.get(item.akun_kas_id),counter=accountMap.get(item.akun_lawan_id),row=document.createElement("tr");
    const values=[item.tanggal,item.jenis==="pemasukan"?"Pemasukan":"Pengeluaran",item.keterangan,cash?`${cash.kode_akun} - ${cash.nama_akun}`:"-",counter?`${counter.kode_akun} - ${counter.nama_akun}`:"-",formatRupiah(item.nominal),journalMap.get(item.journal_id)||"-"];
    values.forEach(value=>{const cell=document.createElement("td");cell.textContent=value;row.appendChild(cell);});
    body.appendChild(row);
  });
}

// ==========================================
// JURNAL UMUM
// ==========================================
function setupJournal() {
  const page=document.getElementById("modulePage");
  if(!page||document.getElementById("journalContent"))return;
  const section=document.createElement("section");section.id="journalContent";section.className="erp-content";
  section.innerHTML=`
    <div class="erp-toolbar"><div><h3 style="margin:0 0 5px">Jurnal Umum</h3><div class="erp-muted">Catat transaksi dengan sistem debit dan kredit.</div></div><button class="erp-button" id="journalNewButton">+ Buat Jurnal</button></div>
    <div class="erp-form" id="journalForm"><h3>Buat Jurnal Baru</h3><form id="journalCreateForm">
      <div class="erp-grid"><div class="erp-field"><label>Tanggal</label><input type="date" id="journalDate" required></div>
      <div class="erp-field"><label>Keterangan</label><input id="journalDescription" required placeholder="Contoh: Pembelian perlengkapan toko"></div></div>
      <h4 style="margin:22px 0 8px">Rincian Jurnal</h4><div class="erp-muted">Setiap baris hanya boleh diisi debit atau kredit.</div><div id="journalLines"></div>
      <button type="button" class="erp-button secondary" id="journalAddLine" style="margin-top:14px">+ Tambah Baris</button>
      <div class="journal-totals"><div>Total Debit: <span id="journalDebitTotal" class="journal-total">Rp0</span></div><div>Total Kredit: <span id="journalCreditTotal" class="journal-total">Rp0</span></div></div>
      <div id="journalBalance" class="journal-balance"></div><div id="journalMessage" class="erp-message"></div>
      <div class="erp-actions"><button type="submit" class="erp-button" id="journalSaveButton">Simpan dan Posting</button><button type="button" class="erp-button secondary" id="journalCancelButton">Batal</button></div>
    </form></div>
    <h3>Riwayat Jurnal</h3><div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>Nomor Jurnal</th><th>Tanggal</th><th>Keterangan</th><th>Status</th><th>Total Debit</th><th>Total Kredit</th></tr></thead><tbody id="journalHistoryBody"><tr><td colspan="6">Memuat riwayat jurnal...</td></tr></tbody></table></div>`;
  page.appendChild(section);
  document.getElementById("journalNewButton").addEventListener("click",openJournalForm);
  document.getElementById("journalAddLine").addEventListener("click",addJournalLine);
  document.getElementById("journalCancelButton").addEventListener("click",closeJournalForm);
  document.getElementById("journalCreateForm").addEventListener("submit",saveJournal);
  document.getElementById("journalDate").value=todayDate();
  if(!["manajer","admin_keuangan"].includes(window.currentUser?.role))document.getElementById("journalNewButton").style.display="none";
}

async function openJournalForm() {
  const {data,error}=await supabaseClient.from("accounts").select("id,kode_akun,nama_akun,aktif").eq("aktif",true).order("kode_akun");
  if(error){alert("Gagal memuat daftar akun: "+error.message);return;}
  coaCache=data||[];if(coaCache.length<2){alert("Minimal harus tersedia dua akun aktif.");return;}
  document.getElementById("journalForm").style.display="block";document.getElementById("journalCreateForm").reset();
  document.getElementById("journalDate").value=todayDate();document.getElementById("journalLines").replaceChildren();journalRowCount=0;
  addJournalLine();addJournalLine();updateJournalTotals();document.getElementById("journalMessage").textContent="";document.getElementById("journalBalance").textContent="";
}
function closeJournalForm(){document.getElementById("journalForm").style.display="none";}

function addJournalLine() {
  const container=document.getElementById("journalLines"),row=document.createElement("div");row.className="journal-line";row.dataset.row=String(++journalRowCount);
  const options=coaCache.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.kode_akun)} - ${escapeHTML(a.nama_akun)}</option>`).join("");
  row.innerHTML=`<div class="erp-field account-field"><label>Akun</label><select class="line-account" required><option value="">Pilih akun</option>${options}</select></div>
    <div class="erp-field description-field"><label>Keterangan</label><input class="line-description" placeholder="Keterangan baris"></div>
    <div class="erp-field"><label>Debit (Rp)</label><input class="line-debit" type="number" min="0" step="0.01" value="0"></div>
    <div class="erp-field"><label>Kredit (Rp)</label><input class="line-credit" type="number" min="0" step="0.01" value="0"></div><button type="button" class="journal-remove" title="Hapus baris">Hapus</button>`;
  row.querySelector(".line-debit").addEventListener("input",()=>{if(Number(row.querySelector(".line-debit").value)>0)row.querySelector(".line-credit").value="0";updateJournalTotals();});
  row.querySelector(".line-credit").addEventListener("input",()=>{if(Number(row.querySelector(".line-credit").value)>0)row.querySelector(".line-debit").value="0";updateJournalTotals();});
  row.querySelector(".journal-remove").addEventListener("click",()=>{if(container.children.length<=2){alert("Jurnal minimal harus memiliki dua baris.");return;}row.remove();updateJournalTotals();});
  container.appendChild(row);
}

function updateJournalTotals() {
  const rows=[...document.querySelectorAll(".journal-line")];
  const debit=rows.reduce((s,r)=>s+Number(r.querySelector(".line-debit").value||0),0);
  const credit=rows.reduce((s,r)=>s+Number(r.querySelector(".line-credit").value||0),0);
  document.getElementById("journalDebitTotal").textContent=formatRupiah(debit);
  document.getElementById("journalCreditTotal").textContent=formatRupiah(credit);
  const balance=document.getElementById("journalBalance");
  if(debit>0&&Math.abs(debit-credit)<0.005){balance.textContent="✓ Debit dan kredit seimbang.";balance.className="journal-balance erp-success";}
  else{balance.textContent="Belum seimbang. Selisih: "+formatRupiah(Math.abs(debit-credit));balance.className="journal-balance erp-error";}
}

async function saveJournal(event) {
  event.preventDefault();
  const button=document.getElementById("journalSaveButton"),message=document.getElementById("journalMessage");
  if(!["manajer","admin_keuangan"].includes(window.currentUser?.role)){message.textContent="Akses tidak diizinkan.";message.className="erp-message erp-error";return;}
  const rows=[...document.querySelectorAll(".journal-line")];if(rows.length<2){message.textContent="Jurnal minimal memiliki dua baris.";message.className="erp-message erp-error";return;}
  const lines=[];
  for(const row of rows){
    const accountId=row.querySelector(".line-account").value,debit=Number(row.querySelector(".line-debit").value||0),credit=Number(row.querySelector(".line-credit").value||0),description=row.querySelector(".line-description").value.trim();
    if(!accountId||!Number.isFinite(debit)||!Number.isFinite(credit)||debit<0||credit<0||(debit>0&&credit>0)||(debit===0&&credit===0)){
      message.textContent="Periksa akun dan nilai debit/kredit setiap baris.";message.className="erp-message erp-error";return;
    }
    lines.push({account_id:accountId,keterangan:description||null,debit,kredit:credit});
  }
  const totalDebit=lines.reduce((s,l)=>s+l.debit,0),totalCredit=lines.reduce((s,l)=>s+l.kredit,0);
  if(totalDebit<=0||Math.abs(totalDebit-totalCredit)>=0.005){message.textContent="Total debit dan kredit harus sama dan lebih dari nol.";message.className="erp-message erp-error";return;}
  const date=document.getElementById("journalDate").value,description=document.getElementById("journalDescription").value.trim();
  if(!date||!description){message.textContent="Tanggal dan keterangan transaksi wajib diisi.";message.className="erp-message erp-error";return;}
  button.disabled=true;button.textContent="Menyimpan jurnal...";
  const journalNumber="JU-"+date.replaceAll("-","")+"-"+Date.now().toString().slice(-6);
  const {data:header,error:headerError}=await supabaseClient.from("journal_entries").insert({nomor_jurnal:journalNumber,tanggal:date,keterangan:description,status:"draft",created_by:window.currentUser.id}).select("id").single();
  if(headerError){button.disabled=false;button.textContent="Simpan dan Posting";message.textContent="Gagal membuat jurnal: "+headerError.message;message.className="erp-message erp-error";return;}
  const {error:lineError}=await supabaseClient.from("journal_lines").insert(lines.map(line=>({...line,journal_id:header.id})));
  if(lineError){await supabaseClient.from("journal_entries").delete().eq("id",header.id);button.disabled=false;button.textContent="Simpan dan Posting";message.textContent="Gagal menyimpan rincian: "+lineError.message;message.className="erp-message erp-error";return;}
  const {error:postError}=await supabaseClient.from("journal_entries").update({status:"posted"}).eq("id",header.id);
  if(postError){await supabaseClient.from("journal_entries").delete().eq("id",header.id);button.disabled=false;button.textContent="Simpan dan Posting";message.textContent="Jurnal belum berhasil diposting: "+postError.message;message.className="erp-message erp-error";return;}
  button.disabled=false;button.textContent="Simpan dan Posting";document.getElementById("journalCreateForm").reset();document.getElementById("journalLines").replaceChildren();closeJournalForm();await loadJournalHistory();
}

async function loadJournalHistory() {
  const body=document.getElementById("journalHistoryBody");if(!body)return;
  body.innerHTML='<tr><td colspan="6">Memuat riwayat jurnal...</td></tr>';
  const {data:entries,error}=await supabaseClient.from("journal_entries").select("id,nomor_jurnal,tanggal,keterangan,status").order("tanggal",{ascending:false}).limit(50);
  if(error){body.innerHTML=`<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;return;}
  if(!entries?.length){body.innerHTML='<tr><td colspan="6">Belum ada jurnal.</td></tr>';return;}
  const ids=entries.map(e=>e.id);
  const {data:lines,error:lineError}=await supabaseClient.from("journal_lines").select("journal_id,debit,kredit").in("journal_id",ids);
  if(lineError){body.innerHTML=`<tr><td colspan="6">${escapeHTML(lineError.message)}</td></tr>`;return;}
  body.replaceChildren();
  entries.forEach(entry=>{
    const related=(lines||[]).filter(l=>l.journal_id===entry.id),debit=related.reduce((s,l)=>s+Number(l.debit),0),credit=related.reduce((s,l)=>s+Number(l.kredit),0),row=document.createElement("tr");
    [entry.nomor_jurnal,entry.tanggal,entry.keterangan,entry.status,formatRupiah(debit),formatRupiah(credit)].forEach((value,index)=>{
      const cell=document.createElement("td");cell.textContent=value;
      if(index===3&&entry.status==="posted"){const badge=document.createElement("span");badge.className="erp-status";badge.textContent="Posted";cell.replaceChildren(badge);}
      row.appendChild(cell);
    });body.appendChild(row);
  });
}

// ==========================================
// BUKU BESAR
// ==========================================
function setupLedger() {
  const page=document.getElementById("modulePage");
  if(!page||document.getElementById("ledgerContent"))return;
  const section=document.createElement("section");section.id="ledgerContent";section.className="erp-content";
  section.innerHTML=`
    <div class="ledger-filter">
      <div class="erp-field"><label>Pilih Akun</label><select id="ledgerAccount"><option value="">Memuat akun...</option></select></div>
      <div class="erp-field"><label>Dari Tanggal</label><input type="date" id="ledgerStart"></div>
      <div class="erp-field"><label>Sampai Tanggal</label><input type="date" id="ledgerEnd"></div>
      <button class="erp-button" id="ledgerSearchButton">Tampilkan</button>
    </div>
    <div id="ledgerMessage" class="erp-message erp-muted">Pilih akun dan rentang tanggal untuk melihat buku besar.</div>
    <div class="ledger-summary">
      <div class="ledger-card"><small>Saldo Awal</small><strong id="ledgerOpening">Rp0</strong></div>
      <div class="ledger-card"><small>Total Debit</small><strong id="ledgerDebit">Rp0</strong></div>
      <div class="ledger-card"><small>Total Kredit</small><strong id="ledgerCredit">Rp0</strong></div>
      <div class="ledger-card"><small>Saldo Akhir</small><strong id="ledgerClosing">Rp0</strong></div>
    </div>
    <div class="ledger-opening" id="ledgerAccountInfo">Pilih akun untuk melihat rincian mutasinya.</div>
    <div class="erp-table-wrap"><table class="erp-table" style="min-width:850px">
      <thead><tr><th>Tanggal</th><th>Nomor Jurnal</th><th>Keterangan</th><th>Debit</th><th>Kredit</th><th>Saldo Berjalan</th></tr></thead>
      <tbody id="ledgerTableBody"><tr><td colspan="6">Belum ada data yang ditampilkan.</td></tr></tbody>
    </table></div>`;
  page.appendChild(section);
  document.getElementById("ledgerStart").value=firstDayOfMonth();
  document.getElementById("ledgerEnd").value=todayDate();
  document.getElementById("ledgerSearchButton").addEventListener("click",loadLedger);
  loadLedgerAccounts();
}

async function loadLedgerAccounts() {
  const select=document.getElementById("ledgerAccount");if(!select)return;
  select.innerHTML='<option value="">Memuat akun...</option>';
  const {data,error}=await supabaseClient.from("accounts").select("id,kode_akun,nama_akun,kategori,saldo_normal,aktif").order("kode_akun");
  if(error){select.innerHTML='<option value="">Gagal memuat akun</option>';document.getElementById("ledgerMessage").textContent=error.message;return;}
  coaCache=data||[];
  const active=coaCache.filter(a=>a.aktif);
  select.innerHTML='<option value="">Pilih akun...</option>'+active.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.kode_akun)} - ${escapeHTML(a.nama_akun)}</option>`).join("");
  const cash=active.find(a=>a.kode_akun==="1101")||active[0];
  if(cash){select.value=cash.id;await loadLedger();}
}

function signedLedgerAmount(debit,credit,normal) {
  return normal==="kredit" ? credit-debit : debit-credit;
}
function displayLedgerBalance(amount,normal) {
  const abnormal=amount<0;
  return (abnormal?"(Saldo abnormal) ":"")+formatRupiah(Math.abs(amount));
}

async function loadLedger() {
  const select=document.getElementById("ledgerAccount"),body=document.getElementById("ledgerTableBody");
  if(!select||!body)return;
  const account=coaCache.find(a=>a.id===select.value);
  const start=document.getElementById("ledgerStart").value,end=document.getElementById("ledgerEnd").value;
  const message=document.getElementById("ledgerMessage"),button=document.getElementById("ledgerSearchButton");
  if(!account){message.textContent="Pilih akun terlebih dahulu.";message.className="erp-message erp-error";return;}
  if(!start||!end||start>end){message.textContent="Periksa rentang tanggal. Tanggal awal tidak boleh melewati tanggal akhir.";message.className="erp-message erp-error";return;}
  button.disabled=true;button.textContent="Memuat...";
  message.textContent="Mengambil mutasi jurnal yang sudah diposting...";message.className="erp-message erp-muted";
  body.innerHTML='<tr><td colspan="6">Memuat mutasi...</td></tr>';
  try {
    const allLines=[];let from=0;const pageSize=500;
    while(true) {
      const {data,error}=await supabaseClient.from("journal_lines")
        .select("account_id,journal_id,debit,kredit,journal_entries!inner(tanggal,nomor_jurnal,keterangan,status)")
        .eq("account_id",account.id).eq("journal_entries.status","posted")
        .lte("journal_entries.tanggal",end).range(from,from+pageSize-1);
      if(error)throw error;
      allLines.push(...(data||[]));
      if(!data||data.length<pageSize)break;
      from+=pageSize;
    }
    const movements=allLines.map(line=>{
      const j=line.journal_entries;
      return {date:j.tanggal,number:j.nomor_jurnal,description:j.keterangan,debit:Number(line.debit),credit:Number(line.kredit)};
    }).sort((a,b)=>a.date.localeCompare(b.date)||a.number.localeCompare(b.number));
    const openingLines=movements.filter(m=>m.date<start);
    const periodLines=movements.filter(m=>m.date>=start&&m.date<=end);
    const openingNet=openingLines.reduce((s,m)=>s+signedLedgerAmount(m.debit,m.credit,account.saldo_normal),0);
    const totalDebit=periodLines.reduce((s,m)=>s+m.debit,0);
    const totalCredit=periodLines.reduce((s,m)=>s+m.credit,0);
    let running=openingNet;
    document.getElementById("ledgerOpening").textContent=displayLedgerBalance(openingNet,account.saldo_normal);
    document.getElementById("ledgerDebit").textContent=formatRupiah(totalDebit);
    document.getElementById("ledgerCredit").textContent=formatRupiah(totalCredit);
    document.getElementById("ledgerAccountInfo").textContent=`${account.kode_akun} - ${account.nama_akun} | ${capitalize(account.kategori)} | Saldo normal ${capitalize(account.saldo_normal)} | Periode ${start} s.d. ${end}`;
    body.replaceChildren();
    if(!periodLines.length) body.innerHTML='<tr><td colspan="6">Tidak ada mutasi pada periode ini.</td></tr>';
    else periodLines.forEach(m=>{
      running+=signedLedgerAmount(m.debit,m.credit,account.saldo_normal);
      const row=document.createElement("tr");
      [m.date,m.number,m.description,formatRupiah(m.debit),formatRupiah(m.credit),displayLedgerBalance(running,account.saldo_normal)].forEach(value=>{
        const cell=document.createElement("td");cell.textContent=value;row.appendChild(cell);
      });
      body.appendChild(row);
    });
    document.getElementById("ledgerClosing").textContent=displayLedgerBalance(running,account.saldo_normal);
    message.textContent=`Buku Besar berhasil dimuat. ${periodLines.length} mutasi ditemukan.`;
    message.className="erp-message erp-success";
  } catch(error) {
    body.innerHTML=`<tr><td colspan="6">${escapeHTML(error.message||"Gagal memuat Buku Besar.")}</td></tr>`;
    message.textContent="Gagal memuat Buku Besar: "+(error.message||"Kesalahan tidak diketahui");
    message.className="erp-message erp-error";
  } finally {
    button.disabled=false;button.textContent="Tampilkan";
  }
}

// ==========================================
// LAPORAN LABA RUGI
// ==========================================

function setupReports() {
  const page=document.getElementById("modulePage");
  if(!page||document.getElementById("reportContent"))return;

  const section=document.createElement("section");
  section.id="reportContent";
  section.className="erp-content";

  section.innerHTML=`
    <div class="report-filter">
      <div class="erp-field">
        <label>Dari Tanggal</label>
        <input type="date" id="reportStart">
      </div>
      <div class="erp-field">
        <label>Sampai Tanggal</label>
        <input type="date" id="reportEnd">
      </div>
      <button class="erp-button" id="reportSearchButton">Tampilkan Laporan</button>
    </div>

    <div id="reportMessage" class="erp-message erp-muted">
      Pilih periode untuk melihat laporan laba rugi.
    </div>

    <div class="report-summary">
      <div class="report-card">
        <small>Total Pendapatan</small>
        <strong id="reportIncome">Rp0</strong>
      </div>
      <div class="report-card">
        <small>Total Beban</small>
        <strong id="reportExpense">Rp0</strong>
      </div>
      <div class="report-card profit" id="reportProfitCard">
        <small id="reportProfitLabel">Surplus / Defisit</small>
        <strong id="reportProfit">Rp0</strong>
      </div>
    </div>

    <h3 class="report-section-title">Rincian Pendapatan</h3>
    <div class="erp-table-wrap">
      <table class="erp-table">
        <thead>
          <tr><th>Kode Akun</th><th>Nama Akun</th><th>Jumlah Pendapatan</th></tr>
        </thead>
        <tbody id="reportIncomeBody">
          <tr><td colspan="3">Belum ada data.</td></tr>
        </tbody>
        <tfoot id="reportIncomeFoot"></tfoot>
      </table>
    </div>

    <h3 class="report-section-title">Rincian Beban</h3>
    <div class="erp-table-wrap">
      <table class="erp-table">
        <thead>
          <tr><th>Kode Akun</th><th>Nama Akun</th><th>Jumlah Beban</th></tr>
        </thead>
        <tbody id="reportExpenseBody">
          <tr><td colspan="3">Belum ada data.</td></tr>
        </tbody>
        <tfoot id="reportExpenseFoot"></tfoot>
      </table>
    </div>

    <div class="financial-note" style="margin-top:18px">
      Laporan ini dihitung dari jurnal yang berstatus Posted. Nilai surplus atau defisit merupakan hasil periode sebelum pembagian SHU dan alokasi sesuai ketentuan koperasi.
    </div>
  `;

  page.appendChild(section);

  document.getElementById("reportStart").value=firstDayOfMonth();
  document.getElementById("reportEnd").value=todayDate();

  document.getElementById("reportSearchButton").addEventListener("click",loadIncomeStatement);
}

async function loadIncomeStatement() {
  const start=document.getElementById("reportStart")?.value;
  const end=document.getElementById("reportEnd")?.value;
  const button=document.getElementById("reportSearchButton");
  const message=document.getElementById("reportMessage");
  const incomeBody=document.getElementById("reportIncomeBody");
  const expenseBody=document.getElementById("reportExpenseBody");

  if(!start||!end||start>end) {
    message.textContent="Periksa tanggal laporan. Tanggal awal tidak boleh melewati tanggal akhir.";
    message.className="erp-message erp-error";
    return;
  }

  button.disabled=true;
  button.textContent="Memuat...";
  message.textContent="Mengambil data jurnal yang sudah diposting...";
  message.className="erp-message erp-muted";

  incomeBody.innerHTML='<tr><td colspan="3">Memuat data...</td></tr>';
  expenseBody.innerHTML='<tr><td colspan="3">Memuat data...</td></tr>';

  try {
    const {data:accounts,error:accountError}=await supabaseClient
      .from("accounts")
      .select("id,kode_akun,nama_akun,kategori,saldo_normal,aktif")
      .in("kategori",["pendapatan","beban"])
      .eq("aktif",true)
      .order("kode_akun");

    if(accountError)throw accountError;

    const allLines=[];
    let from=0;
    const pageSize=500;

    while(true) {
      const {data,error}=await supabaseClient
        .from("journal_lines")
        .select("account_id,debit,kredit,journal_entries!inner(tanggal,status)")
        .eq("journal_entries.status","posted")
        .gte("journal_entries.tanggal",start)
        .lte("journal_entries.tanggal",end)
        .range(from,from+pageSize-1);

      if(error)throw error;

      allLines.push(...(data||[]));

      if(!data||data.length<pageSize)break;
      from+=pageSize;
    }

    const totals=new Map();

    (accounts||[]).forEach(account=>{
      totals.set(account.id,0);
    });

    allLines.forEach(line=>{
      if(!totals.has(line.account_id))return;

      const account=(accounts||[]).find(a=>a.id===line.account_id);
      if(!account)return;

      let amount=0;

      if(account.kategori==="pendapatan") {
        amount=Number(line.kredit||0)-Number(line.debit||0);
      } else if(account.kategori==="beban") {
        amount=Number(line.debit||0)-Number(line.kredit||0);
      }

      totals.set(account.id,totals.get(account.id)+amount);
    });

    const incomeAccounts=(accounts||[])
      .filter(a=>a.kategori==="pendapatan")
      .map(a=>({...a,total:totals.get(a.id)||0}));

    const expenseAccounts=(accounts||[])
      .filter(a=>a.kategori==="beban")
      .map(a=>({...a,total:totals.get(a.id)||0}));

    const totalIncome=incomeAccounts.reduce((sum,a)=>sum+a.total,0);
    const totalExpense=expenseAccounts.reduce((sum,a)=>sum+a.total,0);
    const profit=totalIncome-totalExpense;

    document.getElementById("reportIncome").textContent=formatRupiah(totalIncome);
    document.getElementById("reportExpense").textContent=formatRupiah(totalExpense);
    document.getElementById("reportProfit").textContent=formatRupiah(Math.abs(profit));

    const profitCard=document.getElementById("reportProfitCard");
    const profitLabel=document.getElementById("reportProfitLabel");

    if(profit>=0) {
      profitCard.className="report-card profit";
      profitLabel.textContent="Surplus Periode";
    } else {
      profitCard.className="report-card loss";
      profitLabel.textContent="Defisit Periode";
    }

    incomeBody.replaceChildren();
    const incomeRows=incomeAccounts.filter(a=>a.total!==0);

    if(!incomeRows.length) {
      incomeBody.innerHTML='<tr><td colspan="3" class="report-empty">Belum ada pendapatan pada periode ini.</td></tr>';
    } else {
      incomeRows.forEach(account=>{
        const row=document.createElement("tr");
        [account.kode_akun,account.nama_akun,formatRupiah(account.total)].forEach(value=>{
          const cell=document.createElement("td");
          cell.textContent=value;
          row.appendChild(cell);
        });
        incomeBody.appendChild(row);
      });
    }

    document.getElementById("reportIncomeFoot").innerHTML=`
      <tr class="report-total-row">
        <td colspan="2">TOTAL PENDAPATAN</td>
        <td>${formatRupiah(totalIncome)}</td>
      </tr>`;

    expenseBody.replaceChildren();
    const expenseRows=expenseAccounts.filter(a=>a.total!==0);

    if(!expenseRows.length) {
      expenseBody.innerHTML='<tr><td colspan="3" class="report-empty">Belum ada beban pada periode ini.</td></tr>';
    } else {
      expenseRows.forEach(account=>{
        const row=document.createElement("tr");
        [account.kode_akun,account.nama_akun,formatRupiah(account.total)].forEach(value=>{
          const cell=document.createElement("td");
          cell.textContent=value;
          row.appendChild(cell);
        });
        expenseBody.appendChild(row);
      });
    }

    document.getElementById("reportExpenseFoot").innerHTML=`
      <tr class="report-total-row">
        <td colspan="2">TOTAL BEBAN</td>
        <td>${formatRupiah(totalExpense)}</td>
      </tr>`;

    message.textContent=`Laporan berhasil dimuat untuk periode ${start} sampai ${end}.`;
    message.className="erp-message erp-success";

  } catch(error) {
    console.error("Laporan laba rugi error:",error);
    incomeBody.innerHTML='<tr><td colspan="3">Gagal mengambil data laporan.</td></tr>';
    expenseBody.innerHTML='<tr><td colspan="3">Gagal mengambil data laporan.</td></tr>';
    message.textContent="Gagal memuat laporan: "+(error.message||"Kesalahan tidak diketahui");
    message.className="erp-message erp-error";
  } finally {
    button.disabled=false;
    button.textContent="Tampilkan Laporan";
  }
}

// ==========================================
// NAVIGASI
// ==========================================
function showPage(page,button) {
  document.querySelectorAll(".page").forEach(element=>element.style.display="none");
  const dashboard=document.getElementById("dashboard"),modulePage=document.getElementById("modulePage");

  if(page==="dashboard") {
    dashboard.style.display="block";
    document.getElementById("pageTitle").textContent="Dashboard";
    loadDashboard();
  } else if(modules[page]) {
    modulePage.style.display="block";
    const data=modules[page];
    document.getElementById("moduleIcon").textContent=data[0];
    document.getElementById("moduleName").textContent=data[1];
    document.getElementById("moduleDescription").textContent=data[2];
    document.getElementById("pageTitle").textContent=data[1];

    const visibility={
      keuangan:"financialContent",
      coa:"coaContent",
      jurnal:"journalContent",
      "buku-besar":"ledgerContent",
      laporan:"reportContent"
    };

    Object.entries(visibility).forEach(([key,id])=>{
      const element=document.getElementById(id);
      if(element)element.style.display=page===key?"block":"none";
    });

    if(page==="keuangan"){setupFinancial();loadFinancialHistory();}
    if(page==="coa")loadCOA();
    if(page==="jurnal"){setupJournal();loadJournalHistory();}
    if(page==="buku-besar"){setupLedger();if(document.getElementById("ledgerAccount")?.value)loadLedger();}
    if(page==="laporan"){setupReports();loadIncomeStatement();}
  }

  document.querySelectorAll(".menu button").forEach(element=>element.classList.remove("active"));
  if(button)button.classList.add("active");
  else document.querySelectorAll(".menu button").forEach(element=>{
    if(element.getAttribute("onclick")?.includes("'"+page+"'"))element.classList.add("active");
  });

  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo(0,0);
}

function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open");}
window.showPage=showPage;
window.toggleSidebar=toggleSidebar;
// =====================================
// MODUL REKONSILIASI BANK KDMP
// =====================================

async function setupBankReconciliation() {
  const client = window.kdmpSupabase;
  const modulePage = document.getElementById("modulePage");

  let content = document.getElementById("bankContent");

  if (!content) {
    content = document.createElement("div");
    content.id = "bankContent";
    content.className = "page";
    modulePage.appendChild(content);
  }

  content.style.display = "block";

  content.innerHTML = `
    <div class="erp-card">
      <h2>🏦 Rekonsiliasi Bank</h2>
      <p>Cocokkan saldo rekening bank dengan catatan jurnal KDMP.</p>

      <div class="form-grid">
        <div>
          <label>Akun Kas / Bank</label>
          <select id="bankAccount" class="erp-input">
            <option value="">Memuat akun...</option>
          </select>
        </div>

        <div>
          <label>Tanggal Awal</label>
          <input type="date" id="bankStart" class="erp-input">
        </div>

        <div>
          <label>Tanggal Akhir</label>
          <input type="date" id="bankEnd" class="erp-input">
        </div>

        <div>
          <label>Saldo Akhir Menurut Rekening Bank</label>
          <input type="number" id="bankStatementBalance"
            class="erp-input" placeholder="Contoh: 5000000">
        </div>
      </div>

      <button class="btn-primary" onclick="calculateBankReconciliation()">
        Hitung Rekonsiliasi
      </button>
    </div>

    <div id="bankResult"></div>

    <div class="erp-card">
      <h3>Tambah Mutasi Rekening</h3>

      <div class="form-grid">
        <div>
          <label>Tanggal</label>
          <input type="date" id="bankMutationDate" class="erp-input">
        </div>

        <div>
          <label>Jenis Mutasi</label>
          <select id="bankMutationType" class="erp-input">
            <option value="deposit">Setoran / Uang Masuk</option>
            <option value="withdrawal">Penarikan / Uang Keluar</option>
          </select>
        </div>

        <div>
          <label>Keterangan</label>
          <input id="bankMutationDescription" class="erp-input"
            placeholder="Contoh: Setoran tunai">
        </div>

        <div>
          <label>Nominal</label>
          <input type="number" id="bankMutationAmount"
            class="erp-input" placeholder="Masukkan nominal">
        </div>
      </div>

      <button class="btn-primary" onclick="saveBankMutation()">
        Simpan Mutasi
      </button>
    </div>

    <div class="erp-card">
      <h3>Riwayat Rekonsiliasi</h3>
      <div id="bankHistory">Memuat data...</div>
    </div>

    <div class="erp-card">
      <h3>Mutasi Rekening Periode Ini</h3>
      <div id="bankMutations">Pilih akun dan periode terlebih dahulu.</div>
    </div>
  `;

  document.getElementById("bankStart").value =
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10);

  document.getElementById("bankEnd").value =
    new Date().toISOString().slice(0, 10);

  document.getElementById("bankMutationDate").value =
    new Date().toISOString().slice(0, 10);

  const { data, error } = await client
    .from("accounts")
    .select("*")
    .order("kode_akun");

  if (error) {
    document.getElementById("bankAccount").innerHTML =
      `<option value="">Gagal memuat akun</option>`;
    console.error(error);
    return;
  }

  const accounts = (data || []).filter(account =>
    /kas|bank/i.test(
      String(account.nama_akun || account.name || "")
    )
  );

  document.getElementById("bankAccount").innerHTML =
    `<option value="">Pilih akun kas/bank</option>` +
    accounts.map(account => `
      <option value="${account.id}">
        ${escapeHTML(account.kode_akun || "")}
        - ${escapeHTML(account.nama_akun || account.name || "")}
      </option>
    `).join("");

  await loadBankReconciliations();
}

async function calculateBankReconciliation() {
  const client = window.kdmpSupabase;
  const accountId = document.getElementById("bankAccount").value;
  const start = document.getElementById("bankStart").value;
  const end = document.getElementById("bankEnd").value;
  const statementBalance = Number(
    document.getElementById("bankStatementBalance").value
  );

  const result = document.getElementById("bankResult");

  if (!accountId || !start || !end) {
    alert("Pilih akun dan periode rekonsiliasi terlebih dahulu.");
    return;
  }

  if (start > end) {
    alert("Tanggal awal tidak boleh melewati tanggal akhir.");
    return;
  }

  if (!Number.isFinite(statementBalance)) {
    alert("Masukkan saldo akhir rekening bank.");
    return;
  }

  result.innerHTML = "Menghitung saldo...";

  const { data, error } = await client
    .from("journal_lines")
    .select(`
      debit,
      kredit,
      journal_entries!inner (
        tanggal,
        nomor_jurnal,
        keterangan,
        status
      )
    `)
    .eq("account_id", accountId)
    .lte("journal_entries.tanggal", end);

  if (error) {
    result.innerHTML =
      `<p class="error">Gagal mengambil jurnal: ${escapeHTML(error.message)}</p>`;
    return;
  }

  const postedLines = (data || []).filter(line =>
    String(line.journal_entries?.status || "").toLowerCase() === "posted"
  );

  const bookBalance = postedLines.reduce((total, line) =>
    total + Number(line.debit || 0) - Number(line.kredit || 0), 0
  );

  const difference = statementBalance - bookBalance;

  const periodLines = postedLines.filter(line =>
    line.journal_entries.tanggal >= start &&
    line.journal_entries.tanggal <= end
  );

  const rupiah = value => formatRupiah(value);

  result.innerHTML = `
    <div class="erp-card">
      <h3>Hasil Rekonsiliasi</h3>

      <div class="financial-summary">
        <div class="summary-card">
          <span>Saldo Menurut Buku</span>
          <h3>${rupiah(bookBalance)}</h3>
        </div>

        <div class="summary-card">
          <span>Saldo Menurut Bank</span>
          <h3>${rupiah(statementBalance)}</h3>
        </div>

        <div class="summary-card">
          <span>Selisih</span>
          <h3>${rupiah(difference)}</h3>
        </div>
      </div>

      <p>
        ${Math.abs(difference) < 0.005
          ? "✅ Saldo buku dan rekening bank sudah seimbang."
          : "⚠️ Masih terdapat selisih antara saldo buku dan saldo bank."}
      </p>

      <h3>Jurnal Periode Ini</h3>

      <div class="table-responsive">
        <table class="erp-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>No. Jurnal</th>
              <th>Keterangan</th>
              <th>Debit</th>
              <th>Kredit</th>
            </tr>
          </thead>
          <tbody>
            ${periodLines.map(line => `
              <tr>
                <td>${escapeHTML(line.journal_entries.tanggal || "")}</td>
                <td>${escapeHTML(line.journal_entries.nomor_jurnal || "")}</td>
                <td>${escapeHTML(line.journal_entries.keterangan || "")}</td>
                <td>${rupiah(line.debit)}</td>
                <td>${rupiah(line.kredit)}</td>
              </tr>
            `).join("") || `
              <tr><td colspan="5">Belum ada jurnal pada periode ini.</td></tr>
            `}
          </tbody>
        </table>
      </div>

      <button class="btn-primary" onclick="saveBankReconciliation(
        ${JSON.stringify(accountId)},
        ${JSON.stringify(start)},
        ${JSON.stringify(end)},
        ${statementBalance},
        ${bookBalance},
        ${difference}
      )">
        Simpan Rekonsiliasi
      </button>
    </div>
  `;
}

async function saveBankMutation() {
  const client = window.kdmpSupabase;
  const accountId = document.getElementById("bankAccount").value;
  const date = document.getElementById("bankMutationDate").value;
  const type = document.getElementById("bankMutationType").value;
  const description = document.getElementById("bankMutationDescription").value;
  const amount = Number(document.getElementById("bankMutationAmount").value);

  if (!accountId || !date || !amount || amount <= 0) {
    alert("Lengkapi akun, tanggal, dan nominal mutasi.");
    return;
  }

  const { data: header, error: headerError } = await client
    .from("bank_reconciliations")
    .select("id")
    .eq("account_id", accountId)
    .eq("period_start", document.getElementById("bankStart").value)
    .eq("period_end", document.getElementById("bankEnd").value)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (headerError || !header) {
    alert("Buat dan simpan rekonsiliasi periode ini terlebih dahulu.");
    return;
  }

  const { error } = await client
    .from("bank_reconciliation_items")
    .insert({
      reconciliation_id: header.id,
      item_type: type,
      transaction_date: date,
      description,
      amount,
      matched: false
    });

  if (error) {
    alert("Gagal menyimpan mutasi: " + error.message);
    return;
  }

  alert("Mutasi rekening berhasil disimpan.");
  document.getElementById("bankMutationDescription").value = "";
  document.getElementById("bankMutationAmount").value = "";
  await loadBankMutations(header.id);
}

async function saveBankReconciliation(
  accountId, start, end, statementBalance, bookBalance, difference
) {
  const client = window.kdmpSupabase;

  const { data: userData } = await client.auth.getUser();

  const { data, error } = await client
    .from("bank_reconciliations")
    .insert({
      account_id: accountId,
      period_start: start,
      period_end: end,
      statement_ending_balance: statementBalance,
      book_balance: bookBalance,
      difference,
      status: Math.abs(difference) < 0.005 ? "balanced" : "draft",
      created_by: userData.user?.id
    })
    .select("id")
    .single();

  if (error) {
    alert("Gagal menyimpan rekonsiliasi: " + error.message);
    return;
  }

  alert("Rekonsiliasi berhasil disimpan.");
  await loadBankReconciliations();
  await loadBankMutations(data.id);
}

async function loadBankReconciliations() {
  const client = window.kdmpSupabase;
  const target = document.getElementById("bankHistory");
  if (!target) return;

  const { data, error } = await client
    .from("bank_reconciliations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    target.innerHTML = "Gagal memuat riwayat: " + escapeHTML(error.message);
    return;
  }

  target.innerHTML = `
    <div class="table-responsive">
      <table class="erp-table">
        <thead>
          <tr>
            <th>Periode</th>
            <th>Saldo Bank</th>
            <th>Saldo Buku</th>
            <th>Selisih</th>
            <th>Status</th>
            <th>Mutasi</th>
          </tr>
        </thead>
        <tbody>
          ${(data || []).map(item => `
            <tr>
              <td>${escapeHTML(item.period_start)} s/d ${escapeHTML(item.period_end)}</td>
              <td>${formatRupiah(item.statement_ending_balance)}</td>
              <td>${formatRupiah(item.book_balance)}</td>
              <td>${formatRupiah(item.difference)}</td>
              <td>${item.status === "balanced" ? "Seimbang" : "Belum seimbang"}</td>
              <td>
                <button class="btn-secondary"
                  onclick="loadBankMutations('${item.id}')">
                  Lihat
                </button>
              </td>
            </tr>
          `).join("") || `
            <tr><td colspan="6">Belum ada riwayat rekonsiliasi.</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

async function loadBankMutations(reconciliationId) {
  const client = window.kdmpSupabase;
  const target = document.getElementById("bankMutations");
  if (!target) return;

  const { data, error } = await client
    .from("bank_reconciliation_items")
    .select("*")
    .eq("reconciliation_id", reconciliationId)
    .order("transaction_date", { ascending: false });

  if (error) {
    target.innerHTML = "Gagal memuat mutasi: " + escapeHTML(error.message);
    return;
  }

  target.innerHTML = `
    <div class="table-responsive">
      <table class="erp-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Keterangan</th>
            <th>Nominal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(data || []).map(item => `
            <tr>
              <td>${escapeHTML(item.transaction_date)}</td>
              <td>${item.item_type === "deposit" ? "Setoran" : "Penarikan"}</td>
              <td>${escapeHTML(item.description || "-")}</td>
              <td>${formatRupiah(item.amount)}</td>
              <td>${item.matched ? "Cocok" : "Belum dicocokkan"}</td>
            </tr>
          `).join("") || `
            <tr><td colspan="5">Belum ada mutasi rekening.</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

const originalBankShowPage = window.showPage;

window.showPage = function(page, button) {
  const bankContent = document.getElementById("bankContent");

  if (bankContent) {
    bankContent.style.display = page === "bank" ? "block" : "none";
  }

  originalBankShowPage(page, button);

  if (page === "bank") {
    setupBankReconciliation();
  }
};

// ==========================================
// PERIKSA SESSION
// ==========================================
async function checkLoginSession() {
  const {data,error}=await supabaseClient.auth.getSession();
  if(error){loginError.textContent="Tidak dapat memeriksa sesi login.";return;}
  if(data.session)await loadUserProfile(data.session.user);
}
checkLoginSession();

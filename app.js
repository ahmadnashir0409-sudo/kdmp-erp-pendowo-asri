
// ==========================================
// KDMP ERP PENDOWO ASRI
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = "https://srfhamdyewblyuangxzz.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_GBr3oKysuufZHQ4Ol-1J0Q_QJWabH1q";

// Membuat koneksi Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// MODULES
// ==========================================

const modules = {
  keuangan: [
    "💰",
    "Pencatatan Keuangan",
    "Pencatatan pemasukan, pengeluaran, dan transaksi kas."
  ],
  coa: [
    "📚",
    "Chart of Accounts",
    "Pengelolaan daftar akun dan kode perkiraan."
  ],
  jurnal: [
    "📖",
    "Jurnal Umum",
    "Pencatatan jurnal debit dan kredit."
  ],
  "buku-besar": [
    "📒",
    "Buku Besar",
    "Riwayat mutasi dan saldo setiap akun."
  ],
  laporan: [
    "📊",
    "Laporan Keuangan",
    "Neraca, laba rugi, dan laporan arus kas."
  ],
  "utang-piutang": [
    "💳",
    "Utang & Piutang",
    "Pengelolaan kewajiban dan tagihan koperasi."
  ],
  bank: [
    "🏦",
    "Rekonsiliasi Bank",
    "Pencocokan catatan kas dengan rekening bank."
  ],
  invoice: [
    "🧾",
    "Invoice",
    "Pembuatan dan pengelolaan faktur."
  ],
  toko: [
    "🛒",
    "Transaksi Toko",
    "Pencatatan penjualan dan transaksi toko."
  ],
  simpanan: [
    "👥",
    "Simpanan & Pinjaman",
    "Pengelolaan simpanan anggota dan pinjaman."
  ],
  persediaan: [
    "📦",
    "Persediaan Barang",
    "Pengelolaan stok masuk dan stok keluar."
  ],
  bulanan: [
    "📅",
    "Laporan Bulanan",
    "Rekapitulasi keuangan setiap bulan."
  ],
  monitoring: [
    "🛡️",
    "Monitoring Manajer",
    "Pemantauan aktivitas dan kondisi keuangan."
  ],
  pengaturan: [
    "⚙️",
    "Pengaturan",
    "Pengaturan sistem dan pengguna."
  ]
};

// ==========================================
// NAVIGATION
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

// ==========================================
// MOBILE SIDEBAR
// ==========================================

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// ==========================================
// SUPABASE STATUS
// ==========================================

console.log("KDMP ERP: Supabase client berhasil dibuat.");

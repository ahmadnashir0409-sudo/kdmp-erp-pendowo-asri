# Audit dan Stabilisasi DAGBOEK / KDMP ERP
Tanggal: 21 November 2026
Repository: `ahmadnashir0409-sudo/kdmp-erp-pendowo-asri`
Project Supabase: `srfhamdyewblyuangxzz`

## Status pengerjaan
Enam migration telah diterapkan ke database produksi setelah diuji dalam transaksi sementara yang diakhiri `ROLLBACK`. Perubahan kode utama telah digabungkan ke `main`.

### Perubahan yang sudah masuk
- Penjualan toko menggunakan RPC atomik untuk menyimpan header, detail, mutasi stok, dan jurnal dalam satu transaksi database.
- Pembatalan transaksi menggunakan RPC yang membuat mutasi pengembalian dan jurnal pembalik.
- `current_stock` dilindungi dari UPDATE langsung oleh pengguna aplikasi; nilai stok berubah melalui trigger mutasi.
- Trigger menyimpan `stock_before` dan `stock_after` dari nilai yang dikunci di database, bukan nilai yang dikirim klien.
- Fungsi internal `SECURITY DEFINER` dipindahkan ke schema `private`; endpoint API yang diperlukan aplikasi menggunakan wrapper `SECURITY INVOKER`.
- Role-based RLS diterapkan untuk modul utama: manajer, admin keuangan, kasir, admin gudang, dan pengurus.
- Menu dan form utama diberi pemeriksaan role di frontend.
- Identitas produk diselaraskan menjadi DAGBOEK by Nusa Pixel dengan sidebar charcoal, aksen heritage gold, tipografi Inter/Playfair Display, dan perbaikan dasar dark mode.
- Enam migration mencakup integritas/RPC, RLS role, private RPC wrappers, RLS/performance cleanup, DABU memory, dan penyelarasan role membership.

## Hasil verifikasi
- `app.js` dan `utang-piutang.js` lulus pemeriksaan sintaks JavaScript.
- Penjualan dan pembatalan diuji melalui wrapper publik. Header, detail, dua mutasi, jurnal pembalik, dan status pembatalan berhasil; stok kembali ke nilai awal.
- Simulasi role Kasir berhasil membuat penjualan dan membaca header/detail/mutasi sesuai policy.
- Simulasi role Admin Gudang membuktikan snapshot mutasi ditentukan database dan UPDATE langsung `current_stock` ditolak.
- Semua pengujian database diakhiri `ROLLBACK`; tidak ada data uji tertinggal.
- Semua 19 jurnal posted yang ada saat audit seimbang.
- Tidak ada fungsi `SECURITY DEFINER` yang tersisa di schema `public`; jumlah fungsi tersebut di schema publik adalah nol.
- Hak UPDATE kolom `inventory_products.current_stock` untuk role authenticated sudah dicabut.
- Performance Advisor tidak lagi melaporkan foreign key tanpa indeks, policy SELECT ganda, indeks duplikat, atau auth init-plan. Yang tersisa hanya info indeks belum terpakai; indeks tersebut tidak dihapus otomatis.

## Temuan yang masih perlu dibereskan

1. **Riwayat mutasi lama memiliki celah.** Aqua botol memiliki satu transisi stok yang tidak tercatat; Beras 10 KG memiliki dua transisi yang tidak tercatat. `current_stock` saat ini sama dengan snapshot mutasi terakhir. Tidak ada riwayat lama yang diubah.
2. **Jurnal historis belum lengkap.** Empat transaksi penjualan dan dua invoice lama tidak memiliki jurnal terkait yang terdeteksi. Perlu rekonsiliasi dan jurnal koreksi baru, bukan mengedit riwayat.
3. **Simpanan dan pinjaman belum terintegrasi penuh dengan akuntansi.** Transaksi simpanan dan pembayaran angsuran yang ada belum memiliki jurnal terkait. Sebelum membuat jurnal otomatis, perlu menetapkan pemetaan akun simpanan dan pembagian angsuran pokok/jasa.
4. **Invoice belum atomik sepenuhnya.** Header, detail, dan jurnal masih diproses melalui beberapa langkah. Dampak invoice penjualan/pembelian terhadap kuantitas persediaan juga perlu ditetapkan agar tidak terjadi pengurangan stok ganda dengan POS.
5. **Alur undangan staf sudah diperbaiki.** Edge Function `invite-user` versi 4 aktif dengan JWT verification, role yang sesuai constraint, pembuatan profil dan membership, serta tautan recovery untuk membuat password pribadi. Password awal tidak lagi dikirim melalui email. Form login sekarang memiliki alur reset dan pembuatan password baru. Alur ini masih perlu diuji dengan alamat email staf nyata.
6. **Multi-koperasi belum lengkap.** Tabel koperasi dan membership tersedia, tetapi tabel transaksi inti belum memiliki `cooperative_id`. Instalasi ini masih beroperasi sebagai satu koperasi.
7. **Pengaturan profil koperasi masih lokal.** Nama, email, alamat, telepon, dan logo masih disimpan di localStorage, belum disinkronkan ke Supabase.
8. **Dashboard belum mencakup seluruh sumber transaksi.** KPI pemasukan/pengeluaran dan grafik utama masih mengandalkan `financial_transactions`; POS, simpanan, dan pinjaman belum disatukan ke ringkasan.
9. **DABU tahap pertama sudah dipasang.** UI assistant, Edge Function read-only dengan JWT verification, riwayat percakapan per pengguna, dan tabel penyimpanan ringkasan memori sudah tersedia. Riwayat chat persisten; peringkas memori otomatis belum dibuat. Fungsi AI membutuhkan secret `OPENAI_API_KEY`; keberadaan secret ini belum dapat diperiksa atau diatur melalui tool project yang tersedia.
10. **Tutup buku dan regression test lintas modul belum tersedia.**
11. **Dua pengaturan Auth perlu diselesaikan di Supabase Dashboard.** OTP email masih berlaku lebih dari satu jam dan leaked-password protection belum aktif. Tool project yang tersedia tidak menyediakan pengubahan kedua setting tersebut.
12. **Constraint role membership sudah diselaraskan.** Nilai role di `cooperative_memberships` sekarang sama dengan `profiles`: `manajer`, `admin_keuangan`, `kasir`, `admin_gudang`, `pengurus`.

## Status Supabase Advisor
- **Security:** hanya dua peringatan konfigurasi Auth (OTP expiry dan leaked-password protection). Tidak ada lagi peringatan fungsi SECURITY DEFINER di schema publik. Kedua Edge Function aktif dengan JWT verification.
- **Performance:** tidak ada lagi peringatan foreign key tanpa indeks, multiple permissive policies, duplicate indexes, atau auth init-plan. Masih ada info indeks belum terpakai, yang tidak otomatis berarti indeks harus dihapus.

## Aturan keselamatan data
- `current_stock` adalah satu-satunya sumber stok operasional.
- Kolom legacy `stock` bukan sumber hitung.
- Jangan menghapus atau mengedit riwayat mutasi lama.
- Jangan mengoreksi saldo historis otomatis. Koreksi harus berupa transaksi baru yang dapat diaudit.
- Perubahan database selanjutnya harus diuji dan diverifikasi sebelum diterapkan ke produksi.

## Urutan pengerjaan berikutnya
1. Tambahkan secret `OPENAI_API_KEY` di Supabase Edge Function Secrets, lalu uji percakapan DABU end-to-end. Jangan pernah menaruh key di GitHub atau frontend.
2. Uji undangan staf menggunakan email tes; pastikan tautan recovery membawa pengguna ke form pembuatan password dan profil/role berhasil dibuat.
3. Selesaikan jurnal simpanan/pinjaman dan invoice dengan pemetaan akun yang benar.
4. Benahi dashboard, pengaturan profil koperasi, dan fondasi multi-koperasi.
5. Tambahkan tutup buku, audit trail, dan regression tests lintas modul.


## Master Testing Checklist — Regression Pass 22 November 2026

The following checks were executed against the active Supabase schema using explicit SQL transactions followed by ROLLBACK. No production business rows were changed by these regression tests.

### Verified in rollback tests
- POS cancellation RPC: first cancellation sets status to `dibatalkan`, returns stock once, and creates one balanced reversing journal. A second cancellation is rejected. Original sale journal remains posted and unchanged.
- Inventory: movement trigger overwrites caller-supplied stock snapshots and updates `current_stock`; legacy `stock` is not used as the stock authority. `penyesuaian_masuk` and `penyesuaian_keluar` work, stock is restored after paired test movements, and a negative-stock movement is rejected. Current UI low-stock predicate is `current_stock <= minimum_stock` (5 current products meet it).
- Manual journal reversal: creates a new balanced posted journal, preserves the original journal, rejects duplicate reversals, and blocks POS/invoice/savings/loan journals from being reversed outside their source module.
- Invoice: proposed RPC creates invoice header, line items, and journal together. Success test produced all three; a forced journal-account failure left no invoice header or items. Backfill test found 5/5 invoices would have automatic journals after repairing the two missing ones.
- Savings/loans: rollback test verified automatic savings and installment journals, a loan disbursement journal, a 12-row installment schedule, principal/service allocation, and duplicate-disbursement rejection. The savings backfill test found the existing savings transaction can be journaled without changing its source row.
- JavaScript syntax check passed after the application changes.

### Code changes prepared on branch
- Login handler now catches network/auth exceptions and always restores the submit button; live sign-in still requires an authorized user session to test.
- Journal history gains a manager-only manual reversal action backed by an immutable reversal RPC.
- Invoice save is moved to one atomic RPC.
- Loan disbursement is moved to one atomic RPC, requires an explicit source method (cash/transfer/QRIS), creates the schedule and journal together.
- Dark-mode overrides now cover inventory, POS, savings/loans, AR/AP, invoice, monitoring, and journal detail surfaces; visual confirmation on a real browser/device remains pending.
- Invite-user membership lookup now uses the authenticated Supabase user ID.

### Production deployment and remaining historical reconciliation
- Production migrations `journal_reversal`, `invoice_atomic`, and `savings_loan_accounting` were applied successfully on 22 November 2026. All regression test transactions used ROLLBACK; only the intentional invoice/savings journal backfills and schema/function changes persisted.
- The existing loan `PJM-1794893609971` has principal `Rp1.200.000`, disbursed on 17 November 2026, but the previous UI did not store whether the source was cash or bank. Its existing `Rp100.000` installment payment also has no journal. Do not backfill these loan journals until the historical disbursement source is confirmed.
- The invoice migration backfilled the two missing invoice journals as new audit records; production now has 5/5 invoices with automatic journals. It did not edit invoice rows.
- The savings migration backfilled the missing savings journal as a new audit record; production now has 1/1 savings transactions with automatic journals. It did not edit the savings transaction row.


### Release handoff
- GitHub PR #19 was merged into `main` on 22 November 2026.
- The current Cloudflare Pages project named `dagboek-nusa-pixel` is still connected to the older repository `sistem_akuntansi_kopdes` and branch `copy/kdmp-erp-base-daiboek`.
- `dagboek-nusa-pixel-demo` is an ad-hoc Pages project with no Git source connection. The merge to `kdmp-erp-pendowo-asri/main` therefore did not trigger a Cloudflare deployment. Do not switch or overwrite either Pages project until the intended production target is confirmed.


### KDMP ERP production deployment — 22 November 2026
- Created a dedicated Cloudflare Pages project `kdmp-erp-pendowo-asri`.
- Connected source control to GitHub repository `ahmadnashir0409-sudo/kdmp-erp-pendowo-asri`, production branch `main`.
- Production deployment `cd00f851-79a3-4033-8832-54c0dc86e81f` completed successfully.
- Live Pages address: `https://kdmp-erp-pendowo-asri.pages.dev`; deployment-specific URL: `https://cd00f851.kdmp-erp-pendowo-asri.pages.dev`.
- The older Pages projects for DAGBOEK were left unchanged.
- Post-deployment database verification: 0 posted journals out of balance, 0 invoices missing automatic journals, and 0 savings transactions missing automatic journals.

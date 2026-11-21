# Audit dan Stabilisasi DAGBOEK / KDMP ERP
Tanggal: 21 November 2026
Repository: `ahmadnashir0409-sudo/kdmp-erp-pendowo-asri`
Project Supabase: `srfhamdyewblyuangxzz`

## Status pengerjaan
Empat migration stabilisasi telah diterapkan ke database produksi setelah diuji dalam transaksi sementara yang diakhiri `ROLLBACK`. Perubahan kode utama telah digabungkan ke `main`.

### Perubahan yang sudah masuk
- Penjualan toko menggunakan RPC atomik untuk menyimpan header, detail, mutasi stok, dan jurnal dalam satu transaksi database.
- Pembatalan transaksi menggunakan RPC yang membuat mutasi pengembalian dan jurnal pembalik.
- `current_stock` dilindungi dari UPDATE langsung oleh pengguna aplikasi; nilai stok berubah melalui trigger mutasi.
- Trigger menyimpan `stock_before` dan `stock_after` dari nilai yang dikunci di database, bukan nilai yang dikirim klien.
- Fungsi internal `SECURITY DEFINER` dipindahkan ke schema `private`; endpoint API yang diperlukan aplikasi menggunakan wrapper `SECURITY INVOKER`.
- Role-based RLS diterapkan untuk modul utama: manajer, admin keuangan, kasir, admin gudang, dan pengurus.
- Menu dan form utama diberi pemeriksaan role di frontend.
- Identitas produk diselaraskan menjadi DAGBOEK by Nusa Pixel dengan sidebar charcoal, aksen heritage gold, tipografi Inter/Playfair Display, dan perbaikan dasar dark mode.
- Empat migration mencakup integritas/RPC, RLS role, private RPC wrappers, dan RLS/performance cleanup.

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
5. **Undangan staf belum aktif.** Pilihan role form sudah cocok dengan constraint database dan policy membership sudah tersedia, tetapi Edge Function `invite-user` belum dibuat/deploy.
6. **Multi-koperasi belum lengkap.** Tabel koperasi dan membership tersedia, tetapi tabel transaksi inti belum memiliki `cooperative_id`. Instalasi ini masih beroperasi sebagai satu koperasi.
7. **Pengaturan profil koperasi masih lokal.** Nama, email, alamat, telepon, dan logo masih disimpan di localStorage, belum disinkronkan ke Supabase.
8. **Dashboard belum mencakup seluruh sumber transaksi.** KPI pemasukan/pengeluaran dan grafik utama masih mengandalkan `financial_transactions`; POS, simpanan, dan pinjaman belum disatukan ke ringkasan.
9. **DABU belum diimplementasikan.** Belum ada UI assistant, Edge Function AI, tabel memori, atau secret provider AI.
10. **Tutup buku dan regression test lintas modul belum tersedia.**
11. **Dua pengaturan Auth perlu diselesaikan di Supabase Dashboard.** OTP email masih berlaku lebih dari satu jam dan leaked-password protection belum aktif. Tool project yang tersedia tidak menyediakan pengubahan kedua setting tersebut.

## Status Supabase Advisor
- **Security:** hanya dua peringatan konfigurasi Auth (OTP expiry dan leaked-password protection). Tidak ada lagi peringatan fungsi SECURITY DEFINER di schema publik.
- **Performance:** tidak ada lagi peringatan foreign key tanpa indeks, multiple permissive policies, duplicate indexes, atau auth init-plan. Masih ada info indeks belum terpakai, yang tidak otomatis berarti indeks harus dihapus.

## Aturan keselamatan data
- `current_stock` adalah satu-satunya sumber stok operasional.
- Kolom legacy `stock` bukan sumber hitung.
- Jangan menghapus atau mengedit riwayat mutasi lama.
- Jangan mengoreksi saldo historis otomatis. Koreksi harus berupa transaksi baru yang dapat diaudit.
- Perubahan database selanjutnya harus diuji dan diverifikasi sebelum diterapkan ke produksi.

## Urutan pengerjaan berikutnya
1. Implementasikan DABU sebagai Edge Function server-side dan UI assistant; API key harus disimpan sebagai secret Supabase, bukan di frontend.
2. Selesaikan jurnal simpanan/pinjaman dan invoice dengan pemetaan akun yang benar.
3. Bangun Edge Function undangan staf dan uji role dengan akun staf nyata.
4. Benahi dashboard, pengaturan profil koperasi, dan fondasi multi-koperasi.
5. Tambahkan tutup buku, audit trail, dan regression tests lintas modul.

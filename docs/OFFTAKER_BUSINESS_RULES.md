# Aturan Bisnis Modul Offtaker — KDMP by Nusa Pixel

Status: Disepakati untuk dasar implementasi  
Ruang lingkup: Seluruh jenis komoditas KDMP, bukan hanya hasil pertanian.

## 1. Aturan inisiasi transaksi

Transaksi Offtaker dapat dimulai oleh kedua pihak:

1. **KDMP memulai (outbound offer):** KDMP memilih mitra, memilih komoditas yang dapat dipasok, lalu membuat penawaran berisi volume, mutu/spesifikasi, harga, jadwal pemenuhan, dan masa berlaku.
2. **Offtaker memulai (inbound request):** KDMP mencatat permintaan dari mitra berisi komoditas, volume, mutu/spesifikasi, target harga bila ada, lokasi, dan tanggal kebutuhan.

Kedua jalur masuk ke proses negosiasi/penawaran yang sama. Tidak boleh membuat dua sistem transaksi terpisah.

## 2. Status alur transaksi

Status yang disarankan:
- Draft
- Diajukan / Menunggu Tanggapan
- Dalam Negosiasi
- Disetujui
- Ditolak / Dibatalkan
- Menjadi Pesanan
- Diproses
- Dikirim Sebagian
- Dikirim
- Diterima Sebagian
- Diterima Selesai
- Ditagihkan
- Dibayar Sebagian
- Lunas

Status hanya berubah melalui tindakan yang sesuai dan harus menyimpan waktu serta pengguna yang melakukan perubahan.

## 3. Pemilihan komoditas

- Komoditas yang sudah terdaftar dipilih melalui dropdown/search dari master Persediaan Barang.
- Nama, satuan, dan identitas barang menggunakan referensi master; jangan membuat nama barang bebas yang menduplikasi master.
- Komoditas yang belum ada di master boleh dicatat sebagai **katalog permintaan sementara** untuk kebutuhan/penawaran, tetapi tidak otomatis menjadi stok gudang.
- Sebelum pesanan dipenuhi, komoditas harus dipetakan ke barang master atau dibuatkan master barang melalui proses yang berwenang.
- Satuan dan konversi harus eksplisit; jangan menganggap KG, ton, karung, sak, liter, atau pcs setara.

## 4. Sumber pemenuhan komoditas

Pesanan dapat dipenuhi dari:
1. Stok gudang KDMP.
2. Hasil produksi anggota yang dihimpun KDMP.
3. Pembelian dari pemasok pihak ketiga.

Sumber pemenuhan dicatat per item/pemenuhan agar asal barang dan harga perolehan dapat diaudit. Ketersediaan sumber tidak boleh diasumsikan sebagai stok tersedia sebelum dikonfirmasi.

## 5. Aturan stok dan pengiriman

- Permintaan, penawaran, dan persetujuan kontrak tidak mengurangi stok.
- Stok gudang berkurang hanya ketika barang benar-benar dikeluarkan/dikirim dan mutasi persediaan tercatat.
- Gunakan `current_stock` sebagai sumber kebenaran stok gudang sesuai keputusan teknis proyek.
- Pengiriman bertahap didukung.
- Jumlah dikirim, jumlah diterima, jumlah ditolak, dan selisih dicatat terpisah.
- Barang dari anggota atau pemasok harus melalui pencatatan penerimaan/pengadaan sebelum diperlakukan sebagai stok gudang KDMP.
- Jangan mengubah atau menghapus riwayat mutasi untuk menyelesaikan selisih; gunakan koreksi yang dapat diaudit.

## 6. Harga dan pembayaran

- Harga penawaran, harga yang disepakati, harga perolehan, dan nilai invoice adalah data yang berbeda dan disimpan terpisah.
- Pembayaran mendukung tunai, transfer, uang muka/pelunasan, dan termin/kredit.
- Invoice dan piutang harus menggunakan modul keuangan yang sudah ada; hindari pencatatan invoice/piutang ganda.
- Jurnal dibuat melalui alur akuntansi yang berlaku dan harus seimbang.

## 7. Integrasi modul

- Persediaan: master komoditas, saldo gudang, dan mutasi keluar/masuk.
- Invoice: tagihan penjualan yang terkait pesanan/pengiriman.
- Utang & Piutang: saldo piutang offtaker.
- Jurnal Umum/Buku Besar: pencatatan akuntansi.
- Laporan Bulanan: omzet, penyerapan komoditas, pengiriman, dan piutang.

## 8. Prinsip kontrol

- Setiap dokumen memiliki nomor unik, tanggal, pembuat, dan status.
- Perubahan status dan transaksi penting memiliki jejak audit.
- Validasi hak akses mengikuti peran pengguna dan RLS.
- Jangan melakukan perubahan database produksi atau data historis sebelum skema, migrasi, dan dampaknya diaudit.


## 9. Standar tampilan riwayat dan detail

- Setiap daftar riwayat transaksi/dokumen wajib menyediakan kolom **Aksi** dengan tindakan **Lihat** atau **Detail**.
- Detail dibuka di tampilan depan (modal/dialog), bukan disisipkan jauh di bawah tabel atau halaman.
- Modal detail menampilkan informasi lengkap dokumen terkait, termasuk item komoditas, volume, harga, status, pihak terkait, dan jejak proses yang relevan.
- Modal dapat ditutup dengan tombol tutup dan klik area luar; pada perangkat mobile konten tetap nyaman dibaca dan tabel dapat digulir horizontal bila diperlukan.
- Aksi detail bersifat baca/tinjau; perubahan data hanya melalui tindakan Edit atau proses khusus dengan hak akses yang sesuai.
- Standar ini berlaku untuk riwayat mitra, permintaan, penawaran, kontrak, pesanan, pengadaan, pengiriman, invoice, dan pembayaran.

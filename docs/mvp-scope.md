# MVP Scope — StokSaku ERP

## 1. Tujuan MVP

Membangun ERP berbasis web untuk membantu toko retail dan grosir mengelola produk, persediaan, pembelian, dan penjualan dalam satu aplikasi.

MVP harus cukup lengkap untuk menunjukkan kemampuan full-stack dan diuji oleh calon pengguna nyata, tetapi tetap kecil agar dapat dikembangkan oleh satu developer dengan waktu 1–2 jam per hari.

## 2. Prinsip Pembatasan Scope

1. Prioritaskan alur bisnis yang saling terhubung.
2. Setiap fitur harus memiliki manfaat yang jelas bagi pengguna.
3. Utamakan konsistensi database dan keamanan sebelum menambah fitur.
4. Jangan membuat fitur hanya untuk memperbanyak halaman portfolio.
5. Fitur di luar MVP tidak dikerjakan sebelum alur utama stabil.
6. Gunakan modular monolith dengan Angular, FastAPI, dan PostgreSQL.

## 3. Fitur yang Masuk MVP

### P0 — Wajib selesai

#### A. Autentikasi dan organisasi

- Registrasi dan login.
- Logout.
- Pembuatan satu organisasi oleh pengguna.
- Role dasar: Owner dan Staff.
- Keanggotaan pengguna dalam organisasi.
- Isolasi data antarorganisasi.
- Validasi autentikasi dan izin di backend.

Batasan:
- Belum ada login sosial.
- Belum ada autentikasi multi-faktor.
- Undangan anggota dapat ditunda jika belum diperlukan untuk demo awal.

#### B. Master data

- CRUD produk.
- CRUD kategori.
- Data satuan produk.
- SKU unik dalam satu organisasi.
- Nama produk, harga beli, harga jual, dan stok minimum.
- CRUD supplier.
- Data pelanggan sederhana.
- Pencarian dan pagination produk.
- Menonaktifkan produk yang sudah digunakan dalam transaksi.

Batasan:
- Belum ada variasi produk kompleks seperti ukuran dan warna.
- Belum ada barcode scanner.
- Belum ada konversi satuan yang kompleks.

#### C. Inventory

- Satu gudang default per organisasi.
- Input stok awal.
- Barang masuk.
- Barang keluar.
- Penyesuaian stok dengan alasan.
- Saldo stok saat ini.
- Riwayat mutasi stok.
- Peringatan stok minimum dan stok habis.
- Pencegahan stok negatif secara default.
- Pencatatan pengguna yang melakukan mutasi.

Aturan penting:
- Setiap perubahan saldo harus menghasilkan catatan mutasi.
- Saldo dan mutasi harus disimpan dalam satu transaksi database.
- Transaksi yang sama tidak boleh mengubah stok dua kali.

#### D. Pembelian

- Membuat purchase order sederhana.
- Memilih supplier.
- Menambahkan produk dan kuantitas.
- Menghitung total pembelian.
- Status Draft, Ordered, dan Received.
- Penerimaan barang menambah stok.
- Mencegah penerimaan berulang atas kuantitas yang sama.

Batasan:
- Belum ada pembayaran supplier.
- Belum ada retur pembelian.
- Belum ada pembelian parsial pada implementasi pertama.

#### E. Penjualan

- Membuat transaksi penjualan sederhana.
- Memilih pelanggan secara opsional.
- Menambahkan produk dan kuantitas.
- Menghitung subtotal dan total di backend.
- Status Draft, Confirmed, dan Cancelled dengan aturan transisi yang jelas.
- Transaksi yang dikonfirmasi mengurangi stok.
- Validasi stok tersedia.
- Mencegah pemrosesan transaksi yang sama dua kali.

Batasan:
- Belum ada POS khusus kasir.
- Belum ada pembayaran online.
- Belum ada diskon bertingkat.
- Belum ada pajak kompleks.
- Belum ada cetak struk.

#### F. Dashboard dan laporan

- Jumlah produk aktif.
- Ringkasan jumlah stok.
- Daftar stok minimum dan stok habis.
- Ringkasan penjualan berdasarkan periode.
- Riwayat mutasi stok.
- Laporan persediaan sederhana.
- Ekspor CSV untuk laporan utama.

Batasan:
- Belum ada laporan akuntansi.
- Belum ada laporan arus kas.
- Belum ada laporan laba rugi lengkap.
- Belum ada analitik atau prediksi AI.

#### G. Kualitas dan deployment

- Validasi input di frontend dan backend.
- Penanganan loading, error, dan data kosong.
- Dokumentasi API.
- Pengujian unit dan integrasi untuk alur penting.
- Pengujian isolasi antarorganisasi.
- Environment variable untuk konfigurasi.
- Deployment demo.
- README, ERD, dan akun demo.
- Backup database dan prosedur pemulihan yang diuji.

### P1 — Dikerjakan setelah P0 stabil

- Undangan anggota melalui email.
- Pengelolaan role dan izin yang lebih terperinci.
- Impor produk dari CSV.
- Retur penjualan dan pembelian.
- Multi-gudang.
- Riwayat perubahan data yang lebih lengkap.
- Pengaturan paket dan batas penggunaan SaaS.
- Notifikasi stok menipis.

### P2 — Ditunda sampai produk tervalidasi

- Integrasi payment gateway dan pembayaran langganan otomatis.
- Integrasi marketplace.
- Integrasi kurir.
- Akuntansi dan buku besar.
- Payroll dan HR.
- Manajemen produksi.
- Prediksi stok menggunakan AI.
- Aplikasi mobile native.
- Integrasi printer struk dan perangkat POS.
- Multi-cabang dengan transfer stok lengkap.
- Integrasi sistem pajak dan regulasi yang kompleks.

## 4. Fitur yang Sengaja Tidak Dibuat pada MVP

Agar scope tidak melebar, MVP tidak mencakup:

- Semua modul ERP sekaligus.
- Akuntansi penuh.
- Sistem kasir lengkap.
- Banyak gudang sejak awal.
- Pembayaran online.
- Integrasi eksternal yang belum dibutuhkan pengguna.
- Kustomisasi workflow untuk setiap perusahaan.
- Arsitektur microservices.
- Aplikasi Android dan iOS terpisah.

Fitur tersebut bukan berarti tidak penting. Fitur tersebut ditunda sampai kebutuhan dan manfaatnya terbukti.

## 5. Alur Bisnis Minimum

MVP harus mendukung alur berikut:

1. Pengguna mendaftar dan membuat organisasi.
2. Pengguna membuat kategori dan produk.
3. Pengguna menetapkan stok awal.
4. Pengguna membuat purchase order.
5. Pengguna menerima barang dan stok bertambah.
6. Pengguna membuat transaksi penjualan.
7. Penjualan dikonfirmasi dan stok berkurang.
8. Pengguna melihat saldo stok dan riwayat mutasi.
9. Dashboard menampilkan data yang sesuai dengan transaksi.
10. Pengguna dari organisasi lain tidak dapat mengakses data tersebut.

## 6. Kriteria Penerimaan MVP

MVP dinyatakan selesai jika:

- [x] Pengguna dapat login dan mengakses organisasi yang benar.
- [x] Produk dapat dibuat, diedit, dicari, dan dinonaktifkan.
- [x] Stok awal dan mutasi dapat dicatat.
- [x] Pembelian yang diterima menambah stok dengan benar.
- [x] Penjualan yang dikonfirmasi mengurangi stok dengan benar.
- [x] Sistem mencegah transaksi yang diproses berulang kali.
- [x] Saldo stok sesuai dengan catatan mutasi.
- [x] Dashboard dan laporan menampilkan data aktual.
- [x] Akses lintas organisasi ditolak oleh backend.
- [x] Pengujian alur utama lulus.
- [ ] Aplikasi dapat dijalankan melalui URL demo.
- [ ] Dokumentasi dan akun demo tersedia.

## 7. Aturan Perubahan Scope

Setiap permintaan fitur baru harus menjawab tiga pertanyaan:

1. Apakah fitur ini dibutuhkan agar alur MVP dapat berjalan?
2. Apakah ada calon pengguna yang benar-benar membutuhkan fitur ini?
3. Apa konsekuensinya jika fitur ini ditunda?

Jika fitur tidak diperlukan untuk alur inti, tidak berkaitan dengan keamanan, dan belum didukung kebutuhan pengguna, masukkan ke backlog setelah MVP.

## 8. Target Akhir

Target MVP bukan menjadi ERP terlengkap, melainkan menjadi aplikasi yang:

- Memiliki alur produk, pembelian, penjualan, dan persediaan yang berfungsi.
- Menunjukkan kualitas implementasi Angular, FastAPI, dan PostgreSQL.
- Memiliki pengujian dan dokumentasi yang dapat diperiksa recruiter.
- Dapat dicoba oleh beberapa toko untuk memvalidasi kebutuhan SaaS.
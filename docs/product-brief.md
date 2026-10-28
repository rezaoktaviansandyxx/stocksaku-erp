# Product Brief — StokSaku ERP

## 1. Informasi Produk

- **Nama produk:** StokSaku ERP
- **Jenis produk:** Web-based ERP untuk retail dan grosir
- **Model bisnis:** SaaS (Software as a Service)
- **Target pengguna:** Pemilik toko, admin toko, staf gudang, dan kasir
- **Status:** Perencanaan dan pengembangan MVP
- **Frontend:** Angular + TypeScript
- **Backend:** FastAPI + Python
- **Database:** PostgreSQL
- **Arsitektur:** Modular monolith dengan dukungan multi-tenant

> Nama StokSaku ERP merupakan nama kerja dan dapat diubah setelah validasi produk.

## 2. Latar Belakang Masalah

Toko retail dan grosir skala kecil hingga menengah sering menghadapi kesulitan dalam mengelola persediaan dan transaksi bisnis.

Sebagian toko masih menggunakan buku catatan atau spreadsheet untuk mencatat barang masuk, barang keluar, pembelian, dan penjualan.

Pendekatan tersebut dapat menyebabkan:
- Kesulitan mengetahui stok barang secara akurat.
- Keterlambatan mengetahui produk yang hampir habis.
- Kesulitan melacak riwayat perubahan stok.
- Risiko kesalahan pencatatan transaksi.
- Kesulitan menyusun laporan persediaan dan penjualan.

StokSaku ERP dirancang untuk membantu menyederhanakan pengelolaan operasional toko melalui satu aplikasi web yang terintegrasi.

## 3. Tujuan Produk

Tujuan utama StokSaku ERP adalah menyediakan aplikasi ERP ringan yang mudah digunakan, dapat dikembangkan secara bertahap, dan berpotensi menjadi layanan SaaS berbayar.

Tujuan khusus:

1. Memudahkan pengguna mengelola data produk dan kategori.
2. Menyediakan informasi stok yang konsisten dan dapat ditelusuri.
3. Menghubungkan proses pembelian, penerimaan barang, dan penjualan.
4. Menampilkan ringkasan operasional melalui dashboard dan laporan.
5. Memisahkan data setiap perusahaan dengan aman.
6. Menjadi proyek portfolio yang menunjukkan kemampuan frontend, backend, database, pengujian, dan deployment.

## 4. Target Pengguna

### Pengguna utama

Pemilik toko retail atau grosir yang:
- Mengelola sekitar 100–1.000 SKU sebagai target segmen awal.
- Membutuhkan pencatatan stok yang lebih terstruktur.
- Belum membutuhkan ERP dengan fitur kompleks.
- Menginginkan akses melalui browser tanpa instalasi aplikasi desktop khusus.

### Peran pengguna

| Role | Tanggung Jawab |
|---|---|
| Owner | Mengelola perusahaan, pengguna, dan seluruh data bisnis yang diizinkan |
| Admin | Mengelola master data dan transaksi sesuai izin |
| Staff Gudang | Mencatat penerimaan, pengeluaran, dan penyesuaian stok |
| Kasir / Sales | Membuat transaksi penjualan sesuai izin |

Role dan izin dapat disederhanakan selama MVP, tetapi pemeriksaan izin harus tetap dilakukan oleh backend.

## 5. Solusi yang Ditawarkan

StokSaku ERP menyediakan satu sistem untuk mengelola produk, persediaan, pembelian, penjualan, dan laporan dasar.

Nilai utama yang ingin diberikan:
- **Mudah digunakan:** alur kerja sederhana dan antarmuka yang konsisten.
- **Stok lebih terkontrol:** saldo stok dan riwayat mutasi saling terhubung.
- **Informasi lebih jelas:** dashboard menampilkan stok menipis dan ringkasan transaksi.
- **Data terpusat:** pengguna tidak perlu memelihara catatan terpisah untuk setiap proses.
- **Siap berkembang:** struktur data mendukung pengembangan multi-perusahaan dan multi-gudang.

## 6. Ruang Lingkup MVP

### 6.1 Autentikasi dan organisasi

- Registrasi dan login pengguna.
- Logout dan pengelolaan sesi.
- Pembuatan organisasi atau perusahaan.
- Keanggotaan pengguna dan role dasar.
- Pembatasan akses berdasarkan organisasi.

### 6.2 Master data

- CRUD produk.
- CRUD kategori produk.
- Pengaturan satuan produk.
- SKU unik dalam setiap organisasi.
- Harga beli, harga jual, dan stok minimum.
- Data pelanggan dan supplier.

### 6.3 Inventory

- Pencatatan stok awal.
- Pencatatan barang masuk.
- Pencatatan barang keluar.
- Penyesuaian stok dengan alasan.
- Riwayat pergerakan stok.
- Informasi stok menipis dan stok habis.

### 6.4 Pembelian

- Pembuatan purchase order sederhana.
- Penambahan item pembelian.
- Perhitungan jumlah dan total transaksi.
- Penerimaan barang.
- Penambahan stok setelah penerimaan dikonfirmasi.
- Pencegahan penerimaan ganda.

### 6.5 Penjualan

- Pembuatan transaksi penjualan.
- Pemilihan pelanggan secara opsional.
- Penambahan produk dan kuantitas.
- Perhitungan subtotal dan total di backend.
- Validasi ketersediaan stok.
- Pengurangan stok saat transaksi diproses sesuai aturan bisnis.

### 6.6 Dashboard dan laporan

- Jumlah produk aktif.
- Ringkasan stok.
- Produk dengan stok minimum atau habis.
- Ringkasan penjualan berdasarkan periode.
- Riwayat mutasi stok.
- Ekspor laporan dasar ke CSV.

### 6.7 Fondasi SaaS

- Data bisnis dipisahkan berdasarkan organisasi.
- Role dan izin diperiksa di backend.
- Konfigurasi paket dan batas penggunaan dasar.
- Pencatatan aktivitas penting.
- Konfigurasi deployment dan backup database.

## 7. Fitur di Luar MVP

Fitur berikut ditunda agar pengembangan tetap fokus:

- Akuntansi dan buku besar lengkap.
- Penggajian dan HR.
- Perhitungan pajak yang kompleks.
- Integrasi marketplace.
- Integrasi payment gateway.
- Aplikasi mobile native.
- Prediksi stok berbasis AI.
- Multi-gudang lengkap dan transfer antargudang.
- Manajemen produksi.
- Sistem loyalitas pelanggan.
- Integrasi perangkat POS dan printer struk.

Fitur baru akan diprioritaskan berdasarkan hasil pengujian pengguna dan kebutuhan bisnis yang tervalidasi.

## 8. Prinsip Bisnis dan Aturan Data

1. Setiap data bisnis harus terkait dengan organisasi yang memilikinya.
2. Pengguna tidak boleh membaca atau mengubah data organisasi lain tanpa izin yang sah.
3. SKU harus unik dalam satu organisasi.
4. Perubahan stok harus memiliki catatan mutasi yang dapat ditelusuri.
5. Perubahan saldo dan pencatatan mutasi harus terjadi dalam satu transaksi database.
6. Total transaksi dihitung dan diverifikasi oleh backend.
7. Transaksi yang sudah dikonfirmasi tidak boleh mengubah stok berulang kali akibat permintaan duplikat.
8. Penghapusan produk yang telah digunakan dalam transaksi harus mengikuti aturan referensial; produk dapat dinonaktifkan alih-alih dihapus.
9. Data harga menggunakan tipe numerik desimal, bukan floating-point.
10. Semua endpoint bisnis harus memeriksa autentikasi, organisasi, dan izin pengguna.

## 9. Model Bisnis

Model bisnis yang direncanakan adalah langganan SaaS bulanan.

### Hipotesis paket awal

| Paket | Harga Hipotesis | Batas dan Fitur |
|---|---:|---|
| Free | Rp0 | Fitur dasar dengan batas produk dan pengguna |
| Starter | Rp49.000/bulan | Pengelolaan stok, riwayat mutasi, dan laporan dasar |
| Plus | Rp99.000/bulan | Batas pengguna lebih besar dan laporan tambahan |

Harga dan batas paket di atas merupakan hipotesis untuk diuji, bukan harga final.

Pada tahap portfolio, sistem langganan dapat menggunakan data simulasi. Integrasi pembayaran nyata dilakukan setelah kebutuhan pengguna dan kelayakan bisnis tervalidasi.

## 10. Indikator Keberhasilan

### Keberhasilan teknis

- Pengguna dapat login dan mengakses organisasi yang sesuai.
- Produk dapat dibuat, diubah, dicari, dan dinonaktifkan.
- Perubahan stok menghasilkan saldo dan riwayat yang konsisten.
- Pembelian yang diterima menambah stok dengan benar.
- Penjualan yang diproses mengurangi stok dengan benar.
- Permintaan duplikat tidak memproses transaksi yang sama dua kali.
- Pengguna dari organisasi lain tidak dapat mengakses data yang bukan haknya.
- Pengujian otomatis berjalan dalam proses pengembangan dan CI.

### Keberhasilan produk

Target eksperimen awal:
- Mewawancarai sekitar 10 pemilik toko.
- Mendapatkan 3–5 pengguna untuk mencoba prototype.
- Mendapatkan 3 toko yang bersedia menguji alur kerja nyata.
- Menguji apakah 1–3 calon pelanggan bersedia membayar.

Target tersebut digunakan untuk memutuskan arah pengembangan, bukan sebagai jaminan keberhasilan.

## 11. Rencana Pengembangan

Pengembangan dilakukan bertahap:

1. Fondasi repository, dokumentasi, dan setup teknologi.
2. Database, autentikasi, dan organisasi.
3. Master produk dan kategori.
4. Inventory dan riwayat mutasi.
5. Pembelian dan penerimaan barang.
6. Penjualan dan pengurangan stok.
7. Dashboard dan laporan.
8. Testing, keamanan, dan deployment.
9. Validasi pengguna dan perbaikan berdasarkan masukan.

Estimasi awal adalah sekitar 16 minggu dengan alokasi 1–2 jam per hari, tergantung kecepatan belajar dan kompleksitas implementasi.

## 12. Definisi Selesai MVP

MVP dinyatakan siap didemonstrasikan apabila:

- Seluruh alur utama dapat dijalankan melalui frontend.
- Data tersimpan secara persisten di PostgreSQL.
- Validasi dan aturan bisnis diterapkan di backend.
- Saldo stok konsisten dengan riwayat transaksi.
- Autentikasi, otorisasi, dan isolasi tenant telah diuji.
- Pengujian utama lulus.
- Aplikasi dapat diakses melalui deployment demo.
- README, dokumentasi API, ERD, screenshot, dan akun demo tersedia.
- Tidak ada rahasia atau kredensial sensitif di repository.

## 13. Arah Pengembangan Jangka Panjang

Setelah MVP tervalidasi, StokSaku ERP dapat dikembangkan dengan:
- Multi-gudang dan transfer persediaan.
- Retur penjualan dan pembelian.
- Diskon dan daftar harga grosir.
- Manajemen pembayaran dan piutang sederhana.
- Laporan laba kotor.
- Integrasi POS.
- Langganan SaaS dan pembayaran otomatis.
- Notifikasi stok dan laporan berkala.

Prioritas pengembangan berikutnya ditentukan berdasarkan kebutuhan pengguna, kualitas implementasi, dan kelayakan bisnis.
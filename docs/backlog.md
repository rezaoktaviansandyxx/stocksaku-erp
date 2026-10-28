# Backlog Awal — StokSaku ERP

## 1. Tujuan

Membagi pengembangan StokSaku ERP menjadi task kecil yang dapat dikerjakan, diuji, dan ditinjau secara bertahap.

**Stack:**
- Frontend: Angular + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- ORM: SQLAlchemy
- Migrasi: Alembic
- Testing backend: Pytest

## 2. Prioritas

| Prioritas | Arti |
|---|---|
| P0 | Wajib untuk MVP |
| P1 | Penting setelah alur inti stabil |
| P2 | Pengembangan lanjutan |

## 3. EPIC A — Project Setup

### A-01 — Membuat repository

- Prioritas: P0
- Estimasi: 1 sesi

Task:
- Membuat repository `stoksaku-erp`.
- Menambahkan README dan `.gitignore`.
- Membuat folder `frontend`, `backend`, dan `docs`.
- Menentukan konvensi branch dan commit.

Kriteria selesai:
- Repository dapat diakses.
- Struktur awal tersedia.
- File rahasia dan environment lokal tidak masuk Git.

### A-02 — Setup Angular

- Prioritas: P0
- Estimasi: 1–2 sesi

Task:
- Membuat aplikasi Angular.
- Mengaktifkan TypeScript strict mode.
- Menyiapkan Angular Router.
- Membuat halaman awal.
- Menyiapkan konfigurasi environment untuk URL API.

Kriteria selesai:
- Aplikasi berjalan secara lokal.
- Navigasi ke halaman awal berfungsi.
- URL backend tidak ditulis berulang kali di banyak file.

### A-03 — Setup FastAPI

- Prioritas: P0
- Estimasi: 1–2 sesi

Task:
- Membuat virtual environment Python.
- Menginstal FastAPI dan server ASGI.
- Membuat `app/main.py`.
- Membuat endpoint pemeriksaan kesehatan aplikasi.
- Menyiapkan konfigurasi environment.

Kriteria selesai:
- API berjalan secara lokal.
- Endpoint health check memberikan respons yang sesuai.
- Dokumentasi Swagger dapat dibuka.

### A-04 — Setup PostgreSQL

- Prioritas: P0
- Estimasi: 1–2 sesi

Task:
- Menyiapkan database PostgreSQL lokal.
- Membuat konfigurasi koneksi database.
- Menginstal SQLAlchemy dan Alembic.
- Menyiapkan session database.
- Membuat migrasi awal.

Kriteria selesai:
- FastAPI dapat terhubung ke PostgreSQL.
- Migrasi dapat dijalankan dan dibatalkan sesuai prosedur.
- Kredensial database tersimpan di environment, bukan di source code.

---

## 4. EPIC B — Database dan Model

### B-01 — Model organisasi

- Prioritas: P0
- Estimasi: 1 sesi

Task:
- Membuat model `Organization`.
- Menambahkan ID, nama, slug, status, dan waktu pembuatan.
- Menambahkan constraint unik pada slug.
- Membuat migrasi Alembic.

Kriteria selesai:
- Tabel organisasi tersedia.
- Data organisasi dapat disimpan dan dibaca.

### B-02 — Model pengguna dan membership

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat model `User`.
- Membuat model `Membership`.
- Menghubungkan pengguna dengan organisasi.
- Menambahkan role dasar Owner dan Staff.
- Mencegah membership ganda untuk pengguna dan organisasi yang sama.

Kriteria selesai:
- Pengguna dapat menjadi anggota organisasi.
- Role tersimpan dan dapat diperiksa.
- Constraint database mencegah membership duplikat.

### B-03 — Model master produk

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat model `Category`.
- Membuat model `Unit`.
- Membuat model `Product`.
- Menambahkan relasi ke organisasi.
- Menambahkan constraint unik `organization_id + sku`.
- Menggunakan tipe numerik desimal untuk harga dan kuantitas.

Kriteria selesai:
- Model dan migrasi produk tersedia.
- Produk tidak dapat menggunakan SKU yang sama dalam organisasi yang sama.
- Organisasi berbeda dapat menggunakan SKU yang sama.

### B-04 — Model inventory

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat model `Warehouse`.
- Membuat model `StockBalance`.
- Membuat model `StockMovement`.
- Menambahkan relasi produk, gudang, organisasi, dan pengguna.
- Menambahkan constraint unik pada kombinasi organisasi, gudang, dan produk.

Kriteria selesai:
- Struktur saldo dan mutasi stok tersedia.
- Setiap saldo terkait dengan satu produk dan satu gudang.
- Migrasi dapat dijalankan pada database kosong.

---

## 5. EPIC C — Autentikasi dan Otorisasi

### C-01 — Registrasi pengguna

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat schema request dan response.
- Memvalidasi format email dan password.
- Melakukan hashing password.
- Menyimpan pengguna baru.
- Menangani email yang sudah digunakan.

Kriteria selesai:
- Pengguna dapat mendaftar dengan data valid.
- Password tidak disimpan dalam bentuk teks biasa.
- Input tidak valid ditolak dengan pesan yang sesuai.

### C-02 — Login dan logout

- Prioritas: P0
- Estimasi: 2–3 sesi

Task:
- Membuat endpoint login.
- Memverifikasi password.
- Menentukan mekanisme sesi atau token yang aman.
- Membuat endpoint logout sesuai mekanisme autentikasi.
- Menangani token atau sesi yang tidak valid.

Kriteria selesai:
- Pengguna dapat login menggunakan kredensial valid.
- Kredensial salah ditolak.
- Endpoint yang membutuhkan autentikasi menolak pengguna yang belum login.
- Logout benar-benar mengakhiri sesi atau membuat token tidak berlaku sesuai desain.

### C-03 — Pembuatan organisasi

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat endpoint pembuatan organisasi.
- Menghubungkan pembuat organisasi dengan role Owner.
- Menentukan organisasi aktif pengguna.
- Memvalidasi keanggotaan organisasi.

Kriteria selesai:
- Organisasi dapat dibuat oleh pengguna yang berwenang.
- Pembuat organisasi memperoleh membership Owner.
- Pengguna tidak dapat memilih organisasi sembarang untuk memperoleh akses.

### C-04 — Otorisasi dan isolasi tenant

- Prioritas: P0
- Estimasi: 2–3 sesi

Task:
- Membuat dependency untuk memeriksa autentikasi dan membership.
- Memastikan query bisnis dibatasi oleh organisasi yang diizinkan.
- Membuat pengujian akses lintas organisasi.
- Memeriksa akses langsung melalui API, bukan hanya melalui UI.

Kriteria selesai:
- Pengguna organisasi A tidak dapat membaca atau mengubah data organisasi B.
- Permintaan tanpa izin ditolak.
- Pengujian isolasi tenant lulus.

---

## 6. EPIC D — Inventory Backend

### D-01 — API daftar dan detail produk

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat endpoint daftar produk.
- Membuat endpoint detail produk.
- Menambahkan pencarian dan pagination.
- Menerapkan filter organisasi.

Kriteria selesai:
- Data produk dapat dibaca melalui API.
- Hasil tidak mencampur data organisasi lain.
- Pagination dan pencarian bekerja sesuai parameter yang valid.

### D-02 — API CRUD produk

- Prioritas: P0
- Estimasi: 2–3 sesi

Task:
- Membuat endpoint tambah produk.
- Membuat endpoint ubah produk.
- Membuat endpoint menonaktifkan produk.
- Memvalidasi SKU, harga, kategori, dan satuan.
- Menangani SKU duplikat.

Kriteria selesai:
- Produk dapat dibuat dan diubah melalui API.
- Data tidak valid ditolak.
- Produk yang sudah digunakan dalam transaksi tidak dihapus sembarangan.

### D-03 — Stok awal

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat proses pencatatan stok awal.
- Membuat saldo stok.
- Mencatat mutasi awal.
- Memastikan proses dilakukan secara atomik.
- Mencegah stok awal dicatat dua kali untuk operasi yang sama.

Kriteria selesai:
- Saldo awal sesuai kuantitas yang dimasukkan.
- Riwayat mutasi tersedia.
- Jika proses gagal, saldo dan mutasi tidak tertinggal dalam kondisi berbeda.

### D-04 — Barang masuk dan keluar

- Prioritas: P0
- Estimasi: 3 sesi

Task:
- Membuat layanan barang masuk.
- Membuat layanan barang keluar.
- Memvalidasi kuantitas.
- Mencegah stok negatif jika tidak diizinkan.
- Mengunci atau memperbarui saldo dengan aman saat transaksi bersamaan.
- Mencatat pengguna dan alasan transaksi.

Kriteria selesai:
- Barang masuk menambah saldo.
- Barang keluar mengurangi saldo.
- Kuantitas nol atau negatif ditolak.
- Transaksi bersamaan tidak menyebabkan saldo stok tidak konsisten.

### D-05 — Penyesuaian stok

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat endpoint penyesuaian stok.
- Meminta alasan penyesuaian.
- Mencatat nilai sebelum dan sesudah perubahan atau informasi yang cukup untuk menelusurinya.
- Membuat catatan mutasi.
- Membatasi akses sesuai role.

Kriteria selesai:
- Penyesuaian mengubah saldo sesuai aturan.
- Riwayat perubahan dapat ditelusuri.
- Setiap penyesuaian memiliki pengguna dan alasan.

### D-06 — Riwayat dan peringatan stok

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat endpoint riwayat mutasi.
- Menambahkan filter produk dan periode.
- Menampilkan saldo saat ini.
- Menampilkan stok minimum dan stok habis.

Kriteria selesai:
- Riwayat dapat difilter.
- Saldo sesuai dengan proses inventory yang berhasil.
- Peringatan stok dihitung dari data aktual.

---

## 7. EPIC E — Angular Frontend

### E-01 — Layout aplikasi

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat layout dashboard.
- Membuat sidebar dan navigasi.
- Membuat header.
- Menyiapkan tampilan responsif.
- Membuat komponen bersama yang memang diperlukan.

Kriteria selesai:
- Navigasi utama berfungsi.
- Tampilan dapat digunakan pada desktop dan smartphone.
- Menu tidak menampilkan halaman yang belum memiliki fungsi seolah-olah sudah selesai.

### E-02 — Halaman login dan registrasi

- Prioritas: P0
- Estimasi: 2–3 sesi

Task:
- Membuat form login.
- Membuat form registrasi.
- Menggunakan Reactive Forms.
- Menghubungkan form ke API.
- Menampilkan validasi dan error.
- Mengatur kondisi pengguna yang sudah dan belum login.

Kriteria selesai:
- Pengguna dapat login dan mendaftar melalui UI.
- Form menampilkan error yang sesuai.
- Halaman yang dilindungi tidak dapat diakses tanpa autentikasi.

### E-03 — Integrasi API dan autentikasi

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Membuat service untuk HTTP request.
- Menyediakan konfigurasi base URL API.
- Menangani status loading dan error.
- Mengimplementasikan mekanisme sesi atau token sesuai desain backend.
- Membuat route guard.

Kriteria selesai:
- Frontend berkomunikasi dengan backend.
- Status autentikasi ditangani secara konsisten.
- Rahasia server tidak ditanamkan ke bundle frontend.

### E-04 — Halaman produk

- Prioritas: P0
- Estimasi: 3 sesi

Task:
- Membuat tabel produk.
- Membuat form tambah dan edit.
- Menambahkan pencarian dan pagination.
- Menambahkan status stok jika tersedia.
- Menghubungkan UI dengan endpoint produk.

Kriteria selesai:
- Produk dapat dikelola dari browser.
- Perubahan tampil setelah respons API berhasil.
- UI memiliki kondisi loading, error, dan data kosong.

### E-05 — Halaman inventory

- Prioritas: P0
- Estimasi: 3–4 sesi

Task:
- Membuat ringkasan saldo stok.
- Membuat form stok awal.
- Membuat form barang masuk dan keluar.
- Membuat form penyesuaian.
- Membuat tabel riwayat mutasi.
- Menampilkan validasi dan hasil transaksi dari API.

Kriteria selesai:
- Pengguna dapat melakukan operasi inventory melalui UI.
- Saldo diperbarui berdasarkan respons backend.
- UI tidak menganggap transaksi berhasil sebelum backend mengonfirmasinya.

### E-06 — Dashboard

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Menampilkan jumlah produk.
- Menampilkan stok minimum dan stok habis.
- Menampilkan ringkasan inventory.
- Menghubungkan dashboard ke endpoint yang sesuai.

Kriteria selesai:
- Angka dashboard berasal dari database.
- Data mengikuti organisasi yang sedang diakses.
- Kondisi gagal memuat data ditampilkan dengan benar.

---

## 8. EPIC F — Testing dan Penyelesaian MVP

### F-01 — Pengujian backend

- Prioritas: P0
- Estimasi: 3 sesi

Task:
- Menguji validasi produk.
- Menguji perhitungan saldo.
- Menguji barang masuk dan keluar.
- Menguji transaksi yang gagal.
- Menguji isolasi tenant.
- Menguji transaksi ganda dan perubahan stok bersamaan.

Kriteria selesai:
- Pengujian alur inventory utama lulus.
- Kegagalan transaksi tidak meninggalkan saldo dan mutasi yang tidak konsisten.

### F-02 — Pengujian frontend

- Prioritas: P0
- Estimasi: 2 sesi

Task:
- Menguji form login dan produk.
- Menguji validasi form.
- Menguji loading, error, dan data kosong.
- Menguji navigasi dan route guard.
- Memeriksa tampilan desktop dan mobile.

Kriteria selesai:
- Alur utama bisa diselesaikan tanpa kesalahan UI yang menghalangi pengguna.
- Error API ditangani dengan benar.

### F-03 — Dokumentasi dan demo

- Prioritas: P0
- Estimasi: 2–3 sesi

Task:
- Melengkapi README.
- Menyertakan ERD.
- Menyertakan instruksi setup lokal.
- Mendokumentasikan endpoint API.
- Menyediakan data demo yang aman.
- Menyiapkan deployment dan akun demo.

Kriteria selesai:
- Developer lain dapat mengikuti instruksi setup.
- Recruiter atau calon pengguna dapat mencoba demo tanpa mengakses data pribadi.
- Tidak ada kredensial sensitif dalam repository.

---

## 9. Urutan Pengerjaan

Urutan implementasi yang disarankan:

1. A-01 — Repository.
2. A-02 — Angular.
3. A-03 — FastAPI.
4. A-04 — PostgreSQL.
5. B-01 sampai B-04 — Model database awal.
6. C-01 sampai C-04 — Autentikasi dan isolasi tenant.
7. D-01 dan D-02 — API produk.
8. E-01 sampai E-04 — UI dan integrasi produk.
9. D-03 sampai D-06 — Inventory backend.
10. E-05 dan E-06 — UI inventory dan dashboard.
11. F-01 sampai F-03 — Pengujian dan demo.

Pembelian dan penjualan lengkap dikerjakan setelah inventory dasar stabil. Jangan membuat semua modul sekaligus.

## 10. Definition of Done

Sebuah task dianggap selesai jika:

- Implementasi memenuhi kriteria penerimaan.
- Validasi dan penanganan error tersedia.
- Pengujian relevan telah dijalankan.
- Tidak ada rahasia yang di-commit.
- Dokumentasi diperbarui bila diperlukan.
- Perubahan sudah ditinjau dan di-commit.
- Tidak merusak alur yang sebelumnya berfungsi.

## 11. Task Pertama

Mulai dari A-01:

1. Buat repository `stoksaku-erp`.
2. Buat folder `frontend`, `backend`, dan `docs`.
3. Tambahkan `README.md`, `.gitignore`, `docs/product-brief.md`, dan `docs/mvp-scope.md`.
4. Commit fondasi awal.

Setelah task tersebut selesai, lanjutkan ke setup Angular dan FastAPI secara terpisah sebelum menghubungkannya ke database.
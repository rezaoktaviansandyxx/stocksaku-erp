# StokSaku ERP

StokSaku ERP adalah aplikasi ERP berbasis web untuk membantu toko retail dan grosir mengelola produk, persediaan barang, pembelian, penjualan, dan laporan operasional.

Proyek ini dikembangkan sebagai portfolio pengembangan software sekaligus fondasi untuk calon produk SaaS multi-perusahaan.

## Tujuan Proyek

- Mempermudah pengelolaan stok barang.
- Mencatat transaksi pembelian dan penjualan.
- Menyediakan laporan persediaan dan penjualan.
- Menerapkan pemisahan data untuk setiap perusahaan.
- Membangun fondasi aplikasi yang aman, teruji, dan mudah dikembangkan.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | Angular + TypeScript |
| Backend | FastAPI + Python |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database migration | Alembic |
| Backend testing | Pytest |

## Fitur MVP

- Autentikasi dan manajemen organisasi.
- Manajemen produk, kategori, satuan, pemasok, dan pelanggan.
- Pencatatan stok masuk, stok keluar, dan penyesuaian stok.
- Transaksi pembelian dan penerimaan barang.
- Transaksi penjualan.
- Dashboard dan laporan persediaan.
- Pemisahan data antarorganisasi.

## Setup Backend

Prasyarat: Python 3.11+ dan PostgreSQL yang berjalan.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
```

Buat file `.env` di folder `backend/`:

```env
DATABASE_URL=postgresql+psycopg://<user>:<password>@localhost:5432/stocksaku
JWT_SECRET_KEY=ganti-dengan-secret-acak
```

Jalankan migrasi database lalu seed data demo:

```bash
python -m alembic upgrade head
python scripts/seed_demo.py
```

Seed script bersifat idempotent — data hanya dibuat jika organisasi `toko-demo` belum ada.

Jalankan server:

```bash
uvicorn app.main:app --reload
```

API docs tersedia di `http://localhost:8000/docs`.

## Akun Demo

Setelah menjalankan seed script, gunakan akun berikut untuk mencoba aplikasi:

| Peran | Email | Password | Slug Organisasi |
|---|---|---|---|
| Owner | `owner@demo.com` | `demo12345` | `toko-demo` |
| Staff | `staff@demo.com` | `demo12345` | `toko-demo` |

Data simulasi yang dibuat: 3 produk (beras, gula, minyak), 1 supplier, 1 customer, 1 gudang, 2 Purchase Orders (sudah diterima & menunggu barang), dan 2 Sales Orders (terkonfirmasi & draft).

## Testing Backend

```bash
cd backend
python -m pytest
```

Suite pengujian menggunakan SQLite in-memory dan mencakup: registrasi/login, CRUD produk, inventaris, CRUD partner, siklus hidup Purchase Order (termasuk penerimaan stok dan proteksi ganda), siklus hidup Sales Order (validasi stok, konfirmasi, pembatalan), dashboard & ekspor CSV, serta proteksi multi-tenant.

## Struktur Repository

```text
stoksaku-erp/
├── frontend/
├── backend/
│   ├── scripts/
│   │   └── seed_demo.py
│   └── tests/
├── docs/
│   ├── product-brief.md
│   ├── mvp-scope.md
│   ├── database-design.md
│   └── backlog.md
├── .gitignore
└── README.md
```

Struktur akan berkembang secara bertahap sesuai kebutuhan implementasi.

## Status Pengembangan

MVP prioritas tinggi (P0) sudah selesai diimplementasikan: autentikasi, master data, inventaris, pembelian, penjualan, dashboard, ekspor laporan, dan pengujian otomatis. Status tiap fase tercatat di `PLAN.md`.

## Prinsip Pengembangan

- Memprioritaskan fitur inti sebelum fitur tambahan.
- Menggunakan modular monolith untuk tahap awal.
- Memvalidasi transaksi di backend.
- Menjaga isolasi data antarorganisasi.
- Menggunakan migrasi database dan pengujian otomatis.
- Mengembangkan aplikasi secara bertahap agar sesuai dengan kapasitas belajar dan waktu yang tersedia.

## Dokumentasi

- `docs/product-brief.md` — tujuan produk, pengguna, dan model bisnis.
- `docs/mvp-scope.md` — batas fitur MVP dan kriteria penerimaan.
- `docs/database-design.md` — rancangan awal database menggunakan Mermaid.
- `docs/backlog.md` — daftar pekerjaan dan urutan implementasi.

## Lisensi

Lisensi proyek belum ditetapkan.
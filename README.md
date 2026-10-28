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

## Struktur Repository

```text
stoksaku-erp/
├── frontend/
├── backend/
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

Proyek berada pada tahap fondasi dan perencanaan MVP. Fitur belum dianggap selesai sebelum implementasi, pengujian, dan dokumentasinya tersedia.

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
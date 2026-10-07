# Portal Lapor Warga

Aplikasi web untuk melaporkan dan memantau masalah di lingkungan sekitar (jalan rusak, banjir, sampah, penerangan, keamanan, dan lainnya). Dibangun dengan **React (Vite) + Tailwind CSS + lucide-react** di frontend dan **Node.js + Express + Turso (libSQL)** di backend.

## Fitur

- 📣 Buat laporan (judul, kategori, deskripsi, lokasi, pelapor / anonim)
- 📷 Upload foto bukti (hingga 4 foto per laporan)
- 📋 Daftar laporan dengan pencarian (debounce), filter kategori & status, pengurutan, dan paginasi
- 📊 Statistik ringkas (total, baru, diproses, selesai)
- 📈 Dashboard statistik & grafik tren (area, pie, bar) — peta 30 hari, kategori, status
- ⏱️ Metrik SLA — rata-rata waktu penyelesaian laporan (dibuat → selesai)
- 📜 Audit log petugas — catat setiap aksi (ubah status, tanggapan, penugasan, hapus)
- 👍 Dukungan (upvote) pada laporan — satu akun satu suara (bisa batalkan)
- 💬 Komentar/diskusi pada setiap laporan
- 🕒 Riwayat status laporan (timeline perubahan)
- 🔎 Pencarian teks lengkap (FTS5) dengan ranking relevansi
- 🗑️ Moderasi laporan — soft delete & pulihkan dari tempat sampah (khusus petugas)
- 📤 Export laporan ke CSV (khusus petugas)
- 🔐 Autentikasi JWT (daftar & masuk warga, login petugas & admin) dengan kata sandi ter-hash bcrypt
- 🛠️ Panel petugas untuk mengubah status laporan (khusus role `petugas`)
- 👑 Panel admin untuk mengelola akun petugas & memantau kinerja (khusus role `admin`, `/admin`)
- 📌 Filter "Laporan Saya" untuk warga yang sudah masuk
- 🗺️ Geotagging (latitude/longitude) + pencarian laporan dalam radius
- 🧭 Pencarian radius cepat dengan pre-filter **geohash** (index) + Haversine presisi
- 🔎 Deteksi duplikat — peringatan bila ada laporan serupa (kategori + radius 500 m)
- 🗺️ Peta interaktif (Leaflet + OpenStreetMap) — tampilan peta laporan & pemilihan titik lokasi
- 📍 "Di Sekitar Saya" — temukan laporan dalam radius 5 km dari posisi Anda (geolokasi)
- 🧭 Marker cluster untuk banyak laporan + rute/arah ke lokasi laporan (Google Maps)
- 💬 Tanggapan resmi petugas + rating kepuasan warga (1–5)
- 👥 Penugasan laporan ke petugas
- 🎬 Intro cinematic loader saat website dibuka (teks beranimasi kata-per-kata)
- ✨ Animasi halus: transisi antar halaman, reveal saat scroll, parallax hero, & hover kartu yang hidup
- 🛡️ Rate limiting & security headers (helmet) — global + per pengguna/IP untuk laporan, komentar, dukungan
- ⚡ Caching statistik (in-memory, TTL) untuk mengurangi beban query berulang
- 🗄️ Database ternormalisasi + terindeks (index pada kolom filter, join, foreign key, dan geohash)

## Diagram

- **Alur penggunaan website**: [alur-diagram-website.png](./alur-diagram-website.png)
- **Arsitektur backend** (request → middleware → controller → database): [arsitektur-backend.png](./arsitektur-backend.png)

## Struktur Proyek

```
.
├── server/            # Backend API (Express + Turso/libSQL)
│   ├── index.js       # Endpoint API
│   ├── db.js          # Koneksi database Turso, migrasi, index, FTS5 & seed contoh
│   ├── auth.js        # bcrypt + JWT + middleware autentikasi
│   ├── validate.js    # Skema validasi Zod
│   ├── env.js         # Loader dotenv (baca server/.env)
│   └── uploads/       # File foto yang diunggah
└── client/            # Frontend React (Vite + Tailwind CSS)
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css       # Tailwind + keyframes animasi
        ├── api.js
        ├── constants.js
        ├── icons.jsx       # Pemetaan ikon SVG (lucide-react)
        ├── utils.js
        ├── hooks/
        │   └── useParallax.js   # Hook efek parallax saat scroll
        └── components/
            ├── CinematicLoader.jsx # Intro loading saat website dibuka
            ├── Home.jsx            # Beranda (daftar/peta, statistik, filter)
            ├── Navbar.jsx          # Navigasi utama
            ├── AuthPage.jsx        # Halaman masuk & daftar
            ├── ReportForm.jsx      # Formulir buat laporan (peta + geolokasi + deteksi duplikat)
            ├── ReportCard.jsx      # Kartu laporan (dengan tombol hapus untuk petugas)
            ├── ReportDetail.jsx    # Detail laporan (komentar, rating, panel petugas)
            ├── ReportMap.jsx       # Peta interaktif (marker cluster + radius)
            ├── MapPicker.jsx       # Pemilihan titik lokasi di peta
            ├── Reveal.jsx          # Animasi reveal saat scroll (fade + slide)
            ├── Dashboard.jsx       # Dashboard statistik + grafik (Recharts)
            ├── PetugasPanel.jsx    # Panel petugas (daftar laporan, antrean, peta sebaran)
            ├── AdminPage.jsx       # Panel admin (kelola akun petugas + kinerja)
            └── About.jsx           # Halaman "Tentang" (statistik, kontak & FAQ)
```

## Teknologi

- **Frontend**: React 18, Vite, Tailwind CSS v4, lucide-react (ikon), Leaflet + react-leaflet + leaflet.markercluster (peta), Recharts (grafik)
- **Backend**: Express 4, @libsql/client (Turso/libSQL), bcryptjs, jsonwebtoken, multer, helmet, express-rate-limit, zod, dotenv, ngeohash (geohash)

## Menjalankan

Kebutuhan: Node.js versi 18 ke atas, plus database **Turso** (atur `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` di `server/.env`).

**1. Backend** (berjalan di http://localhost:3001)

```bash
cd server
npm install
npm start
```

Sebelum menjalankan backend, salin `server/.env.example` menjadi `server/.env` lalu isi `TURSO_DATABASE_URL` & `TURSO_AUTH_TOKEN` (kredensial database Turso) beserta variabel lain yang dibutuhkan.

**2. Frontend** (berjalan di http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

Buka http://localhost:5173 di browser. Vite akan meneruskan permintaan `/api` ke backend.

## API

| Method | Endpoint                    | Keterangan                                   |
|--------|-----------------------------|----------------------------------------------|
| POST   | `/api/auth/register`        | Daftar warga (`username`, `password`, `full_name`) |
| POST   | `/api/auth/login`           | Masuk (`username`, `password`) → token JWT   |
| GET    | `/api/auth/me`              | Info pengguna saat ini (butuh token)         |
| GET    | `/api/stats`                | Statistik + tren + total dukungan + rating + metrik SLA (di-cache); dukung filter rentang tanggal `from` & `to` (format `YYYY-MM-DD`) |
| GET    | `/api/audit-logs`           | Riwayat audit aksi petugas — **khusus role `petugas`** |
| GET    | `/api/reports`              | Daftar laporan (`category`, `status`, `q`, `sort`, `page`, `limit`, `mine`, `deleted`, `needs_action`, `lat`, `lng`, `radius`) dengan paginasi; `q` memakai FTS5, `deleted=true` & `needs_action=true` khusus petugas |
| GET    | `/api/reports/duplicates`   | Cek laporan serupa (`category`, `lat`, `lng`, `radius`) untuk deteksi duplikat |
| GET    | `/api/reports/export`       | Unduh laporan sebagai CSV — **khusus role `petugas`** |
| GET    | `/api/reports/:id`          | Detail satu laporan (termasuk foto & jumlah komentar) |
| POST   | `/api/reports`              | Buat laporan baru (JSON atau multipart dengan `photos`); tertaut ke pengguna bila login |
| POST   | `/api/reports/:id/photos`   | Tambah foto pada laporan (multipart `photos`) |
| POST   | `/api/reports/:id/upvote`   | Dukung/batalkan dukungan — **wajib login** (satu akun satu suara) |
| GET    | `/api/reports/:id/comments` | Daftar komentar                              |
| POST   | `/api/reports/:id/comments` | Tambah komentar                              |
| GET    | `/api/reports/:id/history`  | Riwayat perubahan status                     |
| DELETE | `/api/reports/:id`          | Hapus (soft delete) laporan — **khusus role `petugas`** |
| PATCH  | `/api/reports/:id/restore`  | Pulihkan laporan terhapus — **khusus role `petugas`** |
| PATCH  | `/api/reports/:id/status`   | Ubah status — **khusus role `petugas`** (JWT) & catat riwayat |
| PATCH  | `/api/reports/:id/response` | Tanggapan resmi — **khusus role `petugas`**  |
| POST   | `/api/reports/:id/rating`   | Rating kepuasan (pelapor, laporan berstatus selesai) |
| PATCH  | `/api/reports/:id/assign`   | Tugaskan laporan ke petugas — **khusus role `petugas`** |
| GET    | `/api/users/petugas`        | Daftar petugas (untuk penugasan) — **khusus role `petugas`** |
| POST   | `/api/users/petugas`        | Tambah akun petugas (`username`, `password`, `full_name`) — **khusus role `admin`** |
| PATCH  | `/api/users/petugas/:id`    | Ubah data petugas (`username`, `full_name`) — **khusus role `admin`** |
| PATCH  | `/api/users/petugas/:id/password` | Reset kata sandi petugas — **khusus role `admin`** |
| DELETE | `/api/users/petugas/:id`    | Hapus akun petugas (laporan yang ditugaskan dilepas) — **khusus role `admin`** |
| GET    | `/api/officers/stats`       | Kinerja petugas (penugasan, selesai, dalam proses, rata-rata penyelesaian) — **khusus role `admin`** |

File foto disimpan di `server/uploads/` dan disajikan lewat `/uploads/<filename>`.

## Autentikasi

- Kata sandi disimpan sebagai **hash bcrypt** (`cost 12`, salt unik otomatis per pengguna).
- Setelah login/daftar, server menerbitkan **JWT** yang dikirim lewat header `Authorization: Bearer <token>`.
- Role `warga` dapat melaporkan, berkomentar, dan memberi dukungan; role `petugas` dapat mengubah status laporan; role `admin` mengelola akun petugas dan memantau kinerja.
- Akun petugas dibuat dari environment variable `PETUGAS_USERNAME` & `PETUGAS_PASSWORD`, dan akun admin dari `ADMIN_USERNAME` & `ADMIN_PASSWORD` (lihat `server/.env`).

## Catatan Keamanan (Produksi)

- `JWT_SECRET` **wajib** diatur melalui file `server/.env` (server akan menolak berjalan jika kosong). Gunakan nilai acak yang kuat.
- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PETUGAS_USERNAME`, dan `PETUGAS_PASSWORD` melalui file `server/.env` sebelum deploy.
- Set `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` (kredensial database Turso) di `server/.env`; server akan menolak berjalan jika `TURSO_DATABASE_URL` kosong.
- Set `BLOB_READ_WRITE_TOKEN` bila deploy ke Vercel agar foto tersimpan di Vercel Blob (tanpa ini foto disimpan ke disk lokal).
- CORS dibatasi ke origin tertentu lewat `CORS_ORIGIN` (dipisah koma, mis. `CORS_ORIGIN=https://laporwarga.example.com`). Default: `http://localhost:5173`.
- File `.env` tidak boleh di-commit ke repository (sudah tercantum di `.gitignore`).

## Deploy Produksi (HTTPS)

### 1. Frontend → Vercel
- Root directory: `client/` (sudah tersedia `client/vercel.json` untuk SPA fallback `/admin` & `/kelola`).
- Set environment variable di dashboard Vercel:
  - `VITE_API_URL=https://<backend-domain>/api`
- Build otomatis: `npm run build`, output di `dist/`.

### 2. Backend → Vercel (serverless + Turso + Vercel Blob)
Backend sudah disiapkan untuk deploy ke Vercel sebagai serverless function (`server/api/index.js`) dengan database Turso dan foto di Vercel Blob.

1. Buat project Vercel baru dengan **Root Directory: `server/`**.
2. Set environment variable di dashboard Vercel:
   - `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PETUGAS_USERNAME`, `PETUGAS_PASSWORD`
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `BLOB_READ_WRITE_TOKEN` (dari Vercel → Storage → Blob)
   - `CORS_ORIGIN=https://<frontend-domain>`
   - `TRUST_PROXY=1` (HTTPS diterminasi di proxy; HSTS sudah aktif via helmet)
3. Deploy. Semua request ke backend dirutekan ke satu serverless function lewat `server/vercel.json`.

> Tanpa `BLOB_READ_WRITE_TOKEN`, backend berjalan di dev lokal dan menyimpan foto ke folder `server/uploads/`.

### 3. Backend → Render / Railway / Fly.io / VPS (alternatif)
- Set environment variable: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PETUGAS_USERNAME`, `PETUGAS_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `CORS_ORIGIN=https://<frontend-domain>`, `TRUST_PROXY=1`.
- Persistent disk untuk folder `server/uploads/` (foto). Database tersimpan di Turso (cloud).

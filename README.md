# SEO Audit Tool

Web app di mana user memasukkan satu URL dan mendapat daftar temuan SEO teknis
yang bisa langsung ditindaklanjuti. Pembeda utamanya: membandingkan HTML mentah
dengan DOM hasil render, lalu menjelaskan artinya buat crawler.

Detail lengkap ada di [brd.md](brd.md), [prd.md](prd.md), dan [fsd.md](fsd.md).

## Struktur repo

```
.
├── api/             # backend (Go) — cmd/api, internal/{handler,fetcher,parser,rules,report,render}
├── render-service/  # headless Chromium (Node + Playwright) untuk kolom "Rendered"
└── web/             # frontend (Next.js)
```

## Menjalankan secara lokal

**Backend (Go)** — jalan di port `9721`

```bash
cd api
go run ./cmd/api
```

**Render service (Node + Playwright)**: jalan di port `9723`, opsional

```bash
cd render-service
npm install
npx playwright install chromium
npm start
```

Lalu set `RENDER_SERVICE_URL=http://localhost:9723` di `api/.env`.

Halaman metadata dikunci password: set `METADATA_PASSWORD` di `api/.env`
(sekali login berlaku 1 jam). Kalau tidak di-set, halaman itu terkunci total. Kalau tidak
di-set, halaman metadata tetap jalan tapi hanya menampilkan kolom HTML mentah.
Di Docker, `docker-compose.yml` sudah menjalankan service ini dan meng-set
URL-nya otomatis.

**Frontend (Next.js)** — jalan di port `9722`

```bash
cd web
npm install
npm run dev
```

Port bisa di-override lewat env var `PORT` (backend) atau flag `-p` di skrip `dev`/`start` (frontend).

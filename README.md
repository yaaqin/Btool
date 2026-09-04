# SEO Audit Tool

Web app di mana user memasukkan satu URL dan mendapat daftar temuan SEO teknis
yang bisa langsung ditindaklanjuti. Pembeda utamanya: membandingkan HTML mentah
dengan DOM hasil render, lalu menjelaskan artinya buat crawler.

Detail lengkap ada di [brd.md](brd.md), [prd.md](prd.md), dan [fsd.md](fsd.md).

## Struktur repo

```
.
├── cmd/api/          # entrypoint backend
├── internal/         # handler, fetcher, parser, rules, report
├── web/               # frontend (Next.js)
└── render-service/    # fase 2, belum ada
```

## Menjalankan secara lokal

**Backend (Go)** — jalan di port `9721`

```bash
go run ./cmd/api
```

**Frontend (Next.js)** — jalan di port `9722`

```bash
cd web
npm install
npm run dev
```

Port bisa di-override lewat env var `PORT` (backend) atau flag `-p` di skrip `dev`/`start` (frontend).

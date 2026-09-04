# PRD — SEO Audit Tool

**Product Requirements Document**
Status: Draft
Owner: Yaaqin
Stack: Next.js (frontend) + Go (backend)

---

## 1. Ringkasan produk

Web app di mana user memasukkan satu URL dan mendapat daftar temuan SEO teknis yang bisa langsung ditindaklanjuti, lengkap dengan cara memperbaikinya.

Pembeda utamanya: produk ini membandingkan HTML mentah dengan DOM hasil render, lalu menjelaskan artinya buat crawler. Bukan sekadar checklist.

## 2. Prinsip produk

**Tidak ada skor tunggal.** Angka agregat menyembunyikan informasi dan mendorong perilaku yang salah — persis masalah yang ada di skor SEO Lighthouse. Output-nya daftar temuan berurut dampak.

**Setiap temuan harus bisa ditindaklanjuti.** Kalau tidak bisa dijelaskan cara memperbaikinya, temuan itu tidak layak ditampilkan.

**Deteksi deterministik.** Rule-based, bukan LLM. Hasil harus identik untuk input yang sama. LLM boleh dipakai untuk menyusun penjelasan, tidak untuk mendeteksi.

**Jujur soal batasan.** Produk ini tidak mengukur ranking dan tidak boleh mengesankan begitu.

## 3. User stories

### Fase 1 — Raw audit

**US-1.** Sebagai developer, saya ingin memasukkan URL dan melihat semua isu SEO teknis di halaman itu, supaya saya tahu apa yang perlu diperbaiki sebelum deploy.

**US-2.** Sebagai developer, saya ingin tiap temuan menjelaskan *kenapa* itu masalah dan *bagaimana* memperbaikinya, supaya saya tidak perlu googling tiap istilah.

**US-3.** Sebagai developer, saya ingin temuan diurutkan berdasarkan dampak, supaya saya tahu mana yang harus dikerjakan duluan.

**US-4.** Sebagai developer, saya ingin melihat metadata mentah yang ditemukan (title, description, canonical, robots), supaya saya bisa memverifikasi sendiri tanpa percaya buta pada penilaian tool.

### Fase 2 — Rendered comparison

**US-5.** Sebagai developer, saya ingin tahu apakah konten halaman saya ada di HTML awal atau baru muncul setelah JavaScript jalan, supaya saya tahu apakah crawler bisa membacanya.

**US-6.** Sebagai developer, saya ingin melihat perbandingan berdampingan antara raw dan rendered, supaya saya bisa menunjukkan bukti konkret ke tim.

### Fase 3 — Sharing

**US-7.** Sebagai freelancer, saya ingin membagikan link hasil audit ke klien, supaya mereka bisa melihatnya tanpa perlu memakai tool-nya sendiri.

**US-8.** Sebagai developer, saya ingin mengakses hasil audit lewat API, supaya bisa saya masukkan ke CI pipeline.

## 4. Cakupan per fase

### Fase 1 — MVP

| Fitur | Keterangan |
|---|---|
| Input URL | Satu field, validasi format |
| Raw fetch + parse | HTTP GET, parse dengan goquery |
| Rule engine | ~20 rule (katalog lengkap di FSD) |
| Tampilan temuan | Dikelompokkan per severity, tiap item punya penjelasan + cara perbaiki |
| Tampilan fakta mentah | Metadata apa adanya, supaya bisa diverifikasi user |
| Cek `robots.txt` | Apakah halaman diblokir |
| Rate limiting | Per IP |

Target waktu analisis: **di bawah 3 detik.**

### Fase 2 — Rendered comparison

| Fitur | Keterangan |
|---|---|
| Render service | Playwright, service terpisah |
| Diff raw vs rendered | Title, description, canonical, jumlah konten, jumlah link |
| Verdict rendering | Klasifikasi: SSR penuh / hybrid / CSR penuh |
| Async job + progress | SSE atau polling, karena bisa 10-30 detik |

Dipisah ke service tersendiri karena karakteristik scaling-nya berbeda total: raw fetch ringan, rendering berat.

### Fase 3 — Sharing dan API

| Fitur | Keterangan |
|---|---|
| Permalink hasil | URL yang bisa dibagikan |
| Export | JSON, mungkin PDF |
| Public API | Dengan API key, untuk dipakai di CI |
| Riwayat audit | Butuh auth |

## 5. Alur user

```
1. User buka halaman utama, masukkan URL
2. Klik "Analyze"
3. Backend validasi URL (termasuk cek SSRF)
4. Fetch + parse + jalankan rule
5. Hasil tampil:

   ┌─ Ringkasan ─────────────────────────────┐
   │  3 Critical · 5 Warning · 2 Info        │
   └─────────────────────────────────────────┘

   ┌─ Fakta yang ditemukan ──────────────────┐
   │  Title       "AstraOtoshop"             │
   │  Description (tidak ada)                │
   │  Canonical   https://example.com        │
   │  Robots      (tidak ada)                │
   │  H1          1 ditemukan                │
   └─────────────────────────────────────────┘

   ┌─ CRITICAL ──────────────────────────────┐
   │  Canonical mengarah ke halaman lain     │
   │  ...penjelasan + cara perbaiki          │
   └─────────────────────────────────────────┘
```

Blok "Fakta yang ditemukan" ditampilkan sebelum temuan, bukan sesudah. User bisa memverifikasi sendiri sebelum membaca penilaian tool — ini yang membedakan tool yang bisa dipercaya dari tool yang cuma menyuruh.

## 6. Prioritas dan severity

Tiga level saja. Lebih dari itu jadi kabur.

| Level | Arti | Contoh |
|---|---|---|
| **Critical** | Menghalangi halaman diindeks atau dipahami | `noindex` tidak disengaja, canonical salah arah, status bukan 200, konten hanya ada setelah JS |
| **Warning** | Merugikan tapi tidak menghalangi | Description hilang, title kelewat panjang, gambar tanpa alt |
| **Info** | Layak diperhatikan, bukan masalah | Structured data tidak ada, anchor text generik, tidak ada OG tags |

Aturan penting: **`noindex` tidak selalu masalah.** Halaman hasil pencarian memang sebaiknya `noindex`. Tool harus mempertimbangkan konteks — kalau path mengandung pola `/search`, `/cari`, atau ada query parameter pencarian, `noindex` dilaporkan sebagai Info ("ini kemungkinan disengaja dan benar"), bukan Critical.

Salah menandai hal yang benar sebagai error akan menghancurkan kepercayaan lebih cepat daripada melewatkan satu isu.

## 7. Kebutuhan non-fungsional

| Aspek | Target |
|---|---|
| Waktu respons (raw) | < 3 detik p95 |
| Waktu respons (rendered) | < 30 detik, dengan indikator progres |
| Timeout fetch | 10 detik |
| Batas ukuran response | 5 MB |
| Rate limit | 10 audit per IP per menit |
| Uptime | Best effort |

**Keamanan** — proteksi SSRF adalah kebutuhan wajib, bukan opsional. Detail implementasi di FSD. Ini bagian yang paling sering dilewatkan orang saat membangun tool sejenis, dan konsekuensinya nyata: URL seperti `http://169.254.169.254/latest/meta-data/` bisa membocorkan credential cloud.

**Etika crawling** — hormati `robots.txt` situs target. Kirim User-Agent yang jelas mengidentifikasi tool ini beserta URL informasinya.

## 8. Yang sengaja tidak dibuat

- **Skor tunggal.** Sudah dijelaskan alasannya.
- **Akun dan login di fase 1.** Menambah friksi sebelum nilai produknya terbukti.
- **Crawl multi-halaman.** Fokus per-URL dulu. Screaming Frog sudah bagus untuk itu.
- **Rekomendasi yang di-generate LLM secara bebas.** Rekomendasi ditulis manual per rule. Konsisten, akurat, gratis.

## 9. Pertanyaan terbuka

- Apakah perbandingan rendered layak dipasang di fase 1 sebagai diferensiator, dengan risiko memperlambat MVP?
- Bagaimana menangani situs yang memblokir bot? (Cloudflare, dsb.)
- Apakah perlu menyimpan hasil audit di fase 1, atau cukup ephemeral?
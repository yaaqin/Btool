# BRD — SEO Audit Tool

**Business Requirements Document**
Status: Draft
Owner: Yaaqin

---

## 1. Latar belakang

Tool pengecekan SEO yang tersedia saat ini terbagi jadi dua kelompok, dan dua-duanya punya celah yang sama.

**Kelompok pertama — checker gratis** (berbagai "SEO analyzer" online). Mereka fetch HTML mentah lalu menampilkan checklist. Masalahnya: kalau situs target adalah SPA, mereka akan melaporkan "title tidak ditemukan" padahal title-nya di-inject JavaScript. Hasilnya false positive yang membingungkan.

**Kelompok kedua — Lighthouse dan turunannya.** Mereka menjalankan JavaScript dan mengaudit DOM hasil render. Akurat untuk apa yang mereka ukur, tapi tidak pernah memberi tahu apakah konten ada di HTML awal. Konsekuensinya terbalik: halaman CSR murni bisa dapat skor SEO 100 karena metadata-nya hardcoded di shell dan selalu ada, sementara halaman SSR dengan konten lengkap dapat 92 karena satu gambar tidak punya `alt`.

Kategori SEO Lighthouse terdiri dari 14 audit berbobot sama. Gagal 1 dari 14 = 92. Angkanya adalah hitungan checkbox, bukan gradasi kualitas — tapi hampir semua orang membacanya sebagai gradasi kualitas.

**Celah yang belum terisi: tidak ada tool yang menjawab "apa bedanya HTML mentah dengan hasil render, dan apa artinya buat crawler."** Padahal itu pertanyaan yang paling menentukan buat aplikasi modern.

## 2. Masalah yang diselesaikan

Developer yang membangun aplikasi React/Next.js tidak punya cara cepat untuk tahu apakah halaman mereka benar-benar bisa dibaca crawler.

Di Next.js App Router khususnya, sangat mudah merusak SSR tanpa sadar. Satu `dynamic(..., { ssr: false })`, satu fetch di dalam `useEffect`, satu guard `if (!mounted) return null` — halaman tetap tampil normal di browser. Tidak ada error, tidak ada warning. Skor Lighthouse tetap tinggi. Yang hilang cuma isi HTML-nya.

Masalah ini juga makin relevan seiring naiknya trafik dari AI agent dan crawler non-Google, yang sebagian besar tidak menjalankan JavaScript sama sekali.

## 3. Peluang

Diferensiasi produk ini ada di satu hal: **fetch dua kali, tampilkan selisihnya.**

```
Title      raw: "AstraOtoshop"    rendered: "Shell Advance AX7 | AstraOtoshop"
Konten     raw: 0 produk           rendered: 24 produk
Canonical  raw: (root)             rendered: (root)

→ Halaman ini butuh JavaScript untuk bisa dibaca.
  Googlebot mungkin bisa lewat rendering pass kedua, tapi telat dan
  tidak dijamin. Crawler lain dan AI agent kebanyakan tidak sama sekali.
```

Itu insight, bukan checklist. Dan setahu ini belum ada tool populer yang menyajikannya secara eksplisit.

## 4. Target user

**Primer — developer frontend** yang sedang membangun atau memigrasi aplikasi ke SSR. Mereka butuh verifikasi cepat setelah deploy, bukan laporan SEO 40 halaman.

**Sekunder — freelancer dan agensi kecil** yang perlu memberi laporan awal ke klien tanpa harus berlangganan Ahrefs atau Semrush.

**Bukan target:** tim SEO enterprise. Mereka butuh crawl skala besar, rank tracking, dan analisis backlink — wilayah Ahrefs, Semrush, dan Lumar. Bersaing di sana tidak masuk akal.

## 5. Batasan yang harus dinyatakan jujur ke user

Produk ini mengukur **hygiene teknis**, bukan "nilai SEO".

Ranking ditentukan oleh relevansi konten, intent match, otoritas domain, backlink, dan kekuatan kompetitor di SERP. Tidak satu pun bisa diukur dari satu URL.

Konsekuensi desain: **produk ini tidak menampilkan skor tunggal.** Menampilkan "SEO Score: 78" akan mengulangi persis kesalahan yang ingin diperbaiki. Output-nya adalah daftar temuan yang diurutkan berdasarkan dampak.

Keputusan ini akan terasa berlawanan dengan ekspektasi user (orang terbiasa dengan angka), dan perlu dikompensasi dengan ringkasan yang tetap mudah dicerna.

## 6. Kriteria sukses

**Fase awal (validasi):**
- Tool bisa menganalisis URL publik mana pun tanpa false positive pada aplikasi SPA
- Waktu analisis raw check di bawah 3 detik
- Dipakai sendiri secara rutin pada project nyata — kalau pembuatnya sendiri tidak memakainya, produknya belum berguna

**Fase berikutnya:**
- Perbandingan raw vs rendered berfungsi dan menghasilkan output yang bisa dipahami tanpa penjelasan tambahan
- Ada user di luar lingkaran sendiri yang kembali memakai lebih dari sekali

## 7. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **SSRF** — user memasukkan URL internal (`localhost`, `169.254.169.254`) untuk mengakses resource privat | Kritis. Bisa membocorkan credential cloud | Validasi ketat sebelum fetch, cek ulang di setiap redirect. Detail di FSD |
| Biaya rendering membengkak | Sedang | Rendering dipisah ke service terpisah, dibatasi rate limit dan quota |
| Disalahgunakan untuk scraping massal | Sedang | Rate limit per IP, hormati `robots.txt` situs target |
| Rekomendasi salah menyesatkan user | Sedang | Deteksi berbasis rule deterministik, bukan LLM. LLM hanya untuk menyusun penjelasan dari temuan yang sudah pasti |
| Produk jadi "checklist lain" | Tinggi (risiko produk) | Fokus diferensiasi pada raw vs rendered, bukan pada jumlah rule |

## 8. Di luar cakupan

- Rank tracking dan analisis kata kunci
- Analisis backlink
- Crawl seluruh situs (fokus per-URL)
- Penilaian kualitas konten
- Integrasi Google Search Console

Beberapa di antaranya mungkin masuk akal nanti. Tidak sekarang.
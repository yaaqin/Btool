// Content for /astra-otoshop — a public, read-only summary of the SEO
// recommendation for Astra Otoshop's Product Listing Page (PLP). Kept as
// data so the wording can be updated without touching the layout.
//
// Indonesian only: the audience (Astra Otoshop's PM, SEO, BE and FE teams)
// reads Indonesian, and the source document is Indonesian.

export const meta = {
  status: "Rekomendasi · untuk diskusi",
  date: "30 September 2026",
  title: "SEO untuk Halaman Produk Astra Otoshop",
  lead: "Menjadikan halaman daftar produk (PLP) sebagai pintu masuk utama traffic organik: setiap kombinasi kategori, kendaraan, dan brand yang bernilai bisnis punya satu halaman yang bisa ditemukan, dipahami, dan diranking Google, tanpa ribuan halaman duplikat dari kombinasi filter.",
  note: "Semua konsep di halaman ini adalah rekomendasi. Contoh URL, template, dan angka ambang batas bersifat usulan awal; wording final dan keputusan indexing ditentukan bersama tim SEO dan PM.",
};

export const searches = [
  "aki mobil avanza",
  "oli motor yamaha",
  "ban mobil innova",
  "kampas rem motor honda beat",
];

export const plpAdvantages = [
  {
    title: "Menjangkau long-tail keyword",
    body: "Kombinasi kategori × kendaraan × brand menghasilkan banyak halaman yang masing-masing menjawab satu intent pencarian yang spesifik.",
  },
  {
    title: "Konten selalu segar",
    body: "Daftar produk, harga, dan stok terus berubah. Google menyukai halaman yang aktif diperbarui.",
  },
  {
    title: "Jembatan ke halaman produk",
    body: "Satu PLP yang terindeks menautkan puluhan halaman produk, sehingga semuanya lebih cepat ditemukan dan ikut mendapat nilai SEO.",
  },
  {
    title: "Intent komersial tinggi",
    body: "Orang yang mencari \"aki mobil avanza\" sudah siap membeli, jadi peluang konversinya tinggi.",
  },
];

// Raw-HTML check of the current site (https://astraotoshop.com/find/ban).
export const currentState = {
  url: "astraotoshop.com/find/ban",
  rows: [
    { tag: "title", raw: "AstraOtoshop", note: "sama untuk semua halaman" },
    { tag: "description", raw: null, note: null },
    { tag: "robots", raw: null, note: null },
    { tag: "canonical", raw: null, note: null },
    { tag: "og:title / og:description", raw: null, note: null },
    { tag: "og:image", raw: null, note: "og:image:type/width/height ada, tapi og:image-nya kosong" },
  ],
  impacts: [
    {
      title: "Preview share kosong",
      body: "Link yang dibagikan di WhatsApp, Facebook, X, LinkedIn, dan Telegram hanya tampil sebagai \"AstraOtoshop\", tanpa deskripsi dan gambar.",
    },
    {
      title: "Crawler AI melihat halaman kosong",
      body: "GPTBot, ClaudeBot, PerplexityBot, dan sebagian search engine tidak menjalankan JavaScript, jadi tidak membaca metadata sama sekali.",
    },
    {
      title: "Google menganggap duplikat",
      body: "Google baru membaca metadata setelah render (tertunda), dan semua halaman listing mendapat title dan description yang sama.",
    },
  ],
};

export const principles = [
  {
    title: "Path = halaman yang ingin diindeks",
    body: "/products/{kategori}/{kendaraan}/{brand}. Setiap level menjawab pencarian yang makin spesifik.",
  },
  {
    title: "Query = state filter",
    body: "Filter harga, rating, atau sort tidak menjadi halaman baru. Pengecualian: brand tunggal atau kendaraan tunggal tanpa kategori menjadi PLP tersendiri.",
  },
  {
    title: "Satu konten = satu URL",
    body: "Variasi URL lain diarahkan lewat redirect, canonical, atau noindex, supaya nilai SEO tidak terpecah.",
  },
  {
    title: "Metadata unik, langsung dari server",
    body: "Title, description, dan preview share sudah ada di HTML pertama, bukan disuntik JavaScript setelah halaman dimuat.",
  },
  {
    title: "PLP sebagai hub internal link",
    body: "Beranda → Kategori → Kategori + Kendaraan → + Brand → Produk. Semakin dekat dan semakin banyak ditautkan, semakin cepat ditemukan.",
  },
];

export const urlLevels = [
  { level: "L0", example: "/products", answers: "sparepart mobil motor" },
  { level: "L1", example: "/products/aki", answers: "aki" },
  { level: "L2", example: "/products/aki/mobil", answers: "aki mobil" },
  { level: "L2", example: "/products/aki/gs-astra", answers: "aki gs astra" },
  { level: "L3", example: "/products/aki/mobil/gs-astra", answers: "aki mobil gs astra" },
  { level: "Brand", example: "/products?brand=gs-astra", answers: "produk gs astra" },
  { level: "Kendaraan", example: "/products?vehicle=toyota-avanza", answers: "sparepart avanza" },
];

export const beforeAfter = [
  { area: "Metadata terbaca crawler", before: "Hanya setelah JavaScript jalan; sama untuk semua halaman", after: "Ada di HTML pertama; unik per URL" },
  { area: "Halaman listing yang bisa diranking", before: "Praktis satu (semua listing ber-title sama)", after: "Satu per kombinasi kategori/kendaraan/brand yang bernilai" },
  { area: "Duplikasi konten", before: "Tinggi; variasi filter tidak dikontrol", after: "Terkendali lewat URL resmi, redirect, canonical, noindex" },
  { area: "Crawl budget", before: "Terbuang ke variasi filter", after: "Fokus ke URL indexable lewat sitemap" },
  { area: "Penemuan halaman produk", before: "Bergantung pada render JavaScript", after: "PLP terindeks menautkan produk langsung di HTML" },
  { area: "Tampilan di hasil Google", before: "Title generik, URL mentah", after: "Title spesifik, breadcrumb, deskripsi dengan harga" },
];

export const businessBenefits = [
  { title: "Traffic organik naik", body: "Setiap PLP bisa mendarat di pencarian long-tail yang sebelumnya tidak punya halaman yang cocok." },
  { title: "Biaya akuisisi turun", body: "Traffic organik tidak dibayar per klik, jadi ketergantungan pada Google Ads dan Meta Ads berkurang." },
  { title: "Konversi lebih tinggi", body: "Pengunjung mendarat langsung di daftar produk yang sesuai kebutuhannya, bukan di homepage." },
  { title: "CTR lebih tinggi", body: "Title dan description spesifik (dengan harga mulai dan kata \"original\") lebih menarik diklik dibanding \"AstraOtoshop\"." },
  { title: "Share lebih efektif", body: "Link PLP yang dibagikan di WhatsApp dan media sosial tampil dengan judul, deskripsi, dan gambar." },
  { title: "Terlihat di AI search", body: "Konten di HTML pertama bisa dibaca crawler AI yang tidak menjalankan JavaScript." },
  { title: "Kontrol di tangan tim SEO", body: "Metadata dan saklar indexable bisa diatur dari CMS tanpa perlu deploy frontend." },
];

export const teamImpact = [
  { team: "Backend", body: "Menyediakan slug resmi, metadata per entitas, dan (jangka menengah) endpoint resolver serta daftar URL untuk sitemap." },
  { team: "Frontend", body: "Logic metadata, redirect, dan whitelist parameter terpusat; request per halaman berkurang setelah slug diambil dari master data." },
  { team: "SEO & konten", body: "Menyusun template dan intro per kategori/brand, bisa bertahap mulai dari kategori dengan traffic tertinggi." },
  { team: "Infra", body: "Beban server lebih rendah setelah caching master data dan dedupe request." },
];

export const risks = [
  { risk: "Canonical hanya petunjuk; Google bisa memilih URL lain", mitigation: "Redirect ke slug resmi, internal link konsisten, sitemap hanya berisi bentuk resmi." },
  { risk: "Slug berubah setelah URL terindeks", mitigation: "Slug stabil dari backend; bila terpaksa berubah, slug lama di-redirect permanen." },
  { risk: "Terlalu banyak PLP tipis (produk sedikit)", mitigation: "Halaman dengan kurang dari 3 produk diberi noindex; saklar indexable per entitas." },
  { risk: "Hasil SEO tidak instan", mitigation: "Google perlu merayapi ulang, umumnya beberapa minggu sampai beberapa bulan. Pantau lewat KPI." },
];

export const kpis = [
  { kpi: "URL PLP berstatus Indexed", source: "Search Console → Pages", expect: "Naik, mendekati jumlah URL di sitemap" },
  { kpi: "\"Duplicate, Google chose different canonical\"", source: "Search Console → Pages", expect: "Turun" },
  { kpi: "Impressions & klik /products/*", source: "Search Console → Performance", expect: "Naik" },
  { kpi: "CTR rata-rata PLP", source: "Search Console → Performance", expect: "Naik setelah title/description spesifik" },
  { kpi: "Core Web Vitals PLP", source: "Search Console, PageSpeed Insights", expect: "\"Good\" untuk LCP, INP, CLS" },
  { kpi: "Sesi organik ke PLP & konversinya", source: "GA4 (landing page)", expect: "Naik" },
  { kpi: "Metadata di HTML mentah", source: "Tool cek metadata (Raw vs Rendered)", expect: "Kolom Raw terisi lengkap dan beda di tiap URL" },
];

export const phases = [
  { title: "Fondasi indexing", scope: "Aturan robots & canonical per bentuk URL, noindex untuk hasil kurang dari 3 produk, redirect urutan segment.", owner: "Frontend" },
  { title: "Metadata & konten", scope: "Template title/description/H1, preview share per PLP, breadcrumb, perbaikan structured data.", owner: "Frontend + SEO" },
  { title: "Metadata kategori dari backend", scope: "Metadata kategori dari CMS dipakai di halaman kategori, placeholder diisi di server.", owner: "Backend + Frontend" },
  { title: "Slug resmi & PLP Brand", scope: "Slug dari master data; halaman brand lintas kategori (/products?brand=…).", owner: "Backend + Frontend" },
  { title: "PLP Kendaraan", scope: "Master data model kendaraan; halaman per model (/products?vehicle=…).", owner: "Backend + Frontend" },
  { title: "Sitemap & resolver", scope: "Sitemap PLP dari daftar URL valid backend.", owner: "Backend + Frontend" },
];

export const openDecisions = [
  { q: "Halaman paginasi (?page=N) diindeks sendiri atau diarahkan ke halaman 1?", proposal: "Diindeks sendiri" },
  { q: "Level kendaraan yang diindeks: tipe (Mobil/Motor), merek, atau model?", proposal: "Model, begitu master data siap" },
  { q: "Backend bisa menyediakan slug resmi untuk kategori, brand, dan model kendaraan?", proposal: "Ya, dependensi utama" },
  { q: "Status redirect 308 diterima, atau wajib 301?", proposal: "308 diterima" },
  { q: "Wording template metadata per pola", proposal: "Draf disiapkan, final oleh tim SEO" },
  { q: "Override metadata per kombinasi, atau template saja?", proposal: "Template dulu" },
  { q: "Ambang minimum produk agar halaman diindeks", proposal: "3 produk" },
  { q: "Link filter yang noindex diberi rel=\"nofollow\"?", proposal: "Ya" },
  { q: "PLP Brand & Kendaraan masuk revisi FSD (v1.2)?", proposal: "Ya" },
];

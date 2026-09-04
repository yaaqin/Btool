# FSD — SEO Audit Tool

**Functional Specification Document**
Status: Draft
Owner: Yaaqin
Stack: Next.js (frontend) + Go (backend)

---

## 1. Arsitektur

```
┌──────────────┐
│   Next.js    │  UI, polling/SSE
└──────┬───────┘
       │ HTTP
┌──────▼───────────────────────────────┐
│           Go API                     │
│  ┌────────────────────────────────┐  │
│  │ handler/  — HTTP, validasi     │  │
│  │ fetcher/  — HTTP client + SSRF │  │
│  │ parser/   — goquery → facts    │  │
│  │ rules/    — facts → findings   │  │
│  │ report/   — urutkan, format    │  │
│  └────────────────────────────────┘  │
└──────┬───────────────────────────────┘
       │ (fase 2)
┌──────▼───────┐
│Render Service│  Playwright, Node
└──────────────┘
```

**Keputusan desain inti: pisahkan ekstraksi dari penilaian.**

`parser/` hanya mengambil fakta mentah — tidak menilai apa pun. `rules/` yang memutuskan apakah sebuah fakta bermasalah.

Konsekuensinya menguntungkan: menambah rule baru berarti menambah satu file di `rules/` tanpa menyentuh parser, dan setiap rule bisa di-unit-test dengan `PageFacts` buatan tanpa perlu jaringan sama sekali.

Render service dipisah karena karakteristik scaling-nya berbeda: raw fetch ringan dan bisa jalan di server kecil, rendering butuh Chrome dan RAM besar.

## 2. Model data

```go
type PageFacts struct {
    URL         string
    FinalURL    string        // setelah redirect
    StatusCode  int
    RedirectHops []string
    FetchedAt   time.Time
    Duration    time.Duration
    SizeBytes   int

    // Head
    Title       string
    Description string
    Canonical   string
    Robots      string
    Viewport    string
    HTMLLang    string
    Hreflang    []HreflangEntry
    OpenGraph   map[string]string

    // Body
    H1s         []string
    HeadingTree []Heading
    Images      []Image
    Links       []Link
    TextLength  int
    JSONLD      []json.RawMessage

    // Sinyal framework
    HasNextPayload bool   // self.__next_f
    HasNextData    bool   // __NEXT_DATA__
    Generator      string

    // Eksternal
    RobotsTxt   *RobotsTxtInfo
    SitemapURLs []string
}

type Image struct {
    Src      string
    Alt      *string  // nil = atribut tidak ada, "" = ada tapi kosong
    Loading  string
    Width    string
    Height   string
}

type Link struct {
    Href     string
    Text     string
    Rel      string
    IsAnchor bool  // <a> vs elemen dengan onclick
}
```

Perhatikan `Alt *string`. Membedakan "tidak ada atribut" dari "atribut kosong" itu penting — `alt=""` valid dan benar untuk gambar dekoratif, sedangkan atribut yang hilang adalah masalah. Kalau dipakai `string` biasa, dua kasus ini tidak bisa dibedakan.

## 3. Rule engine

```go
type Severity int

const (
    Info Severity = iota
    Warning
    Critical
)

type Finding struct {
    RuleID   string
    Severity Severity
    Title    string   // "Meta description tidak ditemukan"
    Detail   string   // apa yang ditemukan di halaman ini
    Why      string   // kenapa ini penting
    Fix      string   // cara memperbaiki, dengan contoh kode bila relevan
    Evidence string   // potongan HTML terkait
}

type Rule interface {
    ID() string
    Check(f *PageFacts) []Finding
}

type Registry struct{ rules []Rule }

func (r *Registry) Run(f *PageFacts) []Finding {
    var out []Finding
    for _, rule := range r.rules {
        out = append(out, rule.Check(f)...)
    }
    sort.SliceStable(out, func(i, j int) bool {
        return out[i].Severity > out[j].Severity
    })
    return out
}
```

## 4. Katalog rule (MVP)

### Metadata

| ID | Severity | Kondisi |
|---|---|---|
| `TITLE_MISSING` | Critical | `<title>` tidak ada atau kosong |
| `TITLE_TOO_LONG` | Warning | > 60 karakter |
| `TITLE_TOO_SHORT` | Warning | < 10 karakter |
| `DESC_MISSING` | Warning | `meta description` tidak ada |
| `DESC_LENGTH` | Info | di luar rentang 50–160 karakter |
| `CANONICAL_MISSING` | Info | tidak ada `rel=canonical` |
| `CANONICAL_MISMATCH` | Critical | canonical mengarah ke path berbeda dari URL yang diaudit |
| `CANONICAL_RELATIVE` | Warning | canonical memakai URL relatif |

`CANONICAL_MISMATCH` adalah rule paling bernilai di daftar ini. Canonical yang di-hardcode ke root adalah bug yang umum terjadi di aplikasi SSR, dan efeknya fatal — semua halaman menyatakan diri sebagai duplikat homepage, sehingga tidak ada yang terindeks. Lighthouse tidak menandainya karena canonical-nya valid secara sintaks.

Kecuali: jangan tandai kalau canonical mengarah ke versi non-trailing-slash atau non-www dari URL yang sama.

### Indexability

| ID | Severity | Kondisi |
|---|---|---|
| `HTTP_STATUS_NOT_OK` | Critical | status bukan 2xx |
| `ROBOTS_NOINDEX` | Critical / Info | ada `noindex` — lihat catatan konteks |
| `ROBOTS_TXT_BLOCKS` | Critical | `robots.txt` memblokir path ini |
| `REDIRECT_CHAIN` | Warning | lebih dari 2 hop |
| `REDIRECT_TO_ROOT` | Warning | path non-root redirect ke root (soft 404) |

**Catatan konteks untuk `ROBOTS_NOINDEX`:** kalau path mengandung `/search`, `/cari`, `/hasil-pencarian`, atau ada query parameter pencarian, laporkan sebagai **Info** dengan pesan bahwa ini kemungkinan disengaja dan benar. Halaman hasil pencarian memang sebaiknya `noindex`.

Salah menandai hal yang benar sebagai error merusak kepercayaan lebih cepat daripada melewatkan satu isu.

### Struktur konten

| ID | Severity | Kondisi |
|---|---|---|
| `H1_MISSING` | Warning | tidak ada `<h1>` |
| `H1_MULTIPLE` | Info | lebih dari satu `<h1>` |
| `H1_EMPTY` | Warning | `<h1>` ada tapi kosong atau hanya tanda baca |
| `HEADING_SKIP` | Info | lompat level (h1 → h3) |
| `THIN_CONTENT` | Info | teks < 300 karakter |

`H1_EMPTY` menangkap kasus seperti heading `Hasil pencarian ""` saat query kosong — secara teknis ada, secara makna kosong.

### Gambar

| ID | Severity | Kondisi |
|---|---|---|
| `IMG_ALT_MISSING` | Warning | atribut `alt` tidak ada |
| `IMG_ALT_EMPTY` | Info | `alt=""` — sah untuk gambar dekoratif |
| `IMG_ALT_GENERIC` | Info | alt berupa `image`, `photo`, `product`, atau nama file |
| `IMG_NO_DIMENSIONS` | Warning | tidak ada `width`/`height` — penyebab CLS |

### Link

| ID | Severity | Kondisi |
|---|---|---|
| `LINK_NOT_CRAWLABLE` | Warning | elemen navigasi memakai `onclick` tanpa `href` |
| `LINK_GENERIC_TEXT` | Info | anchor text berupa "klik di sini", "selengkapnya", "baca", "read more" |
| `LINK_EMPTY_TEXT` | Warning | `<a>` tanpa teks dan tanpa `aria-label` |

### Mobile dan aksesibilitas

| ID | Severity | Kondisi |
|---|---|---|
| `VIEWPORT_MISSING` | Critical | tidak ada `meta viewport` |
| `VIEWPORT_BLOCKS_ZOOM` | Warning | ada `user-scalable=no` atau `maximum-scale` ≤ 1 |
| `HTML_LANG_MISSING` | Warning | `<html>` tanpa atribut `lang` |

`VIEWPORT_BLOCKS_ZOOM` sering luput dari perhatian tapi berdampak nyata bagi user dengan gangguan penglihatan.

### Structured data

| ID | Severity | Kondisi |
|---|---|---|
| `SCHEMA_MISSING` | Info | tidak ada JSON-LD |
| `SCHEMA_INVALID` | Warning | JSON-LD tidak bisa di-parse |
| `SCHEMA_PRODUCT_INCOMPLETE` | Info | Product schema tanpa `image`, `price`, atau `name` |

### Fase 2 — rendering

| ID | Severity | Kondisi |
|---|---|---|
| `CONTENT_REQUIRES_JS` | Critical | teks rendered jauh lebih banyak dari raw |
| `TITLE_ONLY_RENDERED` | Critical | title berbeda antara raw dan rendered |
| `LINKS_ONLY_RENDERED` | Critical | link hanya muncul setelah render |
| `META_ONLY_RENDERED` | Warning | description hanya muncul setelah render |

## 5. Proteksi SSRF

Ini kebutuhan wajib. Implementasi minimal:

```go
func ValidateURL(raw string) (*url.URL, error) {
    u, err := url.Parse(raw)
    if err != nil {
        return nil, ErrInvalidURL
    }
    if u.Scheme != "http" && u.Scheme != "https" {
        return nil, ErrSchemeNotAllowed
    }
    if u.Hostname() == "" {
        return nil, ErrInvalidURL
    }

    ips, err := net.LookupIP(u.Hostname())
    if err != nil {
        return nil, ErrDNSFailed
    }
    for _, ip := range ips {
        if isBlockedIP(ip) {
            return nil, ErrPrivateAddress
        }
    }
    return u, nil
}

func isBlockedIP(ip net.IP) bool {
    return ip.IsLoopback() ||
        ip.IsPrivate() ||
        ip.IsLinkLocalUnicast() ||     // 169.254.x — metadata cloud
        ip.IsLinkLocalMulticast() ||
        ip.IsUnspecified() ||
        ip.Equal(net.IPv4bcast)
}
```

**Validasi saja tidak cukup.** Dua hal berikut wajib ada:

**Cek ulang di setiap redirect.** Penyerang bisa memakai domain publik yang me-redirect ke alamat internal. Validasi awal akan lolos.

```go
client := &http.Client{
    Timeout: 10 * time.Second,
    CheckRedirect: func(req *http.Request, via []*http.Request) error {
        if len(via) >= 5 {
            return ErrTooManyRedirects
        }
        if _, err := ValidateURL(req.URL.String()); err != nil {
            return err
        }
        return nil
    },
}
```

**Batasi ukuran response:**

```go
body := io.LimitReader(resp.Body, 5<<20) // 5 MB
```

Masih ada celah TOCTOU secara teori (DNS bisa berubah antara validasi dan koneksi). Untuk mitigasi penuh, gunakan `DialContext` kustom yang memeriksa IP saat koneksi dibuat. Untuk fase awal, pendekatan di atas sudah memadai.

## 6. API

### `POST /api/v1/audits`

```json
{ "url": "https://example.com/product/abc", "render": false }
```

Respons `202`:

```json
{ "id": "aud_01HXYZ", "status": "pending" }
```

### `GET /api/v1/audits/{id}`

```json
{
  "id": "aud_01HXYZ",
  "status": "completed",
  "url": "https://example.com/product/abc",
  "final_url": "https://example.com/product/abc",
  "fetched_at": "2026-09-04T10:30:00Z",
  "duration_ms": 842,
  "summary": { "critical": 2, "warning": 4, "info": 3 },
  "facts": {
    "title": "AstraOtoshop",
    "description": null,
    "canonical": "https://example.com",
    "robots": null,
    "h1_count": 1,
    "img_total": 24,
    "img_without_alt": 0,
    "status_code": 200
  },
  "findings": [
    {
      "rule_id": "CANONICAL_MISMATCH",
      "severity": "critical",
      "title": "Canonical mengarah ke halaman lain",
      "detail": "Canonical di halaman ini menunjuk ke https://example.com, padahal URL halaman adalah /product/abc.",
      "why": "Canonical memberi tahu mesin pencari halaman mana yang dianggap versi utama. Karena mengarah ke homepage, halaman ini menyatakan dirinya duplikat dan tidak akan diindeks tersendiri.",
      "fix": "Set canonical per halaman. Di Next.js App Router, gunakan metadataBase di root layout lalu alternates.canonical relatif di tiap halaman.",
      "evidence": "<link rel=\"canonical\" href=\"https://example.com\"/>"
    }
  ]
}
```

Blok `facts` disajikan terpisah dari `findings` dan ditampilkan lebih dulu di UI. User bisa memverifikasi sendiri sebelum membaca penilaian tool.

### `GET /api/v1/audits/{id}/stream`

SSE untuk fase 2. Event: `progress`, `finding`, `done`, `error`.

## 7. Struktur project

```
seo-tool/
├── cmd/api/main.go
├── internal/
│   ├── handler/
│   ├── fetcher/
│   │   ├── client.go
│   │   ├── validate.go        # SSRF
│   │   └── robotstxt.go
│   ├── parser/
│   │   ├── parser.go
│   │   └── facts.go
│   ├── rules/
│   │   ├── registry.go
│   │   ├── metadata.go
│   │   ├── indexability.go
│   │   ├── content.go
│   │   ├── images.go
│   │   ├── links.go
│   │   └── mobile.go
│   └── report/
├── web/                       # Next.js
└── render-service/            # fase 2
```

Dependensi Go: `goquery`, `golang.org/x/sync/errgroup`, `chi` atau `echo`.

## 8. Concurrency

Satu audit melakukan beberapa fetch yang tidak saling bergantung. Jalankan paralel dengan `errgroup`:

```go
g, ctx := errgroup.WithContext(ctx)
var page, robots, sitemap []byte

g.Go(func() error { var e error; page, e = fetch(ctx, u); return e })
g.Go(func() error { robots, _ = fetch(ctx, robotsURL); return nil })
g.Go(func() error { sitemap, _ = fetch(ctx, sitemapURL); return nil })

if err := g.Wait(); err != nil {
    return nil, err
}
```

`robots.txt` dan sitemap tidak mengembalikan error karena ketiadaannya bukan kegagalan audit — cukup dicatat sebagai temuan Info.

Total waktu jadi setara request terlambat, bukan penjumlahan semuanya.

## 9. Testing

Karena parsing dan penilaian terpisah, rule bisa diuji tanpa jaringan:

```go
func TestCanonicalMismatch(t *testing.T) {
    facts := &PageFacts{
        URL:       "https://example.com/product/abc",
        Canonical: "https://example.com",
    }
    findings := rules.CanonicalRule{}.Check(facts)

    require.Len(t, findings, 1)
    assert.Equal(t, "CANONICAL_MISMATCH", findings[0].RuleID)
    assert.Equal(t, Critical, findings[0].Severity)
}
```

Siapkan juga fixture HTML nyata untuk uji parser — minimal satu SPA shell dan satu halaman SSR penuh.

## 10. Urutan pengerjaan

1. `fetcher/` dengan validasi SSRF — **kerjakan ini pertama**, jangan ditunda ke belakang
2. `parser/` menghasilkan `PageFacts`
3. `rules/` untuk metadata dan indexability (nilai tertinggi per usaha)
4. Endpoint sinkron sederhana, tanpa job queue
5. UI Next.js minimal
6. Sisa rule
7. Job queue async
8. Render service
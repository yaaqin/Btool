// Content for /seo-development — a sandbox that shows the expected SEO
// output (title, description, robots, canonical, internal links) for an
// Astra Otopart /products URL, given a mocked listing response. Kept as
// data so slugs, sort options and wording can change without touching the
// rules in lib/seo-development.ts.
//
// Indonesian only, like /astra-otoshop: the audience is the Astra team.

export const SITE_NAME = "Astra Otopart";

// Known slugs. A path segment is classified as vehicle or brand by looking
// it up here, which is how /products/aki/gs-astra (brand) is told apart
// from /products/aki/toyota-avanza (vehicle).
export const categories: Record<string, string> = {
  aki: "Aki",
  oli: "Oli",
  ban: "Ban",
  "kampas-rem": "Kampas Rem",
  busi: "Busi",
};

export const vehicles: Record<string, string> = {
  "toyota-avanza": "Toyota Avanza",
  "toyota-innova": "Toyota Innova",
  "daihatsu-xenia": "Daihatsu Xenia",
  "honda-beat": "Honda Beat",
  "yamaha-nmax": "Yamaha NMAX",
};

export const brands: Record<string, string> = {
  "gs-astra": "GS Astra",
  incoe: "Incoe",
  aspira: "Aspira",
  "federal-oil": "Federal Oil",
  "shell-helix": "Shell Helix",
};

// Same order and labels as the "Urutkan" dropdown on the site.
export const sortOptions = [
  { value: "terlaris", label: "Terlaris" },
  { value: "terpopuler", label: "Terpopuler" },
  { value: "harga-terendah", label: "Harga Terendah" },
  { value: "harga-tertinggi", label: "Harga Tertinggi" },
  { value: "terbaru", label: "Terbaru" },
];

// Mocked listing response the page starts with; every field is editable.
export const initialResponse = {
  totalProducts: 25,
  outOfStock: 5,
  minPrice: 250000,
  topBrands: "GS Astra, Incoe",
};

export const initialPath = "/products/aki/toyota-avanza";

// Paths from the case-scenario sheet, one click away.
export const examplePaths = [
  "/products",
  "/products?page=2",
  "/products/aki",
  "/products/aki/gs-astra",
  "/products/aki/toyota-avanza",
  "/products/aki/toyota-avanza/gs-astra",
  "/products/aki/toyota-avanza?page=2&sort=terlaris",
  "/products/aki/gs-astra?vehicle=toyota-avanza",
  "/products/aki?brand=incoe",
  "/products/aki?brand=incoe,gs-astra",
  "/products?brand=incoe",
  "/products?brand=incoe&category=aki",
  "/products?search=aki",
  "/products/tidak-ada",
];

// Rules for /seo-development: given a /products path and a mocked listing
// response, work out the SEO output the page is expected to serve. Pure
// functions only, so the same rules can be lifted into the real frontend.

import {
  SITE_NAME,
  brands,
  categories,
  sortOptions,
  vehicles,
} from "@/content/seo-development";

export type Thresholds = {
  // Longest title allowed before words are dropped. Search titles are exempt.
  titleMaxLength: number;
  // Fewest products a page needs to be indexable.
  minProducts: number;
  // Share of in-stock products (0–100) a page needs to be indexable.
  minInStockPercent: number;
};

export type ListingResponse = {
  totalProducts: number;
  outOfStock: number;
  minPrice: number;
  topBrands: string;
};

// "-" = no robots decision of its own: the URL is a variant and defers to
// its canonical (same as the case-scenario sheet).
export type IndexStatus = "index" | "noindex" | "-";

export type PageKind = "search" | "products" | "brand" | "vehicle" | "leveling";
export type TitleTemplate = "products" | "brand" | "leveling" | "search";
export type DescriptionTemplate =
  | "products"
  | "category"
  | "vehicle"
  | "categoryBrand"
  | "brand"
  | "search";

// Notes and errors are returned as keys + params, not sentences, so the UI
// can show them in the viewer's language. The generated title/description
// stay Indonesian: they're the site's own content.
export type NoteKey =
  | "invalidPage"
  | "unknownSort"
  | "search"
  | "tooManySegments"
  | "unknownCategory"
  | "wrongOrder"
  | "unknownSegment"
  | "categoryQueryIgnored"
  | "categoryQueryPromoted"
  | "unknownVehicle"
  | "unknownBrand"
  | "multiValue"
  | "comboWithoutCategory"
  | "indexRule"
  | "sortVariant"
  | "pageOneVariant"
  | "variant"
  | "titleWordsDropped"
  | "titleStillLong";

export type Note = { key: NoteKey; params?: Record<string, string | number> };

export type PathError = "mustStartWithSlash" | "productsOnly";

export type Expected = {
  kind: PageKind;
  // Leveling depth: 1 = category, 2 = + vehicle or brand, 3 = all three.
  level: number;
  title: string;
  titleTemplate: TitleTemplate;
  titleLimitApplies: boolean;
  droppedWords: string[];
  description: string;
  descriptionTemplate: DescriptionTemplate;
  index: IndexStatus;
  follow: "follow";
  canonical: string;
  canonicalIsSelf: boolean;
  internalLink: boolean;
  // Why the result came out the way it did, in reading order.
  notes: Note[];
};

const PRODUCTS = "/products";
// Words the title may lose, in the order they're dropped, to fit the limit.
const DROPPABLE_TITLE_WORDS = ["Berkualitas", "Jual"];

export function validatePath(path: string): PathError | null {
  if (!path.startsWith("/")) return "mustStartWithSlash";
  if (!/^\/products(?=$|[/?])/.test(path)) return "productsOnly";
  return null;
}

function splitPath(path: string): [string, string] {
  const i = path.indexOf("?");
  return i === -1 ? [path, ""] : [path.slice(0, i), path.slice(i + 1)];
}

// URLSearchParams.toString() would escape the comma in brand=a,b; keep it
// readable since that's how the URLs are written on the site.
function serializeQuery(params: URLSearchParams): string {
  const parts: string[] = [];
  params.forEach((value, key) => {
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%2C/gi, ",")}`
    );
  });
  return parts.join("&");
}

export function getQueryParam(path: string, key: string): string | null {
  return new URLSearchParams(splitPath(path)[1]).get(key);
}

// Sets (or, with null, removes) one query param, keeping the others and
// their order as the user typed them.
export function setQueryParam(path: string, key: string, value: string | null): string {
  const [pathname, query] = splitPath(path);
  const params = new URLSearchParams(query);
  if (value === null) params.delete(key);
  else params.set(key, value);
  const next = serializeQuery(params);
  return next ? `${pathname}?${next}` : pathname;
}

// Page number from the path; anything missing or invalid counts as page 1.
export function getPage(path: string): number {
  const raw = getQueryParam(path, "page");
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function humanize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatRupiah(value: number): string {
  return `Rp${Math.max(0, Math.round(value)).toLocaleString("id-ID")}`;
}

// Rounds the in-stock count down to 20, 50, 100, 150, then every 50, so the
// description doesn't change on every stock movement. 20 or fewer → no
// number at all.
function choiceBucket(inStock: number): number | null {
  if (inStock <= 20) return null;
  if (inStock < 50) return 20;
  if (inStock < 100) return 50;
  return Math.floor(inStock / 50) * 50;
}

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function withPage(path: string, page: number): string {
  if (page < 2) return path;
  return `${path}${path.includes("?") ? "&" : "?"}page=${page}`;
}

// The one official URL for a category/vehicle/brand combination:
// /products/{kategori}/{kendaraan}/{brand}, or a query PLP when there's no
// category.
function officialPath(category?: string, vehicle?: string, brand?: string): string {
  if (category) return [PRODUCTS, category, vehicle, brand].filter(Boolean).join("/");
  if (brand) return `${PRODUCTS}?brand=${brand}`;
  if (vehicle) return `${PRODUCTS}?vehicle=${vehicle}`;
  return PRODUCTS;
}

function buildTitle(
  words: string[],
  page: number,
  maxLength: number | null
): { title: string; dropped: string[] } {
  const suffix = `${page >= 2 ? ` Halaman ${page}` : ""} | ${SITE_NAME}`;
  let current = words;
  const dropped: string[] = [];
  const compose = () => current.join(" ") + suffix;

  if (maxLength !== null) {
    for (const word of DROPPABLE_TITLE_WORDS) {
      if (compose().length <= maxLength) break;
      if (!current.includes(word)) continue;
      current = current.filter((w) => w !== word);
      dropped.push(word);
    }
  }
  return { title: compose(), dropped };
}

export function resolveExpected(
  path: string,
  response: ListingResponse,
  thresholds: Thresholds
): Expected {
  const notes: Note[] = [];
  const [rawPathname, query] = splitPath(path);
  const params = new URLSearchParams(query);
  const page = getPage(path);
  const price = formatRupiah(response.minPrice);
  const inStock = Math.max(0, response.totalProducts - response.outOfStock);
  const descPage = page >= 2 ? ` (Halaman ${page})` : "";

  const rawPage = params.get("page");
  if (rawPage !== null && String(page) !== rawPage) {
    notes.push({ key: "invalidPage", params: { value: rawPage } });
  }
  const sort = params.get("sort");
  if (sort !== null && !sortOptions.some((o) => o.value === sort)) {
    notes.push({ key: "unknownSort", params: { value: sort } });
  }

  // Search wins over everything else: it's a free-text result list, not a
  // PLP, so it never gets its own canonical.
  const search = params.get("search")?.trim();
  if (search) {
    const title = `Pencarian ${titleCase(search)}${page >= 2 ? ` Halaman ${page}` : ""} | ${SITE_NAME}`;
    notes.push({ key: "search" });
    return {
      kind: "search",
      level: 0,
      title,
      titleTemplate: "search",
      titleLimitApplies: false,
      droppedWords: [],
      description: `Hasil pencarian untuk ${search}. Temukan produk dan sparepart original pilihan terbaik dengan garansi resmi hanya di ${SITE_NAME}.${descPage}`,
      descriptionTemplate: "search",
      index: "-",
      follow: "follow",
      canonical: PRODUCTS,
      canonicalIsSelf: path === PRODUCTS,
      internalLink: false,
      notes,
    };
  }

  // --- Work out the category / vehicle / brand the URL asks for. ---
  const segments = rawPathname.split("/").filter(Boolean).slice(1);
  let category: string | undefined;
  const pathVehicles: string[] = [];
  const pathBrands: string[] = [];

  if (segments.length > 3) {
    notes.push({ key: "tooManySegments" });
  }
  segments.slice(0, 3).forEach((seg, i) => {
    if (i === 0) {
      category = seg;
      if (!categories[seg]) {
        notes.push({ key: "unknownCategory", params: { slug: seg } });
      }
      return;
    }
    if (vehicles[seg]) {
      if (pathBrands.length) {
        notes.push({ key: "wrongOrder" });
      }
      pathVehicles.push(seg);
    } else if (brands[seg]) {
      pathBrands.push(seg);
    } else {
      notes.push({ key: "unknownSegment", params: { slug: seg } });
    }
  });

  const queryCategory = params.get("category");
  if (queryCategory) {
    if (category) {
      notes.push({ key: "categoryQueryIgnored" });
    } else {
      category = queryCategory;
      notes.push({ key: "categoryQueryPromoted", params: { slug: queryCategory } });
    }
  }

  const vehicleList = unique([...pathVehicles, ...splitList(params.get("vehicle"))]);
  const brandList = unique([...pathBrands, ...splitList(params.get("brand"))]);
  for (const v of vehicleList) {
    if (!vehicles[v]) notes.push({ key: "unknownVehicle", params: { slug: v } });
  }
  for (const b of brandList) {
    if (!brands[b]) notes.push({ key: "unknownBrand", params: { slug: b } });
  }

  // Several values for one filter, or brand + vehicle with no category,
  // have no PLP of their own: noindex, canonical to the nearest real PLP.
  const multiValue = vehicleList.length > 1 || brandList.length > 1;
  const comboWithoutCategory = !category && vehicleList.length > 0 && brandList.length > 0;
  const vehicle = vehicleList.length === 1 && !comboWithoutCategory ? vehicleList[0] : undefined;
  const brand = brandList.length === 1 && !comboWithoutCategory ? brandList[0] : undefined;

  let canonical: string;
  let index: IndexStatus;

  if (multiValue || comboWithoutCategory) {
    canonical = officialPath(category, vehicle, brand);
    index = "noindex";
    notes.push({ key: multiValue ? "multiValue" : "comboWithoutCategory" });
  } else {
    canonical = withPage(officialPath(category, vehicle, brand), page);
    if (canonical === path) {
      const okCount = response.totalProducts >= thresholds.minProducts;
      const stockPercent = response.totalProducts > 0 ? (inStock / response.totalProducts) * 100 : 0;
      const okStock = stockPercent >= thresholds.minInStockPercent;
      index = okCount && okStock ? "index" : "noindex";
      notes.push({
        key: "indexRule",
        params: {
          total: response.totalProducts,
          totalOp: okCount ? "≥" : "<",
          minProducts: thresholds.minProducts,
          stock: Math.round(stockPercent),
          stockOp: okStock ? "≥" : "<",
          minStock: thresholds.minInStockPercent,
          index,
        },
      });
    } else {
      index = "-";
      if (sort !== null) notes.push({ key: "sortVariant" });
      if (rawPage === "1") notes.push({ key: "pageOneVariant" });
      notes.push({ key: "variant" });
    }
  }

  // --- Metadata, built from the canonical entities. ---
  const catName = category ? (categories[category] ?? humanize(category)) : undefined;
  const vehicleName = vehicle ? (vehicles[vehicle] ?? humanize(vehicle)) : undefined;
  const brandName = brand ? (brands[brand] ?? humanize(brand)) : undefined;
  const catLower = (catName ?? "Sparepart").toLowerCase();

  let kind: PageKind;
  let level = 0;
  let titleWords: string[];
  let titleTemplate: TitleTemplate;
  let description: string;
  let descriptionTemplate: DescriptionTemplate;

  if (!category && !vehicleName && !brandName) {
    kind = "products";
    titleWords = ["Produk", "Otomotif", "Original"];
    titleTemplate = "products";
    description = `Temukan produk dan sparepart original pilihan terbaik dengan garansi resmi hanya di ${SITE_NAME}.`;
    descriptionTemplate = "products";
  } else if (!category && brandName) {
    kind = "brand";
    titleWords = ["Jual", "Produk", brandName, "Berkualitas", "Original"];
    titleTemplate = "brand";
    description = `Belanja produk ${brandName} original untuk mobil dan motor. Bergaransi resmi, mulai ${price}.`;
    descriptionTemplate = "brand";
  } else {
    kind = category ? "leveling" : "vehicle";
    level = category ? [category, vehicleName, brandName].filter(Boolean).length : 0;
    titleWords = ["Jual", catName ?? "Sparepart", vehicleName, brandName, "Berkualitas", "Original"].filter(
      (w): w is string => Boolean(w)
    );
    titleTemplate = "leveling";

    const bucket = choiceBucket(inStock);
    if (vehicleName) {
      const choices = bucket ? `${bucket}+ ${catLower}` : catLower;
      description = `Cari ${catLower}${brandName ? ` ${brandName}` : ""} untuk ${vehicleName.toLowerCase()}? Pilih ${choices} original sesuai spesifikasi, bergaransi resmi, mulai ${price}.`;
      descriptionTemplate = "vehicle";
    } else if (brandName) {
      const choices = bucket ? `${bucket}+ pilihan` : "Pilihan";
      description = `Beli ${catLower} ${brandName} original. ${choices} bergaransi resmi, mulai ${price}.`;
      descriptionTemplate = "categoryBrand";
    } else {
      const topBrands = response.topBrands.trim();
      description = `Belanja ${catLower} original untuk mobil dan motor${topBrands ? `: ${topBrands}, dan lainnya` : ""}. Bergaransi resmi, mulai ${price}.`;
      descriptionTemplate = "category";
    }
  }

  const { title, dropped } = buildTitle(titleWords, page, thresholds.titleMaxLength);
  if (dropped.length) {
    notes.push({
      key: "titleWordsDropped",
      params: { max: thresholds.titleMaxLength, words: dropped.join(", ") },
    });
  }
  if (title.length > thresholds.titleMaxLength) {
    notes.push({ key: "titleStillLong", params: { length: title.length } });
  }

  return {
    kind,
    level,
    title,
    titleTemplate,
    titleLimitApplies: true,
    droppedWords: dropped,
    description: description + descPage,
    descriptionTemplate,
    index,
    follow: "follow",
    canonical,
    canonicalIsSelf: canonical === path,
    // Only leveling pages and brand PLPs link out to deeper listings.
    internalLink: Boolean(category) || brandList.length > 0,
    notes,
  };
}

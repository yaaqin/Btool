# Developer Guide Frontend

Document ini dibuat sebagai **Standar Wajib** dalam melakukan development atau bug fixing di web frontend **AOSB2C**. Dokumen ini bersifat living document dan akan diperbarui sesuai kebutuhan tim.

> Versi ini adalah gabungan dari v1 (struktur dasar) dan v2 (penegasan & celah aturan yang ditemukan dari review PR PLP — filter sidebar, pagination, listing view). Semua poin v2 sudah disisipkan ke section yang relevan, bukan sekadar ditempel di akhir.

---

## Project Structure

```
src/
├── app
|   ├── [locale]
|   |   └── (main)
|   |       ├── _components/
|   |       ├── _loaders/
|   |       ├── page.tsx
|   |       └── layout.tsx
|   └── layout.tsx
├── components
|   ├── layout/
|   ├── providers/
|   └── ui/
├── configs/
|   ├── client/
|   └── server/
├── features/
├── i18n/
|   ├── navigation.ts
|   ├── request.ts
|   └── routing.ts
├── libs/
├── utils/
└── proxy.ts
```

---

## Flow Request API

### Flow Untuk Client Component

```
API Backend -> Feature API -> Feature Service -> Route Handler -> Client Component
```

**Note:**

- Feature API disini ada di `features/domain-name/api`
- Feature Service disini ada di `features/domain-name/services`
- Route handler adalah api internal next js di `app/api`
- Bisa melihat contoh api location detail sebagai referensi

### Flow Untuk Server Component

```
API Backend -> Feature API -> Feature Service -> Loader -> Server Component
```

**Note:**

- Feature API disini ada di `features/domain-name/api`
- Feature Service disini ada di `features/domain-name/services`
- Loader ada di `**/_loaders`
- Bisa melihat contoh api footer sebagai referensi

---

## How To Create Component

### Structure

```
components/
├── button/
|   ├── _components/
|   ├── button.stories.tsx
|   ├── button.test.tsx
|   ├── Button.tsx
|   ├── button.types.ts
|   ├── button.helper.ts        <-- opsional, dibuat kalau ada pure function derive/transform
|   ├── use-button.ts           <-- opsional, dibuat kalau ada state
|   └── index.ts
└── index.ts
```

**Note:**

- Semua component harus mengikuti structure diatas
- `*.helper.ts` dan `use-*.ts` sifatnya opsional — dibuat kalau memang dibutuhkan, sama seperti `_components`

### File Component

```JS
import type { TButtonProps } from './button.types';
import useButton from './use-button';

export function Button(props: TButtonProps) {
  const { label } = props;
  const { onClick } = useButton({
    label
  });

  return <button onClick={onClick}>{label}</button>;
}
```

**Note:**

- Nama file component harus menggunakan format **PascalCase** dengan extension **.tsx**
- Parameter function component harus menggunakan nama **props**
- Isi file hanya boleh code yang berhubungan dengan **UI**
- Tidak boleh ada **Logic Business** didalamnya
- Tidak boleh ada **Types** didalamnya
- Tidak boleh **destructuring** params di parameter function
- Jumlah baris code hanya boleh 100 baris

### File Types

```JS
import type { StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';

export type TButtonProps = {
  label: string;
  color: 'primary' | 'secondary' | 'error';
};
export type TUseButtonParam = {
  label: string;
}
export type TButtonStory = StoryObj<typeof Button>;
```

**Note:**

- File types hanya boleh berisi types component bersangkutan
- Tidak boleh ada types untuk child component
- Penamaan types harus mengikuti standar yang sudah dijelaskan
- Pembuatan types hanya boleh menggunakan keyword `type`, tidak boleh menggunakan `interface`

### File Helper

Struktur component dasar belum punya slot untuk file helper — padahal logic murni (bukan business logic ber-state) yang numpuk di komponen atau di hook adalah temuan review paling sering muncul.

**Kapan wajib bikin file helper:**

Kalau ada logic **pure function** (tanpa `useState`/`useEffect`/hook lain, tanpa side effect) yang isinya derive/transform data untuk keperluan render. Contoh kasus nyata dari review:

- Bikin `href` dari kombinasi query params (`buildHref`, `resolvePriceFilterOption`, dst)
- Nentuin `isActive` / `isChecked` dari perbandingan value
- Nentuin data yang tampil (`visibleOptions`) dari `options` + `count`
- Bikin object JSON-LD schema dari list produk
- Hitung range `start`/`end` untuk summary pagination

Kalau logic ini masih inline di dalam `.map()`/JSX atau ditulis langsung di body hook, **pindahkan ke `*.helper.ts`**.

```JS
// checkbox-filter-group.helper.ts
import { slugify } from '@/features/plp';
import { buildHref } from '../../filter-sidebar.helper';
import type { TCheckboxFilterGroupResolveOptionParam } from './checkbox-filter-group.types';

export function resolveCheckboxFilterOption(payload: TCheckboxFilterGroupResolveOptionParam) {
  const { option, selected, basePath, preservedFields, queryKey } = payload;
  const optionSlug = slugify({ value: option.name });
  const isChecked = selected.includes(optionSlug);
  // ...sisa komputasi murni...

  return { href, isChecked };
}
```

**Note:**

- File helper **tidak boleh** import React atau hook apa pun (`useState`, `useEffect`, `useConfig`, dll) — isinya harus pure function
- Function yang generik dan dipakai oleh lebih dari satu child component boleh tetap tinggal di helper milik **parent**-nya (contoh: `buildHref` di `filter-sidebar.helper.ts` dipakai oleh `checkbox-filter-group`, `price-filter-group`, `vehicle-type-filter`)
- Function yang cuma dipakai oleh **satu** child component harus dipindah ke helper milik child tersebut, jangan numpuk semua di helper parent

**Aturan penamaan function di helper:**

| Prefix     | Kapan dipakai                                                            | Contoh                                                  |
| ---------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `resolve*` | Mengembalikan data turunan/hasil komputasi untuk dipakai component/hook   | `resolveCheckboxFilterOption`, `resolveProductGridData`  |
| `build*`   | Membangun satu value tunggal (biasanya string, misal URL)                 | `buildHref`, `buildPreservedFields`                       |
| `toggle*`  | Mengubah/toggle satu value di dalam array/list                            | `toggleListValue`                                         |

### File Hook

```JS
import type { TUseButtonParam } from './button.types';

export default function useButton(payload: TUseButtonParam) {
  // state
  const { label } = payload
  const [data, setData] = useState<string>(label)

  // functions
  function onClick() {
    setData('Halo Dunia')
  }

  // lifecycle
  useEffect(() => {
    setData('Hello World')
  }, [])

  return { data, onClick };
}
```

**Note:**

- File hook hanya boleh berisi **Logic Business** (state + orkestrasi)
- Urutan code nya harus dimulai dari state, function, dan lifecycle
- **Logic Business** yang ada didalamnya harus punya component yang bersangkutan
- Jumlah baris code hanya boleh 200 baris
- Kalau ada derived data yang dihitung dari state, **jangan hitung inline di dalam hook** — panggil pure function dari `*.helper.ts`

```JS
// use-checkbox-filter-group.ts
'use client';

import { useState } from 'react';
import { resolveCheckboxFilterGroupData } from './checkbox-filter-group.helper';
import type { TUseCheckboxFilterGroupParam } from './checkbox-filter-group.types';

export function useCheckboxFilterGroup(payload: TUseCheckboxFilterGroupParam) {
  const { options, visibleCount } = payload;
  const [isExpanded, setIsExpanded] = useState(false);
  const { visibleOptions, hasMore } = resolveCheckboxFilterGroupData({
    options,
    isExpanded,
    visibleCount,
  });

  function expand() {
    setIsExpanded(true);
  }

  return { visibleOptions, hasMore, expand };
}
```

### File Stories

```JS
import type { Meta } from '@storybook/nextjs-vite';
import { Button } from './Button';
import type { TButtonStory } from './button.types';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;

export const Primary: TButtonStory = {
  args: {
    label: 'Primary',
  },
};
```

**Note:**

- File story hanya boleh berisi dokumentasi component yang bersangkutan

### File Test

```JS
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { describe, it, expect } from 'vitest';

describe('Button', () => {
  it('renders button text', () => {
    render(<Button label="Primary" />);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });
});
```

**Note:**

- File test hanya boleh berisi test component yang bersangkutan

### Folder Child Components

Untuk setiap component yang jumlah barisnya melebihi dari standar yang sudah dijelaskan pada sub judul **File Component**. Maka harus dibuat child component nya di dalam folder `_components`, yang structure nya tetap mengikuti standar pembuatan component.

### File Barrel

```JS
export * from './Button';
export type { TButtonProps } from './button.types';
```

**Note:**

- File ini hanya berisi **component** atau **types** yang boleh di export ke luar
- Jangan export semua type jika tidak diperlukan
- Untuk file barrel di parent component seperti di `/src/components` atau `/**/_components` hanya boleh export **file barrel** component nya. Seperti contoh dibawah ini

```JS
export * from "./button"
```

---

## How To Create Loader

Setiap API yang akan diload pertama kali saat halaman dirender, maka harus dibuat loader nya dan digunakan di server component. Untuk loader hanya boleh di pakai pada file `page.ts` atau file `layout.ts`.

### Structure

```
_loaders/
├── main-layout/
|   ├── internal/
|   ├── main-layout.loader.ts
|   ├── main-layout.types.ts
|   └── index.ts
└── index.ts
```

### File Loader

```JS
import 'server-only';
import { getFooterService } from '@/features/cms';
import { redirectToLogin } from '@/utils/server';

export async function mainLayoutLoader() {
  const dataFooter = await getFooterService();

  if (dataFooter.status === 'unauthorized') {
    await redirectToLogin();

    return null;
  }

  return {
    dataFooter: dataFooter.data,
  };
}
```

**Note:**

- File ini hanya berfungsi sebagai loader untuk memanggil fungsi **service**
- Tidak boleh ada logic **mapping/transform** didalamnya
- Wajib melakukan pengecekan untuk status **unauthorized** dan memanggil util **redirectToLogin**
- Wajib menambahkan `import 'server-only'`
- Nama folder mengikuti nama loader ini dipanggil, jika loader nya dipanggil di `page.ts` maka namanya `(page-name).loader`. Jika dipanggil di `layout.tsx` maka namanya `(layout-name).loader`
- Untuk nama function loader disamakan dengan nama file yang format nama function nya menggunakan camelCase
- Jika `generateMetadata` perlu memanggil API, maka harus dibuatkan function loader nya. Untuk lokasi function mengikuti `generateMetadata` dipanggil dan nama functionnya mengikuti format berikut `(pageName/layoutName)GenerateMetaDataLoader`
- Tidak boleh lebih dari 200 baris code
- **Sebelum bikin fetch/service call baru di loader**, cek dulu apakah datanya sudah tersedia lewat provider/hook global — lihat [Data Fetching & State Management](#data-fetching--state-management-plp-checklist)

### File Types

```JS
export type TMainLayoutLoaderParam = {}
```

**Note:**

- File ini hanya berisi file types untuk loader yang bersangkutan
- Ikuti aturan penamaan type sesuai dengan yang sudah dijelaskan

### Folder \_internal

Untuk code file loader yang melebihi batas maksimal, maka harus dipecah menjadi beberapa function di dalam folder `_internal/`.

---

## How To Create Provider

### Structure

```
providers/
└── auth/
    ├── Auth.tsx
    ├── auth.types.ts
    └── index.ts
```

### File Provider

```JS
'use client';

import { useEffect } from 'react';
import type { TAuthProviderParam } from './auth.types.ts'

export default function AuthProvider(props: TAuthProviderParam) {
  // state
  const { children } = props;

  // function
  function onHandle(){}

  // lifecycle
  useEffect(() => {}, []);

  return <>{children}</>;
}
```

**Note:**

- Urutan code provider harus mengikuti state, function, lifecycle

### File Types

```JS
export type TAuthProviderParam = {
  children: React.ReactNode
}
```

**Note:**

- Isi type hanya boleh type untuk provider yang bersangkutan

### File Barrel

```JS
export  * from "./Auth.tsx"
```

**Note:**

- File barrel hanya berisi component/types yang akan di export keluar

---

## How To Create Config

Untuk setiap env yang akan digunakan di client atau server harus di definisikan di file config.

### Structure

```
configs/
├── client/
|   └── client.config.ts
└── server/
    └── server.config.ts
```

### File Client Config

```JS
import z from 'zod';

const clientConfigSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const clientConfig = clientConfigSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
```

**Note:**

- Nama config harus sama dengan nama env

### File Server Config

```JS
import z from 'zod';

const serverConfigSchema = z.object({
  APP_API_BASE_URL: z.url(),
});

export const serverConfig = serverConfigSchema.parse({
  APP_API_BASE_URL: process.env.APP_API_BASE_URL,
});

```

**Note:**

- Nama config harus sama dengan nama env

---

## How To Create Feature

```
features/
└── cms/
    ├── api/
    |   ├── footer.api.ts
    |   └── index.ts
    ├── schema/
    |   ├── footer.schema.ts
    |   └── index.ts
    ├── services/
    |   ├── footer.service.ts
    |   └── index.ts
    ├── store/
    |   ├── footer.store.ts
    |   └── index.ts
    ├── hooks/
    |   ├── use-footer.ts
    |   └── index.ts
    ├── transforms/
    |   ├── footer.transform.ts
    |   └── index.ts
    ├── types/
    |   ├── api.types.ts
    |   ├── schema.types.ts
    |   ├── service.types.ts
    |   ├── store.types.ts
    |   ├── hook.types.ts
    |   ├── transform.types.ts
    |   └── index.ts
    └── index
```

### File Api

```JS
import { fetchApi } from '@/utils/server';
import {
  TMasterDataFetchApiLocationDetailParam,
  TMasterDataLocationDetailAPISuccess,
} from '../types';

export const fetchApiLocationDetail = async (payload: TMasterDataFetchApiLocationDetailParam) => {
  const result = await fetchApi<TMasterDataLocationDetailAPISuccess>({
    url: `/v1/integration-service/public/location?latitude=${payload.latitude}&longitude=${payload.longitude}`,
    method: 'get',
  });

  return result;
};
```

### File Barrel API

```JS
export * from './location.api';
```

### File Schema

```JS
import z from 'zod';

export function getLocationDetailSchema() {
  return z.object({
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
  });
}
```

### File Barrel Schema

```JS
export * from './get-location-detail.schema';
```

### File Service

```JS
import { ApplicationError } from '@/features/app';
import type { TMasterDataGetLocationDetailReturn } from '../types';
import { fetchApiLocationDetail } from '../api';
import { getLocationDetailSchema } from '../schema';
import { locationDetailTransform } from '../transforms'

export async function getLocationDetailService(
  payload: unknown
): TMasterDataGetLocationDetailReturn {
  const payloadLocationDetail = getLocationDetailSchema().parse(payload);
  const dataLocationDetail = await fetchApiLocationDetail(payloadLocationDetail);

  if (dataLocationDetail.status === 'error') {
    if (dataLocationDetail.code === 401) {
      return {
        message: 'unauthorized',
      };
    }
    throw new ApplicationError({
      message: 'Gagal mendapatkan data detail lokasi',
    });
  }

  return {
    message: 'success',
    data: locationDetailTransform({
      data: dataLocationDetail.data.data
    })
  };
}
```

**Note:**

- Jika nama property data API belum camelCase, maka harus di mapping/transform di service terlebih dahulu
- Jika ada data yang akan dikirim lewat API, maka harus divalidasi dengan schema yang sudah dibuat
- Jangan lupa untuk handle status error dan code 401 jika api tersebut perlu bearer token

### File Barrel Service

```JS
export * from './get-location-detail.service';
```

### File Store

```JS
import { create } from 'zustand';
import type { TMaterDataLocationStore } from '../types';

export const useLocationStore = create<TMaterDataLocationStore>((set) => ({
  list: [],
  setList({ list }) {
    set({ list });
  },
}));
```

**Note**

- Store hanya boleh dibuat jika memang ada data yang sifatnya dibutuhkan oleh banyak component

### File Barrel Store

```JS
export * from './master-data.store'
```

### File Hook

```JS
export const useLocation(){
  // state
  const [data, setData] = useState<string>('')

  // function
  function onHandle(){}

  // lifecycle
  useEffect(() => {}, [])

  return {
    data,
    onHandle
  }
}
```

**Note:**

- Urutan code harus dimulai dari state, function, lifecycle

### File Barrel Hook

```JS
export * from './use-footer'
```

### File Transform

```JS
import type { TCMSlocationDetailTransformParam } from '../types'

export function locationDetailTransform(payload: TCMSlocationDetailTransformParam){
  const { data } = payload
  return {
    cityName: data.cityName,
    provinceName: data.provinceName,
    districtName: data.districtName,
    subDistrictName: data.subDistrictName,
  }
}
```

**Note:**

- Jika logic mapping/transform di service terlalu besar, maka harus dibuat fungsi transform terpisah di folder transforms

### File Barrel Transform

```JS
export * from './location-detail-transform'
```

### File Types

```JS
// file service.types.ts
import { TAppServiceReturn } from '@/features/app';

export type TMasterDataGetLocationDetailReturn = Promise<
  TAppServiceReturn<TMasterDataLocationDetail>
>;

// file api.types.ts
import { TFetchApiStateResponseSuccess } from '@/utils/server/fetch-api';

export type TMasterDataLocationDetailAPISuccess = TFetchApiStateResponseSuccess<{
  latitude: string;
  longitude: string;
  countryCode: string;
  countryName: string;
  countryID: string;
  provinceName: string;
  provinceID: string;
  cityName: string;
  cityID: string;
  districtName: string;
  districtID: string;
  subDistrictID: string;
  subDistrictName: string;
  addressString: string;
  postcode: string;
}>;
```

**Note:**

- Type untuk setiap feature dibuat didalam folder types
- Setiap feature segments punya satu file type, seperti feature segment api punya file types yang bernama api.types.ts
- Untuk type return service harus menggunakan `TAppServiceReturn`
- Untuk type return success atau error api harus menggunakan `TFetchApiStateResponseSuccess` atau `TFetchApiStateResponseError`

### File Barrel Feature

```JS
export * from './services/index';
```

**Note:**

- Export hanya boleh dilakukan untuk function, type, data yang akan digunakan diluar feature

---

## Integration Eksternal Library

**Note:**

- Library eksternal yang fungsinya semacam helper atau util yang sering digunakan harus didefinisikan ulang di folder libs, contohnya seperti axios
- Jika file lib tidak boleh lebih dari 100 baris
- Jika lebih dari 100 baris, maka buat fungsi terpisah di dalam folder `_internal/`
- Pisahkan types kedalam file `*.types.ts`
- Buat file barrel untuk function, types, atau data yang akan di export keluar

### Structure

```
libs/
├── axios/
|   ├── _internal/
|   ├── axios.lib.ts
|   ├── axios.types.ts
|   └── index.ts
└── index.ts
```

---

## How To Create Util

**Note:**

- Jika util dipakai diserver maka buat didalam `server/`, jika dipakai diclient maka buat `client/`, jika dipakai diserver atau client maka buat di `common/`
- Util server hanya boleh memakai **config server**, util client hanya boleh memakai **config client**, dan util common tidak boleh memakai config
- Jika common butuh data config, maka harus dikirim lewat parameter
- File utama util tidak boleh lebih dari 100 baris
- Jika lebih maka pecah menjadi beberapa function dan pindahkan ke `_internal/`
- File type dibuat didalam file `*.types.ts`
- Ikutin aturan penamaan type dalam membuat type

### Structure

```
utils/
├── client/
|   ├── translation/
|   |   ├── _internal/
|   |   ├── translation.util.ts
|   |   ├── translation.types.ts
|   |   └── index.ts
|   └── index.ts
├── common/
|   ├── format-currency/
|   |   ├── _internal/
|   |   ├── format-currency.util.ts
|   |   ├── format-currency.types.ts
|   |   └── index.ts
|   └── index.ts
└── server/
    ├── fetch-api/
    |   ├── _internal/
    |   ├── fetch-api.util.ts
    |   ├── fetch-api.types.ts
    |   └── index.ts
    └── index.ts
```

---

## How To Create Types

**Note:**

- Penamaan type harus mengikuti format dibawah ini
  1. Untuk params function => T[Domain][Name]Param
  2. Untuk state/variabel => T[Domain][Name]
  3. Untuk return function => T[Domain][Name]Return
  4. Untuk props component => T[Domain][Name]Props
  5. Untuk api success => T[Domain][Name]APISuccess
  6. Untuk api error => T[Domain][Name]APIError
  7. Untuk store => T[Domain][Name]Store
- **Domain** mengikuti nama folder tempat file type itu berada. Jika type tersebut ada di folder `utils/server/fetchApi`, maka nama domainnya **FetchApi**
- Nama **Domain** di feature mengikuti nama feature nya. Jika type ada di `features/cms/types/api.types.ts`, maka nama domainnya **CMS**
- Untuk **Name** mengikuti nama function, variabel, atau state
- Berikut contoh penggunaan types

```JS
// Penggunaan type di variabel
type TMasterDataLocation = {}

const location: TMasterDataLocation

// penggunaan type di parameter function
type TMasterDataGetLocationParam = {}

function getLocation(payload: TMasterDataGetLocationParam){}

// penggunaan type di return function
type TMasterDataGetLocationReturn = {}

function getLocation(): TMasterDataGetLocationReturn{}

// penggunaan type di props component
type TBannerProps = {}

export default function Banner(props: TBannerProps){}

// penggunaan type di api success
type TMasterDataGetLocationAPISuccess = {}
type TMasterDataGetLocationAPIError = {}

fetchApi<TCMSFooterNewsletterAPISuccess, TMasterDataGetLocationAPIError>()

// penggunaan type untuk store
type TMasterDataLocationStore = {}

export const useLocationStore = create<TMasterDataLocationStore>((set) => ({}))
```

### Kapan Return Type Wajib, Kapan Tidak

- Untuk **service, loader, transform** yang return type-nya di-consume/di-reference sebagai type di file lain (dipanggil lintas file/lintas folder) → **wajib** pakai named return type sesuai format di atas.
- Untuk **helper function internal**, dan untuk **function khusus Next.js** (`generateMetadata`, page/layout component, route handler, dsb) yang return type-nya **sudah cukup jelas dari nama parameternya** dan gak perlu di-reference di file lain → **jangan** tambahin return type eksplisit. Biarkan TypeScript infer sendiri dari `return` statement-nya.
- Kalau jadinya gak ada satu pun yang pakai type return itu lagi, hapus juga type-nya (`T[Domain][Name]Return`) — jangan ditinggal jadi dead code (lihat [Notes](#notes) poin bersih-bersih code).

```JS
// ❌ jangan gini untuk internal helper
export function buildPreservedFields(
  payload: TFilterSidebarBuildPreservedFieldsParam
): TFilterSidebarField[] {
  // ...
}

// ✅ biarkan infer
export function buildPreservedFields(payload: TFilterSidebarBuildPreservedFieldsParam) {
  // ...
}

// ❌ jangan gini untuk function khusus Next.js kalau return type-nya gak di-reference di tempat lain
export async function generateMetadata(
  payload: TProductsGenerateMetadataParam
): TProductsGenerateMetadataReturn {
  // ...
}

// ✅ nama parameter (TProductsGenerateMetadataParam) udah cukup, biarkan return type infer
export async function generateMetadata(payload: TProductsGenerateMetadataParam) {
  // ...
}
```

---

## Data Fetching & State Management (PLP Checklist)

Section ini dari temuan review PR PLP (filter sidebar, pagination, listing view) — sering bikin review jadi panjang kalau dilewatin.

### 1. Jangan Duplikat Sumber Data — Cek Dulu Apa Sudah Tersedia di Global Hook

Kasus nyata: loader manggil `getConfigService()` lagi, padahal config udah di-fetch sekali di root layout (`(main)/layout.tsx`) dan sudah tersedia secara global lewat `useConfig()`.

**Aturan:**

1. Sebelum bikin fetch/service call baru di loader, **cek dulu** apakah datanya udah tersedia lewat provider/hook global yang sudah ada (`useConfig`, dll). Kalau iya, jangan fetch ulang.
2. Kalau data itu **statis** — gak berubah tergantung query/search yang lagi jalan (contoh: opsi sorting, range harga, rating) — ambil langsung di **client component** yang butuh, lewat hook global. **Jangan** di-prop-drill dari loader → server component → client component.
3. Kalau data itu **kontekstual** — berubah tergantung hasil search/filter saat ini (contoh: daftar brand/kategori yang match dengan hasil search sekarang) — itu **tetap** harus lewat loader → props, karena bukan bagian dari config statis dan gak ada di hook global.
4. Sebelum asumsi hook global "pasti punya" suatu data, **verifikasi ke actual payload/response API-nya** (cek file `constants`, `schema`, atau `transform` di feature terkait). Jangan nebak/asumsi berdasarkan nama field yang kelihatannya cocok.

```JS
// ❌ jangan gini kalau datanya statis dan udah ada di config
async function productsLoader(payload) {
  const [productResult, configResult] = await Promise.all([
    getProductSearchService(searchPayload),
    getConfigService(), // <- duplikat, config udah di-fetch di root layout
  ]);
  // ...
}

// ✅ ambil langsung di component yang butuh
'use client';

function PriceFilterGroup() {
  const { config } = useConfig();
  const options = config?.filters.price ?? [];
  // ...
}
```

### 2. State UI Murni vs State di URL (searchParams)

Bedain dua jenis state di halaman yang punya filter/pencarian:

1. **State yang mendefinisikan data apa yang di-fetch/ditampilkan** — search, filter, sort, page, pageSize. Ini **wajib** ada di URL (`searchParams`), karena harus shareable, bookmarkable, dan mempengaruhi data fetching di server (SSR).
2. **State UI murni yang gak mempengaruhi data yang di-fetch** — misalnya expand/collapse "lihat lebih banyak" pada list filter. Ini pakai `useState` lokal di custom hook milik component tersebut. **Jangan** dorong ke query param.

Kasus nyata: `categoryExpanded`/`brandExpanded` awalnya jadi query param (`?categoryExpanded=1`) padahal itu cuma state expand/collapse UI, gak mempengaruhi produk apa yang ditampilkan. Fix-nya pindah ke `useState` lokal.

```JS
// ❌ jangan gini untuk state UI murni yang gak pengaruh ke data
// categoryExpanded=1 di query param, cuma buat expand/collapse list

// ✅ state lokal di hook milik component
'use client';

const [isExpanded, setIsExpanded] = useState(false);
```

---

## Notes

1. Setiap parameter function harus menggunakan nama **payload**, khusus untuk component menggunakan **props**

```JS
  // don't do this
  function getData(data: TCMSGetDataParam){}

  // do this
  function getData(payload: TCMSGetDataParam){}
```

2. Tidak boleh **destructuring** parameter langsung di parameter function nya

```JS
  // don't do this
  function getData({name, label}: TCMSGetDataParam){}

  // do this
  function getData(payload: TCMSGetDataParam){
    const { name, label } = payload
  }
```

3. Parameter harus berupa **object** meskipun data yang dikirim hanya ada satu

```JS
  // don't do this
  function getData(name: string){}

  // do this
  function getData(payload: TCMSGetDataParam){}
```

4. Perbaiki eslint jika ada error eslint, jangan ditambahkan komentar yang mendisable eslint nya

```JS
  // don't do this
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const _name = ''

  // do this
  const name = ''
```

5. Setiap nama file harus menggunakan format **kebab-case** dan untuk component menggunakan **PascalCase**
6. Code yang tidak kepakai harus dihapus. **Ini termasuk type/field yang udah gak kepake pas refactor** — kalau sebuah refactor bikin prop/type gak lagi dipakai (contoh: data pindah sumber dari props ke hook global, atau logic pindah folder), hapus field/type itu sekalian di semua lapisan (component, types, service, schema). Sebelum bikin PR, cross-check dengan grep:

```bash
grep -rn "NamaTypeAtauFieldYangDihapus" src
```

Kalau hasilnya kosong (selain di file yang lagi kamu hapus), berarti aman dihapus total.

7. Setiap text yang akan ditampilkan harus menggunakan utils translation dan text nya di inputkan ke message/id.json
8. Dilarang mengubah file config seperti eslint, commitlint, husky, prettier, atau file config lainnya tanpa ada izin dari **Code Reviewer**
9. Jika ada task yang tidak bisa diterapkan karena terhalang **standar document**, harap diskusikan dulu ke **Code Reviewer** agar bisa dicarikan solusinya

---

## Checklist Sebelum PR

- [ ] Semua logic derive/transform data non-trivial di `.map()`/JSX sudah dipindah ke `*.helper.ts`
- [ ] Gak ada fetch/service call yang datanya sebenernya udah tersedia lewat hook/provider global (cek dulu apakah statis atau kontekstual)
- [ ] State UI murni (expand/collapse, dsb) pakai `useState` di hook, bukan query param
- [ ] Gak ada return type eksplisit di helper function internal (biarkan infer); service/loader/transform tetap pakai named return type
- [ ] Gak ada type/prop yang udah gak dipakai lagi (dicek pakai `grep`)
- [ ] Semua asumsi soal data dari API/config sudah diverifikasi ke actual payload/response/schema, bukan tebakan
- [ ] Semua component, hook, dan file lain mengikuti structure & aturan penamaan di atas
- [ ] Tidak ada eslint-disable komentar yang ditambahkan tanpa perbaikan
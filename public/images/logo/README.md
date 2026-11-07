# Logo Ruang Kerja

Warna: navy `#1D3A6E`, emas `#F2B23A`, putih. Font wordmark: Plus Jakarta Sans Bold (sudah dikonversi ke path, tidak perlu memuat font).

| File | Dipakai di |
|---|---|
| `logo-horizontal.svg` | Sidebar terbuka (latar terang) |
| `logo-horizontal-dark.svg` | Sidebar terbuka (latar gelap) |
| `logo-mark.svg` / `logo-mark-dark.svg` | Sidebar collapsed |
| `logo-stacked.svg` | Halaman login (latar terang) |
| `logo-stacked-dark.svg` | Halaman login (latar gelap) |

Folder `png/` berisi versi @2x dan @3x kalau butuh raster.

## Contoh pemakaian

Sidebar (tinggi 32px, lebar mengikuti):

```html
<a href="/" class="flex items-center h-16 px-4">
  <img src="/logo/logo-horizontal.svg" alt="Ruang Kerja" class="h-8 w-auto">
</a>

<!-- sidebar collapsed -->
<img src="/logo/logo-mark.svg" alt="Ruang Kerja" class="h-8 w-8">
```

Login (tinggi sekitar 120px):

```html
<img src="/logo/logo-stacked.svg" alt="Ruang Kerja" class="mx-auto h-28 w-auto">
```

Jangan tempatkan `logo-horizontal.svg` (versi terang) di latar navy, karena tile ikonnya sama warna dengan latar. Pakai versi `-dark` di sana.

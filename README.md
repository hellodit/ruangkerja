# Ruang Kerja

Aplikasi Nuxt 4 + [Nuxt UI 4](https://ui.nuxt.com) dengan autentikasi lengkap, profil pengguna, unggah file ke Cloudflare R2, dan penerima webhook SingaPay.

## Fitur

- **Autentikasi** ([Better Auth](https://better-auth.com)): daftar, masuk, keluar, lupa & atur ulang kata sandi, verifikasi email (opsional, tidak memblokir login), masuk/daftar dengan Google.
- **Cloudflare Turnstile** di halaman masuk, daftar, dan lupa kata sandi (diverifikasi di server).
- **Profil**: lihat profil, ubah nama, ganti foto, ubah kata sandi, kirim ulang email verifikasi.
- **Dokumen**: unggah (PDF/JPG/PNG ≤ 10 MB), unduh lewat signed URL 5 menit, hapus.
- **Upload ke R2** memakai presigned URL langsung dari browser, lalu dikonfirmasi server (ukuran, tipe, dan *magic bytes* dicek; file yang tidak cocok dihapus).
- **Validasi Zod** yang sama di form (client) dan API (server) — `shared/schemas/`.
- **Webhook SingaPay** dengan verifikasi tanda tangan HMAC-SHA512 dan idempotensi.
- **i18n**: Bahasa Indonesia (default) dan English.

## Persiapan

```bash
bun install
cp .env.example .env   # lalu isi semua nilainya
```

### 1. Database (PostgreSQL)

Isi `NUXT_DATABASE_URL`, lalu jalankan migrasi:

```bash
bun run db:migrate      # terapkan migrasi di server/db/migrations
bun run db:generate     # buat migrasi baru setelah mengubah server/db/schema.ts
```

### 2. Better Auth

`NUXT_BETTER_AUTH_SECRET` — string acak minimal 32 karakter (`openssl rand -base64 32`).
`NUXT_PUBLIC_SITE_URL` — URL publik aplikasi (dipakai untuk callback OAuth dan tautan email).

`NUXT_TRUST_PROXY` — isi `true` **hanya** jika aplikasi berada di belakang tepat satu reverse proxy tepercaya yang mengatur `X-Forwarded-For` (Vercel, nginx). IP klien dipakai untuk rate limit login; jika salah diatur, penyerang bisa memalsukan IP-nya.

### 3. Google OAuth

Di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) buat *OAuth client ID* (Web application):

- **Authorized JavaScript origins**: `NUXT_PUBLIC_SITE_URL`
- **Authorized redirect URI**: `{NUXT_PUBLIC_SITE_URL}/api/auth/callback/google`

Isi `NUXT_GOOGLE_CLIENT_ID` dan `NUXT_GOOGLE_CLIENT_SECRET`.

> Akun Google hanya ditautkan otomatis ke akun email/kata sandi yang **sudah terverifikasi**. Ini mencegah pengambilalihan akun oleh orang yang mendaftar duluan memakai email korban.

### 4. Email (Resend)

Verifikasi domain pengirim di [Resend](https://resend.com/domains), lalu isi `NUXT_RESEND_API_KEY` dan `NUXT_EMAIL_FROM`.

### 5. Cloudflare Turnstile

Buat widget di dashboard Cloudflare → Turnstile, tambahkan hostname aplikasi, lalu isi `NUXT_PUBLIC_TURNSTILE_SITE_KEY` dan `NUXT_TURNSTILE_SECRET_KEY`.

Untuk development bisa memakai [kunci uji](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) Cloudflare: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### 6. Cloudflare R2

Buat **dua bucket**:

| Bucket | Isi | Akses publik |
|---|---|---|
| `NUXT_R2_PUBLIC_BUCKET` | foto profil (`avatars/…`) | **Aktif** — custom domain atau r2.dev → `NUXT_R2_PUBLIC_URL` |
| `NUXT_R2_PRIVATE_BUCKET` | dokumen (`documents/…`) | **Nonaktif** |

Buat *R2 API token* (Object Read & Write, terbatas pada dua bucket tersebut), lalu isi `NUXT_R2_ACCOUNT_ID`, `NUXT_R2_ACCESS_KEY_ID`, `NUXT_R2_SECRET_ACCESS_KEY`.

Atur **CORS** di kedua bucket (Settings → CORS policy), ganti origin dengan URL aplikasi:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 7. SingaPay

Di dashboard SingaPay, atur URL notifikasi (transaksi dan/atau disbursement) ke:

```
{NUXT_PUBLIC_SITE_URL}/api/webhooks/singapay
```

Isi `NUXT_SINGAPAY_WEBHOOK_SECRET` dengan **HMAC Validation Key** dari dashboard. Untuk rotasi kunci, isi beberapa nilai dipisah koma.

Verifikasi yang dilakukan:

- `X-Signature = hex(HMAC-SHA512("POST:{path}:{token}:{sha256(body)}:{X-Timestamp}", secret))`, `token` dari header `Authorization: Bearer …`.
- Body dinormalisasi persis seperti contoh PHP SingaPay (`json_decode` → `ksort` rekursif → `json_encode`); hash body mentah diterima sebagai cadangan. Kesesuaian dengan PHP diuji lewat `tests/fixtures/singapay-normalize.php`.
- `X-Timestamp` maksimal ±300 detik dari waktu server.
- Setiap pengiriman dicatat di tabel `singapay_webhook_event` (unik per hash body), jadi pengiriman ulang hanya diproses sekali.

Logika bisnis untuk event (misalnya menandai pesanan lunas) ditulis di `server/utils/singapay-events.ts` — saat ini hanya mencatat log.

> ⚠️ Skema tanda tangan ini diambil dari SDK pihak ketiga (`aliziodev/laravel-singapay`) karena dokumentasi resmi SingaPay tidak tersedia publik. **Uji dulu dengan sandbox SingaPay sebelum production.**

## Development

```bash
bun dev            # http://localhost:3000
bun run test       # unit test (Vitest)
bun run lint
bun run typecheck
bun run build
```

## Struktur

```
shared/schemas/      Skema Zod (auth, profil, upload) — dipakai client & server
server/db/           Skema Drizzle + migrasi
server/utils/        auth (Better Auth), r2, file-signature, singapay, email, session
server/api/          /api/auth/**, /api/uploads/*, /api/documents/*, /api/webhooks/singapay
app/pages/           login, register, forgot-password, reset-password, verify-email, profile/*
app/composables/     useAuthSession, useAuthClient, useR2Upload
tests/               unit test + fixture PHP untuk normalisasi SingaPay
```

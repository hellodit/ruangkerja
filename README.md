# RuangKerja

Asisten kerja digital personal untuk ASN: susun **rencana aksi per RHK**, catat **progres harian** (ketik atau suara), kumpulkan **tautan bukti dukung**, lalu salin **draf realisasi** per periode ke e-Kinerja. Dibangun dengan Nuxt 4, [Nuxt UI 4](https://ui.nuxt.com) (tema design system *CTM Project*), Better Auth, dan Drizzle ORM + PostgreSQL.

## Fitur Rilis 1.0

| Area | Isi |
|---|---|
| Akun | Daftar, masuk (kata sandi atau tautan ke email), Google, lupa/atur ulang kata sandi, verifikasi email (opsional). Cloudflare Turnstile di semua form publik, rate limit per IP. |
| Onboarding | 3 langkah: Isi profil → Periode evaluasi + RHK (termasuk tempel beberapa RHK) → Ringkasan + pengingat. Ruang kerja terkunci sampai selesai. |
| Beranda | Sapaan + hal yang perlu perhatian, angka utama periode, grafik progres minggu ini, rencana aksi prioritas, progres hari ini (salin untuk e-Kinerja), hitung mundur batas pengisian. |
| RHK saya | Kartu RHK + IKI, detail RHK dengan rencana aksi per periode (tambah, ubah, tandai selesai, salin dari periode sebelumnya), progres terbaru, bukti, tautan ke realisasi. |
| Progres harian | Tampilan daftar (pilih banyak → salin untuk e-Kinerja) dan kalender minggu 07.00–17.00 (pilihan tampilan diingat). Form terpisah dengan panel rencana aksi, rekam suara (id-ID), beberapa hasil + tautan bukti. |
| Bukti dukung | Semua tautan bukti, pencarian, filter RHK, daftar progres yang belum punya bukti. Bukti = nama + tautan, **tanpa unggah file**. |
| Realisasi periode | Draf per RHK yang disusun **hanya** dari progres harian (rencana aksi tanpa progres ditandai, tidak diisi otomatis), bisa diubah, salin per RHK atau semua, unduh **.docx** asli. |
| Profil | Data pribadi/kepegawaian/atasan, foto profil (R2), pengingat, ubah kata sandi, ekspor semua data (JSON), hapus akun permanen. |

Di luar Rilis 1.0 (sesuai PRD): fitur AI (rapikan kalimat, draf AI — Rilis 1.1), Alat bantu (Panduan kerja, Asisten AI, Draf SOP), pembayaran. Webhook SingaPay sudah tersedia untuk fase pembayaran.

**Data sensitif.** NIP, tanggal lahir, dan alamat dienkripsi (AES-256-GCM) sebelum disimpan. Semua query dibatasi ke pemilik akun.

## Persiapan

```bash
bun install
cp .env.example .env   # lalu isi semua nilainya
```

### 1. Database (PostgreSQL) dan enkripsi

Isi `NUXT_DATABASE_URL` dan `NUXT_DATA_ENCRYPTION_KEY` (`openssl rand -base64 32`; **jangan pernah diganti** setelah ada data — data terenkripsi tidak bisa dibaca lagi). Lalu:

```bash
bun run db:migrate      # terapkan migrasi di server/db/migrations
bun run db:generate     # buat migrasi baru setelah mengubah server/db/schema.ts
bun run db:seed-demo    # opsional: akun demo berisi contoh data dari desain UI
```

Akun demo: `demo@ruangkerja.io` / `demo-ruangkerja-2026` (bisa diganti: `bun scripts/seed-demo.ts email sandi`). Script menolak berjalan saat `NODE_ENV=production` kecuali `SEED_DEMO_FORCE=1`.

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

R2 hanya dipakai untuk **foto profil** (bukti dukung disimpan sebagai tautan, tanpa unggah file). Buat satu bucket `NUXT_R2_PUBLIC_BUCKET` dengan akses publik aktif (custom domain atau r2.dev → `NUXT_R2_PUBLIC_URL`).

Buat *R2 API token* (Object Read & Write, terbatas pada bucket tersebut), lalu isi `NUXT_R2_ACCOUNT_ID`, `NUXT_R2_ACCESS_KEY_ID`, `NUXT_R2_SECRET_ACCESS_KEY`.

Atur **CORS** di bucket tersebut (Settings → CORS policy), ganti origin dengan URL aplikasi:

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
shared/schemas/      Skema Zod (auth, workspace, upload) — dipakai form & API
shared/utils/        Logika domain murni: periode, tanggal, status, teks e-Kinerja, draf realisasi
server/db/           Skema Drizzle (sesuai PRD) + migrasi
server/utils/        auth, workspace (kepemilikan & nilai turunan), progress, realization, crypto, r2, singapay
server/api/          me, profile, settings, onboarding, skp, rhks, action-plans, progress, evidence,
                     dashboard, realizations (+ export .docx), account/export, uploads, webhooks/singapay
app/pages/           auth, onboarding/*, beranda, rhk/*, progres/*, bukti, realisasi, profil
app/components/      AppSidebar, ProgressForm, ProgressCalendar, RhkForm, ActionPlanModal, …
scripts/seed-demo.ts Akun demo
tests/               unit test + fixture PHP untuk normalisasi SingaPay
```

Spesifikasi: `.internal/specs/2026-11-06-rilis-1-design.md`.

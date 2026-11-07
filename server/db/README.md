# Database (PostgreSQL + Drizzle ORM 0.x)

## Struktur

- `schema/<nama-tabel>.ts` — satu file per tabel. Enum yang hanya dipakai satu tabel ada di file tabel itu.
- `schema/columns.ts` — helper kolom bersama (`timestamps`, `softDelete`, `num`).
- `schema/relations.ts` — **semua** relasi `relations()` untuk query relasional (`db.query.*`).
  Foreign key tetap dideklarasikan di kolom (`.references()`); relasi hanya metadata ORM.
- `schema/index.ts` — mengekspor semuanya (dipakai `useDb()`, drizzle-kit, dan script).
- `migrations/` — dibuat oleh `bun run db:generate`, jangan diedit setelah dijalankan.

## Aturan query

1. **Data berelasi diambil dengan satu query relasional** (`db.query.x.findMany({ with })`), bukan
   query A lalu query B dengan `inArray(...)`, dan bukan `Promise.all` beberapa query.
2. **Nilai turunan** (jumlah, total) memakai `extras` berupa subquery berkorelasi, di query yang sama.
3. **Query panjang ada di `server/services/`** (auto-import seperti `server/utils`). Endpoint di
   `server/api` cukup validasi input lalu memanggil service.
4. **Ubah/hapus dengan cek kepemilikan dalam satu statement**:
   `update(...).where(and(eq(id), ownsRhk(userId, ...))).returning()` → kosong berarti 404.
5. **Transaksi**: setiap statement di dalamnya memakai handle `tx`, termasuk helper
   (mis. `syncPlanStatus(planId, tx)`).
6. **Agregat yang tidak berelasi** (dashboard admin) digabung dalam satu statement
   (subquery skalar / `json_agg`), bukan banyak query paralel.
7. Setiap kolom foreign key punya index (PostgreSQL tidak membuatnya otomatis): tanpa index,
   `ON DELETE CASCADE/SET NULL` memindai seluruh tabel anak.

## Jebakan: kolom tanpa nama tabel

Drizzle 0.x menulis kolom **tanpa** nama tabel (`"id"`, bukan `"packages"."id"`) pada:

- daftar `SELECT` di query builder satu tabel (`db.select({...}).from(t)` tanpa join), dan
- query relasional root **tanpa** `with`.

Subquery berkorelasi di tempat itu akan mengikat `"id"` ke tabel di dalam subquery dan diam-diam
salah hitung. Gunakan `extras` hanya pada relasi bertingkat atau query yang juga punya `with`
(kolomnya diberi alias lengkap), atau agregasikan di subquery lalu `leftJoin` (kolom join selalu
lengkap) — contoh: `listPackages` dan `saveSkp`.

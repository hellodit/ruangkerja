import { z } from 'zod'

export const ADMIN_USER_FILTERS = ['all', 'unverified', 'not_onboarded', 'admin'] as const
export type AdminUserFilter = typeof ADMIN_USER_FILTERS[number]

/** GET /api/admin/users query. */
export const adminUsersQuery = z.object({
  q: z.string().trim().max(100).optional().transform(v => v || undefined),
  filter: z.enum(ADMIN_USER_FILTERS).default('all'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().refine(n => [10, 25, 50].includes(n), 'Ukuran halaman tidak valid').default(25)
})

/** Escape LIKE wildcards so a search for "50%" matches the text, not everything. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, c => `\\${c}`)}%`
}

const optionalText = (max: number) => z.string().trim().max(max, `Maksimal ${max} karakter`).optional().nullable().transform(v => v || null)

/** Create / update a package. */
export const packageSchema = z.object({
  name: z.string().trim().min(2, 'Nama paket minimal 2 karakter').max(80, 'Nama paket maksimal 80 karakter'),
  description: optionalText(500),
  price: z.number({ error: 'Harga wajib diisi' }).int('Harga dalam rupiah bulat').min(0, 'Harga tidak boleh negatif').max(100_000_000, 'Harga terlalu besar'),
  durationDays: z.number({ error: 'Durasi wajib diisi' }).int('Durasi dalam hari bulat').min(1, 'Durasi minimal 1 hari').max(3660, 'Durasi maksimal 10 tahun'),
  isActive: z.boolean().default(true)
})
export type PackageInput = z.infer<typeof packageSchema>

/** Admin assigns a package to a user by hand (records a paid manual transaction). */
export const assignPackageSchema = z.object({
  userId: z.uuid('Pilih pengguna'),
  packageId: z.uuid('Pilih paket'),
  amount: z.number({ error: 'Nominal wajib diisi' }).int('Nominal dalam rupiah bulat').min(0, 'Nominal tidak boleh negatif').max(100_000_000, 'Nominal terlalu besar'),
  reference: optionalText(120),
  notes: optionalText(500)
})
export type AssignPackageInput = z.infer<typeof assignPackageSchema>

export const TRANSACTION_METHODS = ['manual', 'sumopay'] as const

/** GET /api/admin/transactions query. */
export const adminTransactionsQuery = z.object({
  q: z.string().trim().max(100).optional().transform(v => v || undefined),
  method: z.enum(['all', ...TRANSACTION_METHODS]).default('all'),
  status: z.enum(['all', 'pending', 'paid']).default('all'),
  userId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().refine(n => [10, 25, 50].includes(n), 'Ukuran halaman tidak valid').default(25)
})

export const DASHBOARD_RANGES = [7, 30, 90] as const
/** GET /api/admin/dashboard query. */
export const adminDashboardQuery = z.object({
  days: z.coerce.number().int().refine(n => (DASHBOARD_RANGES as readonly number[]).includes(n), 'Rentang tidak valid').default(30)
})

/** User self-checkout: pick a package to pay for. */
export const checkoutSchema = z.object({ packageId: z.uuid('Pilih paket') })

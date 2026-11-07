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

import { sql } from 'drizzle-orm'
import { bigint, boolean, check, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps, softDelete } from './columns'

/** A subscription package sold to users. Archived (soft-deleted), never removed: transactions refer to it. */
export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  /** Whole rupiah. */
  price: bigint('price', { mode: 'number' }).notNull(),
  durationDays: integer('duration_days').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  ...softDelete
}, t => [
  check('packages_price_ck', sql`${t.price} >= 0`),
  check('packages_duration_ck', sql`${t.durationDays} between 1 and 3660`)
])

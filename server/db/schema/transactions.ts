import { sql } from 'drizzle-orm'
import { bigint, check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { users } from './users'
import { packages } from './packages'

export const transactionMethodEnum = pgEnum('transaction_method', ['manual', 'sumopay'])
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'paid', 'failed', 'refunded', 'cancelled'])

/**
 * One payment for a package. A paid transaction grants the package from
 * period_start to period_end; the user's active package is the paid
 * transaction whose period covers now. Package and user details are copied
 * so the record stays correct after a package is edited or a user deleted.
 */
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Order code the user writes in the transfer note (self-checkout), e.g. RK-261107-7KQ2. */
  code: text('code').unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  packageId: uuid('package_id').references(() => packages.id, { onDelete: 'set null' }),
  packageName: text('package_name').notNull(),
  durationDays: integer('duration_days').notNull(),
  /** Whole rupiah actually charged (may differ from the package price, e.g. a discount). */
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  method: transactionMethodEnum('method').notNull(),
  status: transactionStatusEnum('status').notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  /** Gateway payment id (SumoPay payment_id) or the admin's transfer reference. */
  reference: text('reference'),
  /** SumoPay hosted payment page for a pending order, and when that link stops working. */
  paymentUrl: text('payment_url'),
  paymentExpiresAt: timestamp('payment_expires_at', { withTimezone: true }),
  notes: text('notes'),
  /** Admin who recorded a manual transaction. */
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  ...timestamps
}, t => [
  index('transactions_user_idx').on(t.userId, t.periodEnd),
  index('transactions_created_idx').on(t.createdAt),
  // FK lookups: usage per package, and the ON DELETE SET NULL scans.
  index('transactions_package_idx').on(t.packageId),
  index('transactions_created_by_idx').on(t.createdBy).where(sql`${t.createdBy} is not null`),
  check('transactions_amount_ck', sql`${t.amount} >= 0`),
  check('transactions_period_ck', sql`${t.periodEnd} is null or ${t.periodEnd} > ${t.periodStart}`)
])

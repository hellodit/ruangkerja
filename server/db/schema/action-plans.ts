import { sql } from 'drizzle-orm'
import { type AnyPgColumn, date, index, pgEnum, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps, softDelete, num } from './columns'
import { evaluationPeriods } from './evaluation-periods'
import { rhks } from './rhks'

export const actionPlanStatusEnum = pgEnum('action_plan_status', ['belum_dimulai', 'berjalan', 'selesai'])

export const actionPlans = pgTable('action_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  rhkId: uuid('rhk_id').notNull().references(() => rhks.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => evaluationPeriods.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  target: num('target').notNull(),
  unit: text('unit').notNull(),
  dueDate: date('due_date', { mode: 'string' }).notNull(),
  status: actionPlanStatusEnum('status').notNull().default('belum_dimulai'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  copiedFromId: uuid('copied_from_id').references((): AnyPgColumn => actionPlans.id, { onDelete: 'set null' }),
  position: smallint('position').notNull().default(0),
  ...timestamps,
  ...softDelete
}, t => [
  index('action_plans_period_rhk_idx').on(t.periodId, t.rhkId),
  // FK lookups: plans of one RHK (copy, export, RHK cascade) and the
  // ON DELETE SET NULL scan for copies of a deleted plan.
  index('action_plans_rhk_idx').on(t.rhkId),
  index('action_plans_copied_from_idx').on(t.copiedFromId).where(sql`${t.copiedFromId} is not null`)
])

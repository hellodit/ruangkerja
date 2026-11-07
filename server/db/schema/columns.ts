import { numeric, timestamp } from 'drizzle-orm/pg-core'

/** created_at / updated_at, both timestamptz; updated_at is bumped by Drizzle on every update. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}

/** Soft delete marker: rows with deleted_at set are hidden from every view. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}

/** numeric that reads/writes JS numbers (targets and realizations are small decimals). */
export const num = (name: string) => numeric(name, { precision: 12, scale: 2, mode: 'number' })

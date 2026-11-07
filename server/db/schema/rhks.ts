import { index, pgEnum, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps, softDelete } from './columns'
import { skps } from './skps'

export const rhkTypeEnum = pgEnum('rhk_type', ['utama', 'tambahan'])

export const rhks = pgTable('rhks', {
  id: uuid('id').primaryKey().defaultRandom(),
  skpId: uuid('skp_id').notNull().references(() => skps.id, { onDelete: 'cascade' }),
  number: smallint('number').notNull(),
  type: rhkTypeEnum('type').notNull().default('utama'),
  statement: text('statement').notNull(),
  supervisorRhk: text('supervisor_rhk'),
  ...timestamps,
  ...softDelete
}, t => [index('rhks_skp_idx').on(t.skpId)])

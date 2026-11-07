import { index, pgEnum, pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core'
import { num } from './columns'
import { rhks } from './rhks'

export const indicatorAspectEnum = pgEnum('indicator_aspect', ['kuantitas', 'kualitas', 'waktu', 'biaya'])

export const rhkIndicators = pgTable('rhk_indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  rhkId: uuid('rhk_id').notNull().references(() => rhks.id, { onDelete: 'cascade' }),
  aspect: indicatorAspectEnum('aspect').notNull(),
  indicator: text('indicator').notNull(),
  target: num('target').notNull(),
  unit: text('unit').notNull(),
  position: smallint('position').notNull().default(0)
}, t => [index('rhk_indicators_rhk_idx').on(t.rhkId)])

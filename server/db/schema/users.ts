import { sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  timezone: text('timezone').notNull().default('Asia/Jakarta'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  // 'admin' opens the admin panel. Never settable through the API: granted
  // with scripts/set-role.ts only.
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  ...timestamps
}, t => [
  check('users_role_check', sql`${t.role} in ('user', 'admin')`),
  // Admin user list (newest first) and sign-ups per day.
  index('users_created_at_idx').on(t.createdAt)
])

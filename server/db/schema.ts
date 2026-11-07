import { relations, sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())
}

const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}

/** numeric that reads/writes JS numbers (targets and realizations are small decimals). */
const num = (name: string) => numeric(name, { precision: 12, scale: 2, mode: 'number' })

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const genderEnum = pgEnum('gender', ['perempuan', 'laki_laki'])
export const employmentStatusEnum = pgEnum('employment_status', ['pns', 'pppk'])
export const progressViewEnum = pgEnum('progress_view', ['list', 'calendar'])
export const evaluationFrequencyEnum = pgEnum('evaluation_frequency', ['monthly', 'quarterly'])
export const rhkTypeEnum = pgEnum('rhk_type', ['utama', 'tambahan'])
export const indicatorAspectEnum = pgEnum('indicator_aspect', ['kuantitas', 'kualitas', 'waktu', 'biaya'])
export const actionPlanStatusEnum = pgEnum('action_plan_status', ['belum_dimulai', 'berjalan', 'selesai'])
export const inputMethodEnum = pgEnum('input_method', ['typed', 'voice'])
export const progressCategoryEnum = pgEnum('progress_category', ['biasa', 'perlu_diskusi'])
export const aiTargetTypeEnum = pgEnum('ai_target_type', ['progress_description', 'realization'])
export const realizationStatusEnum = pgEnum('realization_status', ['draf', 'disalin'])
export const uploadKindEnum = pgEnum('upload_kind', ['avatar'])

// ---------------------------------------------------------------------------
// Better Auth core tables (plural names via modelName). Property names are what
// Better Auth reads; column names are snake_case.
// ---------------------------------------------------------------------------

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
}, t => [check('users_role_check', sql`${t.role} in ('user', 'admin')`)])

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  ...timestamps
}, t => [index('sessions_user_id_idx').on(t.userId)])

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  password: text('password'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  ...timestamps
}, t => [index('accounts_user_id_idx').on(t.userId)])

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps
}, t => [index('verifications_identifier_idx').on(t.identifier)])

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull()
})

// ---------------------------------------------------------------------------
// Profile and settings
// ---------------------------------------------------------------------------

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  phoneWhatsapp: text('phone_whatsapp'),
  /** Encrypted (AES-256-GCM) — personal data, never sent to AI. */
  birthDate: text('birth_date'),
  gender: genderEnum('gender'),
  /** Encrypted. */
  address: text('address'),
  /** Encrypted. Optional. */
  nip: text('nip'),
  employmentStatus: employmentStatusEnum('employment_status'),
  rankGrade: text('rank_grade'),
  positionTitle: text('position_title'),
  workUnit: text('work_unit'),
  agency: text('agency'),
  supervisorName: text('supervisor_name'),
  supervisorTitle: text('supervisor_title'),
  ...timestamps
})

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  remindBeforeDeadline: boolean('remind_before_deadline').notNull().default(true),
  remindDaysBefore: smallint('remind_days_before').notNull().default(3),
  remindDaily: boolean('remind_daily').notNull().default(true),
  remindDailyTime: time('remind_daily_time').notNull().default('16:00'),
  progressView: progressViewEnum('progress_view').notNull().default('list'),
  ...timestamps
})

// ---------------------------------------------------------------------------
// SKP, periods, RHK, indicators
// ---------------------------------------------------------------------------

export const skps = pgTable('skps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: smallint('year').notNull(),
  evaluationFrequency: evaluationFrequencyEnum('evaluation_frequency').notNull().default('monthly'),
  submissionDeadlineDay: smallint('submission_deadline_day').notNull().default(5),
  ...timestamps
}, t => [
  unique('skps_user_year_uq').on(t.userId, t.year),
  check('skps_deadline_day_ck', sql`${t.submissionDeadlineDay} between 1 and 28`)
])

export const evaluationPeriods = pgTable('evaluation_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  skpId: uuid('skp_id').notNull().references(() => skps.id, { onDelete: 'cascade' }),
  sequence: smallint('sequence').notNull(),
  label: text('label').notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  submissionDeadline: date('submission_deadline', { mode: 'string' }).notNull()
}, t => [
  unique('evaluation_periods_skp_seq_uq').on(t.skpId, t.sequence),
  index('evaluation_periods_skp_start_idx').on(t.skpId, t.startDate)
])

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

export const rhkIndicators = pgTable('rhk_indicators', {
  id: uuid('id').primaryKey().defaultRandom(),
  rhkId: uuid('rhk_id').notNull().references(() => rhks.id, { onDelete: 'cascade' }),
  aspect: indicatorAspectEnum('aspect').notNull(),
  indicator: text('indicator').notNull(),
  target: num('target').notNull(),
  unit: text('unit').notNull(),
  position: smallint('position').notNull().default(0)
}, t => [index('rhk_indicators_rhk_idx').on(t.rhkId)])

// ---------------------------------------------------------------------------
// Action plans, daily progress, results and evidence
// ---------------------------------------------------------------------------

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
}, t => [index('action_plans_period_rhk_idx').on(t.periodId, t.rhkId)])

export const dailyProgress = pgTable('daily_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actionPlanId: uuid('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  workDate: date('work_date', { mode: 'string' }).notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  description: text('description').notNull(),
  descriptionRaw: text('description_raw'),
  inputMethod: inputMethodEnum('input_method').notNull().default('typed'),
  realization: num('realization').notNull().default(0),
  category: progressCategoryEnum('category').notNull().default('biasa'),
  marksPlanComplete: boolean('marks_plan_complete').notNull().default(false),
  copiedAt: timestamp('copied_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete
}, t => [
  index('daily_progress_user_date_idx').on(t.userId, t.workDate),
  index('daily_progress_plan_idx').on(t.actionPlanId),
  check('daily_progress_time_ck', sql`${t.endTime} > ${t.startTime}`)
])

export const progressResults = pgTable('progress_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  progressId: uuid('progress_id').notNull().references(() => dailyProgress.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  evidenceUrl: text('evidence_url'),
  position: smallint('position').notNull().default(0),
  ...timestamps
}, t => [index('progress_results_progress_idx').on(t.progressId)])

/** Audit trail for AI suggestions (Rilis 1.1). Schema only in Rilis 1.0. */
export const aiSuggestions = pgTable('ai_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: aiTargetTypeEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  originalText: text('original_text').notNull(),
  suggestedText: text('suggested_text').notNull(),
  model: text('model').notNull(),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---------------------------------------------------------------------------
// Period realization
// ---------------------------------------------------------------------------

export const periodRealizations = pgTable('period_realizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  rhkId: uuid('rhk_id').notNull().references(() => rhks.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => evaluationPeriods.id, { onDelete: 'cascade' }),
  draftText: text('draft_text').notNull(),
  finalText: text('final_text'),
  status: realizationStatusEnum('status').notNull().default('draf'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  copiedAt: timestamp('copied_at', { withTimezone: true })
}, t => [unique('period_realizations_rhk_period_uq').on(t.rhkId, t.periodId)])

export const realizationSources = pgTable('realization_sources', {
  realizationId: uuid('realization_id').notNull().references(() => periodRealizations.id, { onDelete: 'cascade' }),
  progressId: uuid('progress_id').notNull().references(() => dailyProgress.id, { onDelete: 'cascade' })
}, t => [primaryKey({ columns: [t.realizationId, t.progressId] })])

// ---------------------------------------------------------------------------
// Uploads (profile photo only — evidence is stored as links, never files)
// ---------------------------------------------------------------------------

export const pendingUploads = pgTable('pending_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: uploadKindEnum('kind').notNull(),
  objectKey: text('object_key').notNull().unique(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, t => [index('pending_uploads_user_idx').on(t.userId)])

/** Idempotency ledger for SingaPay webhook deliveries. */
export const singapayWebhookEvents = pgTable('singapay_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type'),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
  skps: many(skps)
}))

export const skpsRelations = relations(skps, ({ many }) => ({
  periods: many(evaluationPeriods),
  rhks: many(rhks)
}))

export const evaluationPeriodsRelations = relations(evaluationPeriods, ({ one }) => ({
  skp: one(skps, { fields: [evaluationPeriods.skpId], references: [skps.id] })
}))

export const rhksRelations = relations(rhks, ({ one, many }) => ({
  skp: one(skps, { fields: [rhks.skpId], references: [skps.id] }),
  indicators: many(rhkIndicators),
  actionPlans: many(actionPlans)
}))

export const rhkIndicatorsRelations = relations(rhkIndicators, ({ one }) => ({
  rhk: one(rhks, { fields: [rhkIndicators.rhkId], references: [rhks.id] })
}))

export const actionPlansRelations = relations(actionPlans, ({ one, many }) => ({
  rhk: one(rhks, { fields: [actionPlans.rhkId], references: [rhks.id] }),
  period: one(evaluationPeriods, { fields: [actionPlans.periodId], references: [evaluationPeriods.id] }),
  progress: many(dailyProgress)
}))

export const dailyProgressRelations = relations(dailyProgress, ({ one, many }) => ({
  actionPlan: one(actionPlans, { fields: [dailyProgress.actionPlanId], references: [actionPlans.id] }),
  results: many(progressResults)
}))

export const progressResultsRelations = relations(progressResults, ({ one }) => ({
  progress: one(dailyProgress, { fields: [progressResults.progressId], references: [dailyProgress.id] })
}))

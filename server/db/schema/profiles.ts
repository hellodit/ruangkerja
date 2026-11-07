import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { timestamps } from './columns'
import { users } from './users'

export const genderEnum = pgEnum('gender', ['perempuan', 'laki_laki'])
export const employmentStatusEnum = pgEnum('employment_status', ['pns', 'pppk'])

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  phoneWhatsapp: text('phone_whatsapp'),
  /** Personal data (stored as plaintext), never sent to AI. YYYY-MM-DD. */
  birthDate: text('birth_date'),
  gender: genderEnum('gender'),
  /** Personal data, never sent to AI. */
  address: text('address'),
  /** Personal data, never sent to AI. Optional. */
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

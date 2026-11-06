/**
 * Demo workspace for product demos and ad material (PRD: "Demo bisa dipakai
 * Ghery untuk menyiapkan iklan"). Creates (or recreates) one account with the
 * sample data from the UI design, dated relative to the current week.
 *
 *   NUXT_DATABASE_URL=… NUXT_DATA_ENCRYPTION_KEY=… bun scripts/seed-demo.ts [email] [password]
 *
 * Refuses to run when NODE_ENV=production unless SEED_DEMO_FORCE=1.
 */
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../server/db/schema'
import { encryptWith, parseKey } from '../server/utils/field-crypto'
import { addDays, todayInTimeZone, weekRange } from '../shared/utils/dates'
import { findCurrentPeriod, generatePeriods } from '../shared/utils/periods'

if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_FORCE !== '1') {
  console.error('Refusing to seed demo data in production (set SEED_DEMO_FORCE=1 to override).')
  process.exit(1)
}

const email = (process.argv[2] ?? 'demo@ruangkerja.io').toLowerCase()
const password = process.argv[3] ?? 'demo-ruangkerja-2026'
const url = process.env.NUXT_DATABASE_URL
const keyB64 = process.env.NUXT_DATA_ENCRYPTION_KEY
if (!url || !keyB64) {
  console.error('NUXT_DATABASE_URL and NUXT_DATA_ENCRYPTION_KEY are required.')
  process.exit(1)
}
const key = parseKey(keyB64)
const client = postgres(url, { max: 1 })
const db = drizzle(client, { schema })

const today = todayInTimeZone('Asia/Jakarta')
const year = Number(today.slice(0, 4))
const week = weekRange(today)
const day = (i: number) => addDays(week.start, i)

await db.transaction(async (tx) => {
  await tx.delete(schema.users).where(eq(schema.users.email, email))

  const [user] = await tx.insert(schema.users).values({
    name: 'Rina Puspitasari',
    email,
    emailVerified: true,
    timezone: 'Asia/Jakarta',
    onboardingCompletedAt: new Date()
  }).returning()
  const userId = user!.id

  await tx.insert(schema.accounts).values({ userId, accountId: userId, providerId: 'credential', password: await hashPassword(password) })
  await tx.insert(schema.profiles).values({
    userId,
    phoneWhatsapp: '0812 0000 1234',
    birthDate: encryptWith(key, '1990-05-14'),
    gender: 'perempuan',
    address: encryptWith(key, 'Jl. Melati No. 12, Kecamatan Sukamaju, Kabupaten Contoh'),
    employmentStatus: 'pns',
    rankGrade: 'Penata Muda Tingkat I, III/b',
    positionTitle: 'Analis Kebijakan Ahli Pertama',
    workUnit: 'Bidang Perekonomian',
    agency: 'Bappeda Kabupaten Contoh',
    supervisorName: 'Hendra Wijaya',
    supervisorTitle: 'Kepala Bidang Perekonomian'
  })
  await tx.insert(schema.userSettings).values({ userId })

  const [skp] = await tx.insert(schema.skps).values({ userId, year, evaluationFrequency: 'monthly', submissionDeadlineDay: 5 }).returning()
  const periods = await tx.insert(schema.evaluationPeriods).values(generatePeriods(year, 'monthly', 5).map(p => ({ ...p, skpId: skp!.id }))).returning()
  const period = findCurrentPeriod(periods, today) ?? periods.at(-1)!

  const rhkData = [
    {
      statement: 'Tersusunnya kajian kebijakan perencanaan pembangunan daerah',
      supervisorRhk: 'Meningkatnya kualitas perencanaan pembangunan daerah',
      indicators: [
        { aspect: 'kuantitas' as const, indicator: 'Jumlah dokumen kajian kebijakan', target: 2, unit: 'dokumen' },
        { aspect: 'kualitas' as const, indicator: 'Persentase kajian yang diterima tanpa revisi substansi', target: 80, unit: 'persen' },
        { aspect: 'waktu' as const, indicator: 'Ketepatan waktu penyelesaian kajian', target: 12, unit: 'bulan' }
      ],
      plans: [
        { name: 'Revisi telaahan program ketahanan pangan', target: 1, unit: 'dokumen', due: -1 },
        { name: 'Rekap data indikator dari OPD', target: 6, unit: 'OPD', due: 6 },
        { name: 'Konsultasi bahan kajian dengan Kasubbag', target: 2, unit: 'kali', due: 20 },
        { name: 'Menyusun kerangka kajian perencanaan', target: 1, unit: 'dokumen', due: 2, done: true }
      ]
    },
    {
      statement: 'Terlaksananya fasilitasi forum konsultasi publik',
      supervisorRhk: 'Meningkatnya partisipasi publik dalam perencanaan daerah',
      indicators: [
        { aspect: 'kuantitas' as const, indicator: 'Jumlah forum yang difasilitasi', target: 4, unit: 'forum' },
        { aspect: 'kualitas' as const, indicator: 'Persentase OPD undangan yang hadir', target: 90, unit: 'persen' },
        { aspect: 'waktu' as const, indicator: 'Ketepatan waktu pelaksanaan forum', target: 12, unit: 'bulan' }
      ],
      plans: [
        { name: 'Menyiapkan undangan dan daftar hadir forum', target: 1, unit: 'paket', due: 1, done: true },
        { name: 'Finalisasi notula forum konsultasi publik', target: 1, unit: 'notula', due: 2 }
      ]
    },
    {
      statement: 'Tersusunnya rekomendasi kebijakan bidang ekonomi',
      supervisorRhk: 'Meningkatnya kualitas rekomendasi kebijakan ekonomi daerah',
      indicators: [
        { aspect: 'kuantitas' as const, indicator: 'Jumlah rekomendasi kebijakan yang disampaikan', target: 2, unit: 'rekomendasi' },
        { aspect: 'kualitas' as const, indicator: 'Persentase rekomendasi yang ditindaklanjuti pimpinan', target: 80, unit: 'persen' },
        { aspect: 'waktu' as const, indicator: 'Ketepatan waktu penyampaian rekomendasi', target: 12, unit: 'bulan' }
      ],
      plans: [
        { name: 'Mengumpulkan bahan rekomendasi', target: 5, unit: 'referensi', due: 0, done: true },
        { name: 'Draf rekomendasi kebijakan bidang ekonomi', target: 1, unit: 'draf', due: 14 }
      ]
    }
  ]

  const planIds: Record<string, string> = {}
  for (const [i, r] of rhkData.entries()) {
    const [rhk] = await tx.insert(schema.rhks).values({ skpId: skp!.id, number: i + 1, type: 'utama', statement: r.statement, supervisorRhk: r.supervisorRhk }).returning()
    await tx.insert(schema.rhkIndicators).values(r.indicators.map((ind, j) => ({ ...ind, rhkId: rhk!.id, position: j })))
    for (const [j, p] of r.plans.entries()) {
      const [plan] = await tx.insert(schema.actionPlans).values({
        rhkId: rhk!.id,
        periodId: period.id,
        name: p.name,
        target: p.target,
        unit: p.unit,
        dueDate: day(p.due),
        status: p.done ? 'selesai' : 'berjalan',
        completedAt: p.done ? new Date(`${day(Math.max(0, p.due))}T09:00:00+07:00`) : null,
        position: j
      }).returning()
      planIds[p.name] = plan!.id
    }
  }
  // The last plan has no progress: shows "belum dimulai" + excluded from the draft.
  await tx.update(schema.actionPlans).set({ status: 'belum_dimulai' }).where(eq(schema.actionPlans.id, planIds['Draf rekomendasi kebijakan bidang ekonomi']!))

  const progress = [
    { plan: 'Konsultasi bahan kajian dengan Kasubbag', d: 0, s: '08:30', e: '10:00', text: 'Menyiapkan bahan konsultasi kerangka kajian dengan Kasubbag.', real: 0, ev: 'Bahan-konsultasi-kajian.pdf' },
    { plan: 'Finalisasi notula forum konsultasi publik', d: 0, s: '13:00', e: '15:30', text: 'Mentranskrip rekaman forum konsultasi publik sesi pertama.', real: 0, ev: 'Transkrip-forum-sesi-1.docx' },
    { plan: 'Mengumpulkan bahan rekomendasi', d: 0, s: '15:45', e: '16:30', text: 'Mengumpulkan lima referensi sebagai bahan rekomendasi kebijakan ekonomi.', real: 5, ev: 'Referensi-rekomendasi-ekonomi.pdf', complete: true },
    { plan: 'Rekap data indikator dari OPD', d: 1, s: '08:30', e: '11:30', text: 'Mengirim permintaan data capaian indikator ke enam OPD dan menyiapkan format rekap.', real: 0, ev: 'Format-rekap-indikator.xlsx' },
    { plan: 'Menyiapkan undangan dan daftar hadir forum', d: 1, s: '14:00', e: '15:30', text: 'Mengonfirmasi daftar hadir forum ke sekretariat enam OPD.', real: 1, ev: 'Daftar-hadir-forum.pdf', complete: true },
    { plan: 'Revisi telaahan program ketahanan pangan', d: 2, s: '09:00', e: '11:00', text: 'Menyusun draf revisi telaahan berdasarkan masukan rapat bidang.', real: 0, ev: 'Telaahan-ketahanan-pangan-rev1.docx' },
    { plan: 'Menyusun kerangka kajian perencanaan', d: 2, s: '13:00', e: '15:00', text: 'Menyelesaikan kerangka kajian perencanaan dan mengirimkannya ke Kasubbag.', real: 1, ev: 'Kerangka-kajian-perencanaan.docx', complete: true },
    { plan: 'Konsultasi bahan kajian dengan Kasubbag', d: 3, s: '09:00', e: '11:30', text: 'Membahas kerangka kajian dan catatan perbaikan bersama Kasubbag Perencanaan.', real: 1, ev: 'Catatan-konsultasi-kajian.pdf' },
    { plan: 'Rekap data indikator dari OPD', d: 3, s: '14:15', e: '16:00', text: 'Mengumpulkan dan mengolah data capaian indikator dari empat OPD.', real: 2 },
    { plan: 'Finalisasi notula forum konsultasi publik', d: 4, s: '08:30', e: '10:00', text: 'Rapat koordinasi persiapan forum konsultasi publik bersama enam OPD.', real: 0, ev: 'Daftar-hadir-rakor-forum.pdf' },
    { plan: 'Rekap data indikator dari OPD', d: 4, s: '10:15', e: '12:00', text: 'Mengolah data capaian indikator dari dua OPD untuk bahan kajian kebijakan.', real: 2 },
    { plan: 'Revisi telaahan program ketahanan pangan', d: 4, s: '13:30', e: '15:30', text: 'Merevisi bagian analisis telaahan ketahanan pangan sesuai catatan Kasubbag.', real: 0, ev: 'Telaahan-ketahanan-pangan-rev2.docx' }
  ]
  for (const p of progress) {
    const workDate = day(p.d)
    if (workDate > today) {
      continue
    }
    const [row] = await tx.insert(schema.dailyProgress).values({
      userId,
      actionPlanId: planIds[p.plan]!,
      workDate,
      startTime: p.s,
      endTime: p.e,
      description: p.text,
      realization: p.real,
      marksPlanComplete: !!p.complete
    }).returning()
    await tx.insert(schema.progressResults).values({
      progressId: row!.id,
      name: p.ev ? p.ev.replace(/[-_]/g, ' ').replace(/\.\w+$/, '') : p.text,
      evidenceUrl: p.ev ? `https://drive.google.com/file/d/contoh-${p.ev.toLowerCase().replace(/\W+/g, '-')}` : null
    })
  }
  console.log(`Demo account ready: ${email} / ${password} (${period.label}, minggu ${week.start}–${week.end})`)
})

await client.end()

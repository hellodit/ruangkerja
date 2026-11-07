import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType
} from 'docx'
import { formatDate, formatDateLong, formatDateShort, formatTime } from '../../shared/utils/dates'
import { ASPECT_LABELS, formatNumber, planStatusLabel, RHK_TYPE_LABELS } from '../../shared/utils/plans'

/**
 * RLS-03: the period realization as a real A4 .docx that opens cleanly in
 * Word, WPS and LibreOffice. Per RHK: indicators, the narrative, the action
 * plan table, the evidence links (what e-Kinerja asks for) and the progress
 * entries the narrative was built from (RLS-01). Pure: no database access,
 * so it can be unit tested.
 */
export interface RealizationReport {
  period: { label: string, startDate: string, endDate: string, submissionDeadline: string }
  skpYear: number
  generatedOn: string
  privacyUrl: string
  person: {
    name: string
    nip?: string | null
    rankGrade?: string | null
    positionTitle?: string | null
    workUnit?: string | null
    agency?: string | null
    supervisorName?: string | null
    supervisorTitle?: string | null
  }
  rhks: Array<{
    number: number
    type: keyof typeof RHK_TYPE_LABELS
    statement: string
    indicators: Array<{ aspect: keyof typeof ASPECT_LABELS, indicator: string, target: number, unit: string }>
    text: string
    plans: Array<{ name: string, target: number, unit: string, realization: number, evidence: number, status: ActionPlanStatus, overdue: boolean }>
    sources: Array<{
      workDate: string
      startTime: string
      endTime: string
      planName: string
      description: string
      realization: number
      unit: string
      evidence: Array<{ name: string, url: string }>
    }>
    excluded: string[]
  }>
}

type ActionPlanStatus = 'belum_dimulai' | 'berjalan' | 'selesai'

// A4 portrait, margins 2.5 cm left/top/bottom and 2 cm right.
const MM = 56.6929
const PAGE = { width: Math.round(210 * MM), height: Math.round(297 * MM) }
const MARGIN = { top: Math.round(25 * MM), bottom: Math.round(25 * MM), left: Math.round(25 * MM), right: Math.round(20 * MM), header: Math.round(12 * MM), footer: Math.round(12 * MM) }
const CONTENT = PAGE.width - MARGIN.left - MARGIN.right

// CTM colors (no '#'): text primary/secondary/tertiary, border, header fill, link.
const C = { text: '0F172A', secondary: '475569', muted: '64748B', border: 'CBD5E1', fill: 'F1F5F9', link: '2563EB', warning: 'B45309' }
const PT = (n: number) => n * 2

const thin = { style: BorderStyle.SINGLE, size: 4, color: C.border }
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const GRID = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin }
const NO_BORDERS = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }

function run(text: string, opts: { bold?: boolean, italics?: boolean, size?: number, color?: string } = {}) {
  return new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })
}

function para(children: (TextRun | ExternalHyperlink)[], opts: { after?: number, before?: number, keepNext?: boolean, alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({ children, spacing: { after: opts.after ?? 0, before: opts.before ?? 0 }, keepNext: opts.keepNext, alignment: opts.alignment })
}

function link(text: string, url: string, size = PT(10)) {
  return new ExternalHyperlink({ link: url, children: [new TextRun({ text, style: 'Hyperlink', size })] })
}

/** A table whose column widths are fixed in twips (honored by Word, WPS and LibreOffice). */
function table(widthsPct: number[], header: string[] | null, rows: (string | Paragraph[])[][], opts: { borders?: boolean } = {}) {
  const widths = widthsPct.map(p => Math.round(CONTENT * p / 100))
  const cell = (content: string | Paragraph[], i: number, head = false) => new TableCell({
    width: { size: widths[i]!, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: head ? { type: ShadingType.CLEAR, fill: C.fill, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: typeof content === 'string'
      ? [para([run(content, { bold: head, size: PT(head ? 9 : 10), color: head ? C.secondary : C.text })])]
      : content
  })
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: opts.borders === false ? NO_BORDERS : GRID,
    rows: [
      ...(header ? [new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, i, true)) })] : []),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i)) }))
    ]
  })
}

function sectionLabel(text: string) {
  return para([new TextRun({ text, allCaps: true, bold: true, size: PT(8.5), color: C.muted, characterSpacing: 20 })], { before: 200, after: 80, keepNext: true })
}

export function reportFileName(r: Pick<RealizationReport, 'period' | 'person'>) {
  const slug = (s: string) => s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  return `Realisasi-${slug(r.period.label)}-${r.period.startDate.slice(0, 4)}-${slug(r.person.name) || 'RuangKerja'}.docx`
}

export function buildRealizationDocument(r: RealizationReport): Document {
  const p = r.person
  const totals = {
    plans: r.rhks.reduce((n, x) => n + x.plans.length, 0),
    done: r.rhks.reduce((n, x) => n + x.plans.filter(pl => pl.status === 'selesai').length, 0),
    progress: r.rhks.reduce((n, x) => n + x.sources.length, 0),
    evidence: r.rhks.reduce((n, x) => n + x.sources.reduce((m, s) => m + s.evidence.length, 0), 0)
  }

  const identity: [string, string | null | undefined][] = [
    ['Nama', p.name],
    ['NIP', p.nip],
    ['Pangkat/golongan', p.rankGrade],
    ['Jabatan', p.positionTitle],
    ['Unit kerja', p.workUnit],
    ['Instansi', p.agency],
    ['Atasan langsung', [p.supervisorName, p.supervisorTitle].filter(Boolean).join(', ') || null],
    ['Periode', `${r.period.label} (${formatDate(r.period.startDate)} – ${formatDate(r.period.endDate)}), SKP ${r.skpYear}`],
    ['Batas pengisian', formatDateLong(r.period.submissionDeadline)]
  ]

  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run('Draf Realisasi Kinerja')], spacing: { after: 60 } }),
    para([run(`${r.period.label} · ${formatDate(r.period.startDate)} – ${formatDate(r.period.endDate)}`, { size: PT(11), color: C.secondary })], { after: 240 }),
    table([28, 72], null, identity.filter(([, v]) => v).map(([k, v]) => [
      [para([run(k, { size: PT(10), color: C.secondary })])],
      [para([run(String(v), { size: PT(10) })])]
    ]), { borders: false }),
    para([run(`${totals.plans} rencana aksi · ${totals.done} selesai · ${totals.progress} progres harian · ${totals.evidence} bukti dukung`, { size: PT(10), color: C.secondary })], { before: 200, after: 120 })
  ]

  if (!r.rhks.length) {
    children.push(para([run('Belum ada RHK pada SKP ini.', { italics: true })]))
  }

  for (const x of r.rhks) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      keepNext: true,
      children: [run(`RHK ${x.number} · ${RHK_TYPE_LABELS[x.type]}`)]
    }))
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [run(x.statement)] }))

    if (x.indicators.length) {
      children.push(sectionLabel('Indikator kinerja individu'))
      children.push(table([18, 60, 22], ['Aspek', 'Indikator', 'Target tahunan'], x.indicators.map(i => [
        ASPECT_LABELS[i.aspect], i.indicator, `${formatNumber(i.target)} ${i.unit}`
      ])))
    }

    children.push(sectionLabel('Realisasi'))
    const text = x.text.trim()
    if (text) {
      for (const block of text.split(/\n\n+/)) {
        children.push(para([run(block)], { after: 120 }))
      }
    } else {
      children.push(para([run('Belum ada progres harian pada periode ini. Realisasi tidak diisi otomatis.', { italics: true, color: C.secondary })], { after: 120 }))
    }

    if (x.plans.length) {
      children.push(sectionLabel('Rencana aksi'))
      children.push(table([42, 17, 13, 10, 18], ['Rencana aksi', 'Target', 'Realisasi', 'Bukti', 'Status'], x.plans.map(pl => [
        pl.name,
        `${formatNumber(pl.target)} ${pl.unit}`,
        formatNumber(pl.realization),
        String(pl.evidence),
        pl.overdue ? 'Lewat tenggat' : planStatusLabel(pl.status)
      ])))
    }
    if (x.excluded.length) {
      children.push(para([run(`Belum punya progres harian, tidak dimasukkan ke realisasi: ${x.excluded.join('; ')}.`, { italics: true, size: PT(9), color: C.warning })], { before: 80 }))
    }

    const evidence = x.sources.flatMap(s => s.evidence.map(e => ({ ...e, date: s.workDate })))
    children.push(sectionLabel('Bukti dukung'))
    if (evidence.length) {
      for (const e of evidence) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [run(`${e.name} (${formatDateShort(e.date)}) `, { size: PT(10) }), link(e.url, e.url, PT(9))]
        }))
      }
    } else {
      children.push(para([run('Belum ada tautan bukti dukung.', { italics: true, size: PT(10), color: C.secondary })]))
    }

    if (x.sources.length) {
      children.push(sectionLabel(`Sumber: ${x.sources.length} progres harian`))
      children.push(table([20, 25, 41, 14], ['Tanggal dan jam', 'Rencana aksi', 'Uraian', 'Realisasi'], x.sources.map(s => [
        `${formatDateShort(s.workDate)}\n${formatTime(s.startTime)}–${formatTime(s.endTime)}`,
        s.planName,
        s.description,
        s.realization ? `${formatNumber(s.realization)} ${s.unit}` : '0'
      ]).map(row => row.map(c => (c.includes('\n') ? c.split('\n').map((line, i) => para([run(line, { size: PT(10), color: i ? C.secondary : C.text })])) : c)))))
    }
  }

  children.push(para([
    run('Draf personal, disusun hanya dari progres harian yang dicatat pengguna. Periksa kembali sebelum disalin ke e-Kinerja. Kebijakan privasi: ', { size: PT(8.5), italics: true, color: C.muted }),
    link(r.privacyUrl, r.privacyUrl, PT(8.5))
  ], { before: 360 }))

  return new Document({
    creator: 'RuangKerja',
    title: `Draf Realisasi ${r.period.label} ${r.skpYear}`,
    description: `Draf realisasi kinerja ${p.name}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: PT(11), color: C.text }, paragraph: { spacing: { line: 276 } } },
        title: { run: { font: 'Calibri', size: PT(20), bold: true, color: C.text } },
        heading1: { run: { font: 'Calibri', size: PT(13), bold: true, color: C.text }, paragraph: { spacing: { before: 360, after: 40 } } },
        heading2: { run: { font: 'Calibri', size: PT(11.5), bold: false, color: C.text }, paragraph: { spacing: { before: 0, after: 80 } } },
        hyperlink: { run: { color: C.link, underline: {} } }
      }
    },
    sections: [{
      properties: { page: { size: PAGE, margin: MARGIN } },
      headers: {
        default: new Header({ children: [para([run(`Draf Realisasi ${r.period.label} ${r.skpYear} · ${p.name}`, { size: PT(8.5), color: C.muted })], { alignment: AlignmentType.RIGHT })] })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: CONTENT }],
            children: [
              run(`Dibuat dengan RuangKerja, ${formatDateLong(r.generatedOn)}`, { size: PT(8.5), color: C.muted }),
              new TextRun({ children: ['\tHalaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], size: PT(8.5), color: C.muted })
            ]
          })]
        })
      },
      children
    }]
  })
}

export function buildRealizationDocx(r: RealizationReport): Promise<Buffer> {
  return Packer.toBuffer(buildRealizationDocument(r))
}

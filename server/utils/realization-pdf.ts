import PdfPrinter from 'pdfmake'
import vfs from 'pdfmake/build/vfs_fonts.js'
import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatDate, formatDateLong, formatDateShort, formatTime } from '../../shared/utils/dates'
import { ASPECT_LABELS, formatNumber, planStatusLabel, RHK_TYPE_LABELS } from '../../shared/utils/plans'
import type { RealizationReport } from './realization-docx'

/**
 * RLS-03: the same report as the .docx, as an A4 PDF (pdfmake, pure JS so it
 * runs on Vercel). Fonts come from pdfmake's bundled Roboto, embedded and
 * subset in the file, so the PDF looks the same everywhere.
 */
const fontData = vfs as unknown as Record<string, string>
const font = (name: string) => Buffer.from(fontData[name]!, 'base64')
let printer: PdfPrinter | null = null
function getPrinter() {
  printer ??= new PdfPrinter({
    Roboto: {
      normal: font('Roboto-Regular.ttf'),
      bold: font('Roboto-Medium.ttf'),
      italics: font('Roboto-Italic.ttf'),
      bolditalics: font('Roboto-MediumItalic.ttf')
    }
  })
  return printer
}

// A4, margins 2.5 cm left/top/bottom and 2 cm right (same as the .docx).
const MM = 72 / 25.4
const MARGIN: [number, number, number, number] = [25 * MM, 25 * MM, 20 * MM, 25 * MM]
const C = { text: '#0F172A', secondary: '#475569', muted: '#64748B', border: '#CBD5E1', fill: '#F1F5F9', link: '#2563EB', warning: '#B45309' }

const grid = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => C.border,
  vLineColor: () => C.border,
  paddingLeft: () => 5,
  paddingRight: () => 5,
  paddingTop: () => 3.5,
  paddingBottom: () => 3.5,
  fillColor: (row: number) => (row === 0 ? C.fill : null)
}

function table(widths: string[], header: string[] | null, rows: TableCell[][], borders = true): ContentTable {
  return {
    table: {
      widths,
      headerRows: header ? 1 : 0,
      keepWithHeaderRows: header ? 1 : 0,
      dontBreakRows: true,
      body: [
        ...(header ? [header.map(h => ({ text: h, bold: true, fontSize: 8.5, color: C.secondary }))] : []),
        ...rows
      ]
    },
    layout: borders ? grid : 'noBorders',
    fontSize: 9.5,
    margin: [0, 0, 0, 4]
  }
}

// headlineLevel marks nodes that must not end a page (see pageBreakBefore).
const label = (text: string): Content => ({ text: text.toUpperCase(), bold: true, fontSize: 7.5, color: C.muted, characterSpacing: 0.6, margin: [0, 10, 0, 4], headlineLevel: 1 })
const link = (url: string, fontSize = 8.5): Content => ({ text: url, link: url, color: C.link, decoration: 'underline', fontSize })

export function buildRealizationPdfDefinition(r: RealizationReport): TDocumentDefinitions {
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

  const content: Content[] = [
    { text: 'Draf Realisasi Kinerja', fontSize: 20, bold: true, margin: [0, 0, 0, 2] },
    { text: `${r.period.label} · ${formatDate(r.period.startDate)} – ${formatDate(r.period.endDate)}`, fontSize: 11, color: C.secondary, margin: [0, 0, 0, 12] },
    table(['28%', '72%'], null, identity.filter(([, v]) => v).map(([k, v]) => [
      { text: k, color: C.secondary }, { text: String(v) }
    ]), false),
    { text: `${totals.plans} rencana aksi · ${totals.done} selesai · ${totals.progress} progres harian · ${totals.evidence} bukti dukung`, color: C.secondary, fontSize: 9.5, margin: [0, 8, 0, 4] }
  ]

  if (!r.rhks.length) {
    content.push({ text: 'Belum ada RHK pada SKP ini.', italics: true })
  }

  for (const x of r.rhks) {
    // Keep the RHK title with its statement and the start of what follows.
    content.push({
      unbreakable: true,
      headlineLevel: 1,
      stack: [
        { text: `RHK ${x.number} · ${RHK_TYPE_LABELS[x.type]}`, fontSize: 13, bold: true, margin: [0, 18, 0, 2] },
        { text: x.statement, fontSize: 11.5, margin: [0, 0, 0, 2] }
      ]
    })

    if (x.indicators.length) {
      content.push(label('Indikator kinerja individu'))
      content.push(table(['18%', '60%', '22%'], ['Aspek', 'Indikator', 'Target tahunan'], x.indicators.map(i => [
        ASPECT_LABELS[i.aspect], i.indicator, `${formatNumber(i.target)} ${i.unit}`
      ])))
    }

    content.push(label('Realisasi'))
    const text = x.text.trim()
    if (text) {
      for (const block of text.split(/\n\n+/)) {
        content.push({ text: block, margin: [0, 0, 0, 6] })
      }
    } else {
      content.push({ text: 'Belum ada progres harian pada periode ini. Realisasi tidak diisi otomatis.', italics: true, color: C.secondary, margin: [0, 0, 0, 6] })
    }

    if (x.plans.length) {
      content.push(label('Rencana aksi'))
      content.push(table(['42%', '17%', '13%', '10%', '18%'], ['Rencana aksi', 'Target', 'Realisasi', 'Bukti', 'Status'], x.plans.map(pl => [
        pl.name,
        `${formatNumber(pl.target)} ${pl.unit}`,
        formatNumber(pl.realization),
        String(pl.evidence),
        pl.overdue ? 'Lewat tenggat' : planStatusLabel(pl.status)
      ])))
    }
    if (x.excluded.length) {
      content.push({ text: `Belum punya progres harian, tidak dimasukkan ke realisasi: ${x.excluded.join('; ')}.`, italics: true, fontSize: 8.5, color: C.warning, margin: [0, 2, 0, 0] })
    }

    const evidence = x.sources.flatMap(s => s.evidence.map(e => ({ ...e, date: s.workDate })))
    content.push(label('Bukti dukung'))
    content.push(evidence.length
      ? { ul: evidence.map(e => ({ text: [`${e.name} (${formatDateShort(e.date)}) `, link(e.url)], fontSize: 9.5, margin: [0, 0, 0, 2] })), markerColor: C.muted }
      : { text: 'Belum ada tautan bukti dukung.', italics: true, fontSize: 9.5, color: C.secondary })

    if (x.sources.length) {
      content.push(label(`Sumber: ${x.sources.length} progres harian`))
      content.push(table(['20%', '25%', '41%', '14%'], ['Tanggal dan jam', 'Rencana aksi', 'Uraian', 'Realisasi'], x.sources.map(s => [
        { stack: [formatDateShort(s.workDate), { text: `${formatTime(s.startTime)}–${formatTime(s.endTime)}`, color: C.secondary }] },
        s.planName,
        s.description,
        s.realization ? `${formatNumber(s.realization)} ${s.unit}` : '0'
      ])))
    }
  }

  content.push({
    text: [
      'Draf personal, disusun hanya dari progres harian yang dicatat pengguna. Periksa kembali sebelum disalin ke e-Kinerja. Kebijakan privasi: ',
      link(r.privacyUrl, 8)
    ],
    italics: true,
    fontSize: 8,
    color: C.muted,
    margin: [0, 24, 0, 0]
  })

  return {
    pageSize: 'A4',
    pageMargins: MARGIN,
    info: { title: `Draf Realisasi ${r.period.label} ${r.skpYear}`, author: p.name, creator: 'RuangKerja', subject: 'Draf realisasi kinerja' },
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25, color: C.text },
    // A section label or RHK title in the bottom fifth of a page moves to the
    // next page, so it is never left alone above content that did not fit.
    pageBreakBefore: node => node.headlineLevel === 1 && (node.startPosition?.verticalRatio ?? 0) > 0.8,
    header: () => ({ text: `Draf Realisasi ${r.period.label} ${r.skpYear} · ${p.name}`, alignment: 'right', fontSize: 8, color: C.muted, margin: [MARGIN[0], 12 * MM, MARGIN[2], 0] }),
    footer: (page: number, pages: number) => ({
      columns: [
        { text: `Dibuat dengan RuangKerja, ${formatDateLong(r.generatedOn)}` },
        { text: `Halaman ${page} dari ${pages}`, alignment: 'right' }
      ],
      fontSize: 8,
      color: C.muted,
      margin: [MARGIN[0], 4 * MM, MARGIN[2], 0]
    }),
    content
  }
}

export function buildRealizationPdf(r: RealizationReport): Promise<Buffer> {
  const doc = getPrinter().createPdfKitDocument(buildRealizationPdfDefinition(r))
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

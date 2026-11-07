import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildRealizationDocx, reportFileName, type RealizationReport } from '../../server/utils/realization-docx'

const base: RealizationReport = {
  period: { label: 'Bulanan 11', startDate: '2026-11-01', endDate: '2026-11-30', submissionDeadline: '2026-12-05' },
  skpYear: 2026,
  generatedOn: '2026-11-07',
  privacyUrl: 'https://app.ruangkerja.io/privasi',
  person: {
    name: 'Rina Puspitasari',
    nip: '199005142015032001',
    rankGrade: 'Penata Muda Tingkat I, III/b',
    positionTitle: 'Analis Kebijakan Ahli Pertama',
    workUnit: 'Bidang Perekonomian',
    agency: 'Bappeda Kabupaten Contoh',
    supervisorName: 'Hendra Wijaya',
    supervisorTitle: 'Kepala Bidang Perekonomian'
  },
  rhks: [{
    number: 1,
    type: 'utama',
    statement: 'Tersusunnya kajian kebijakan perencanaan pembangunan daerah',
    indicators: [{ aspect: 'kuantitas', indicator: 'Jumlah dokumen kajian kebijakan', target: 2, unit: 'dokumen' }],
    text: 'Rekap data indikator dari OPD: realisasi 4 dari 6 OPD, masih berjalan.\n\nMenyusun kerangka kajian: selesai 4 November 2026.',
    plans: [
      { name: 'Rekap data indikator dari OPD', target: 6, unit: 'OPD', realization: 4, evidence: 1, status: 'berjalan', overdue: false },
      { name: 'Revisi telaahan', target: 1, unit: 'dokumen', realization: 0, evidence: 0, status: 'berjalan', overdue: true }
    ],
    sources: [{
      workDate: '2026-11-05',
      startTime: '14:15:00',
      endTime: '16:00:00',
      planName: 'Rekap data indikator dari OPD',
      description: 'Mengolah data capaian indikator dari empat OPD.',
      realization: 2,
      unit: 'OPD',
      evidence: [{ name: 'Rekap indikator tahap 1', url: 'https://drive.google.com/file/d/contoh-rekap' }]
    }],
    excluded: ['Draf rekomendasi kebijakan']
  }]
}

async function xmlOf(report: RealizationReport) {
  const zip = await JSZip.loadAsync(await buildRealizationDocx(report))
  const read = (name: string) => zip.file(name)!.async('string')
  const files = Object.keys(zip.files)
  const footers = await Promise.all(files.filter(f => /word\/footer\d*\.xml$/.test(f)).map(read))
  const headers = await Promise.all(files.filter(f => /word\/header\d*\.xml$/.test(f)).map(read))
  return { doc: await read('word/document.xml'), rels: await read('word/_rels/document.xml.rels'), footer: footers.join(''), header: headers.join('') }
}

describe('buildRealizationDocx', () => {
  it('is an A4 page with header, footer and page numbers', async () => {
    const { doc, footer, header } = await xmlOf(base)
    expect(doc).toMatch(/<w:pgSz w:w="11906" w:h="16838"/)
    expect(header).toContain('Draf Realisasi Bulanan 11 2026 · Rina Puspitasari')
    expect(footer).toContain('Halaman ')
    expect(footer).toContain('PAGE')
    expect(footer).toContain('NUMPAGES')
  })

  it('carries the identity, indicators, narrative, plans and evidence of each RHK', async () => {
    const { doc, rels } = await xmlOf(base)
    for (const text of [
      'Draf Realisasi Kinerja', '199005142015032001', 'Hendra Wijaya, Kepala Bidang Perekonomian', 'RHK 1 · Utama',
      'Jumlah dokumen kajian kebijakan', 'realisasi 4 dari 6 OPD', 'Menyusun kerangka kajian', 'Lewat tenggat',
      'Rekap indikator tahap 1', 'Sumber: 1 progres harian', 'Mengolah data capaian indikator dari empat OPD.',
      'tidak dimasukkan ke realisasi: Draf rekomendasi kebijakan', '2 rencana aksi · 0 selesai · 1 progres harian · 1 bukti dukung'
    ]) {
      expect(doc).toContain(text)
    }
    // Evidence and the privacy policy are real hyperlinks.
    expect(rels).toContain('https://drive.google.com/file/d/contoh-rekap')
    expect(rels).toContain('https://app.ruangkerja.io/privasi')
    // Narrative paragraphs stay separate paragraphs.
    expect(doc.indexOf('masih berjalan.')).toBeLessThan(doc.indexOf('Menyusun kerangka kajian'))
  })

  it('leaves out empty identity rows and marks RHKs without progress', async () => {
    const { doc } = await xmlOf({
      ...base,
      person: { name: 'Budi' },
      rhks: [{ ...base.rhks[0]!, text: '', plans: [], sources: [], excluded: [] }]
    })
    expect(doc).not.toContain('>NIP<')
    expect(doc).not.toContain('Atasan langsung')
    expect(doc).toContain('Belum ada progres harian pada periode ini. Realisasi tidak diisi otomatis.')
    expect(doc).toContain('Belum ada tautan bukti dukung.')
  })

  it('escapes XML special characters from user text', async () => {
    const { doc } = await xmlOf({ ...base, rhks: [{ ...base.rhks[0]!, statement: 'Kajian <A> & "B"' }] })
    expect(doc).toContain('Kajian &lt;A&gt; &amp;')
  })
})

describe('reportFileName', () => {
  it('builds an ASCII-safe file name', () => {
    expect(reportFileName(base)).toBe('Realisasi-Bulanan-11-2026-Rina-Puspitasari.docx')
    expect(reportFileName({ ...base, person: { name: 'Siti Nurhaliza, S.E.' } })).toBe('Realisasi-Bulanan-11-2026-Siti-Nurhaliza-SE.docx')
  })
})

describe('buildRealizationPdf', () => {
  it('renders an A4 PDF with the evidence and privacy links as real link annotations', async () => {
    const { buildRealizationPdf } = await import('../../server/utils/realization-pdf')
    const pdf = await buildRealizationPdf(base)
    const raw = pdf.toString('latin1')
    expect(raw.startsWith('%PDF-')).toBe(true)
    expect(raw).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(raw).toContain('/URI (https://drive.google.com/file/d/contoh-rekap)')
    expect(raw).toContain('/URI (https://app.ruangkerja.io/privasi)')
  })

  it('builds a definition with the same sections as the Word export', async () => {
    const { buildRealizationPdfDefinition } = await import('../../server/utils/realization-pdf')
    const json = JSON.stringify(buildRealizationPdfDefinition(base).content)
    for (const text of ['Draf Realisasi Kinerja', '199005142015032001', 'RHK 1 · Utama', 'REALISASI', 'RENCANA AKSI', 'BUKTI DUKUNG', 'SUMBER: 1 PROGRES HARIAN', 'Lewat tenggat', 'tidak dimasukkan ke realisasi']) {
      expect(json).toContain(text)
    }
  })

  it('names the PDF file', () => {
    expect(reportFileName(base, 'pdf')).toBe('Realisasi-Bulanan-11-2026-Rina-Puspitasari.pdf')
  })
})

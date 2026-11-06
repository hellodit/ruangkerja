import { describe, expect, it } from 'vitest'
import { matchesMime, sniffMime } from '../../server/utils/file-signature'

const bytes = (...b: number[]) => new Uint8Array([...b, ...Array.from({ length: 16 - b.length }, () => 0)])
const ascii = (s: string) => new Uint8Array([...new TextEncoder().encode(s), ...Array.from({ length: Math.max(0, 16 - s.length) }, () => 0)])

describe('sniffMime', () => {
  it('detects jpeg', () => {
    expect(sniffMime(bytes(0xFF, 0xD8, 0xFF, 0xE0))).toBe('image/jpeg')
  })

  it('detects png', () => {
    expect(sniffMime(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))).toBe('image/png')
  })

  it('detects webp', () => {
    expect(sniffMime(ascii('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe('image/webp')
  })

  it('does not treat other RIFF files (wav) as webp', () => {
    expect(sniffMime(ascii('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))).toBeNull()
  })

  it('detects pdf', () => {
    expect(sniffMime(ascii('%PDF-1.7\n'))).toBe('application/pdf')
  })

  it('returns null for html disguised as png', () => {
    expect(sniffMime(ascii('<!doctype html>'))).toBeNull()
  })

  it('returns null for too-short input', () => {
    expect(sniffMime(new Uint8Array([0xFF, 0xD8]))).toBeNull()
  })
})

describe('matchesMime', () => {
  it('matches only the declared type', () => {
    const png = bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    expect(matchesMime(png, 'image/png')).toBe(true)
    expect(matchesMime(png, 'image/jpeg')).toBe(false)
  })
})

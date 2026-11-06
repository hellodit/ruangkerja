import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptWith, encryptWith, parseKey } from '../../server/utils/field-crypto'

const key = parseKey(randomBytes(32).toString('base64'))

describe('field crypto', () => {
  it('round-trips and never stores plaintext', () => {
    const c = encryptWith(key, '199005142019032004')
    expect(c.startsWith('v1:')).toBe(true)
    expect(c).not.toContain('1990')
    expect(decryptWith(key, c)).toBe('199005142019032004')
  })

  it('uses a fresh IV each time', () => {
    expect(encryptWith(key, 'x')).not.toBe(encryptWith(key, 'x'))
  })

  it('detects tampering and wrong keys', () => {
    const c = encryptWith(key, 'Jl. Melati 12')
    const tampered = c.slice(0, -2) + (c.endsWith('A') ? 'BB' : 'AA')
    expect(() => decryptWith(key, tampered)).toThrow()
    expect(() => decryptWith(parseKey(randomBytes(32).toString('base64')), c)).toThrow()
  })

  it('rejects short keys', () => {
    expect(() => parseKey(randomBytes(16).toString('base64'))).toThrow()
  })
})

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * AES-256-GCM for personal fields (NIP, tanggal lahir, alamat). Format:
 * "v1:" + base64url(iv[12] | tag[16] | ciphertext). Pure — the key is passed
 * in so it can be unit tested; see useFieldCrypto() for the app key.
 */
const PREFIX = 'v1:'

export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64')
  if (key.length !== 32) {
    throw new Error('NUXT_DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded')
  }
  return key
}

export function encryptWith(key: Buffer, plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64url')
}

export function decryptWith(key: Buffer, value: string): string {
  if (!value.startsWith(PREFIX)) {
    throw new Error('Unknown ciphertext format')
  }
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64url')
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
  decipher.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
}

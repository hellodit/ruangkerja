import { decryptWith, encryptWith, parseKey } from './field-crypto'

let _key: Buffer | undefined

function key() {
  if (!_key) {
    _key = parseKey(useRuntimeConfig().dataEncryptionKey)
  }
  return _key
}

export function encryptField(value: string | null | undefined): string | null {
  return value ? encryptWith(key(), value) : null
}

export function decryptField(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  try {
    return decryptWith(key(), value)
  } catch (err) {
    console.error('[crypto] failed to decrypt field', err)
    return null
  }
}

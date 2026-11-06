/**
 * Magic-byte sniffing for the file types we accept. Pure (no Nuxt globals) so
 * it can be unit tested. 16 bytes is enough for every signature below.
 */
export const SNIFF_BYTES = 16

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) {
    return false
  }
  return signature.every((b, i) => bytes[offset + i] === b)
}

const ascii = (s: string) => Array.from(s, c => c.charCodeAt(0))

export function sniffMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xFF, 0xD8, 0xFF])) {
    return 'image/jpeg'
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'image/png'
  }
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) {
    return 'image/webp'
  }
  if (startsWith(bytes, ascii('%PDF-'))) {
    return 'application/pdf'
  }
  return null
}

export function matchesMime(bytes: Uint8Array, mime: string): boolean {
  return sniffMime(bytes) === mime
}

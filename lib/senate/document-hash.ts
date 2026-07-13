import { createHash } from 'crypto'

/** SHA-256 de un buffer (32 bytes). */
export function sha256Buffer(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest()
}

/** Hash en hex con prefijo 0x (formato blockchain). */
export function sha256Hex(data: Buffer): string {
  return `0x${createHash('sha256').update(data).digest('hex')}`
}

/** Valida formato de hash SHA-256 hex (con o sin 0x). */
export function parseSha256Hex(input: string): Buffer | null {
  const raw = input.trim()
  const hex = raw.startsWith('0x') ? raw.slice(2) : raw
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) return null
  return Buffer.from(hex, 'hex')
}

export function truncateHash(hex: string, head = 10, tail = 8): string {
  if (hex.length <= head + tail + 3) return hex
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`
}

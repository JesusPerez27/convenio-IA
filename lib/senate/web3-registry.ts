/**
 * Registro y verificación de documentos en Sepolia (contrato PdfRegistry).
 * Variables: SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
 */

import { ethers } from 'ethers'
import { sha256Buffer } from './document-hash'

const CONTRACT_ABI = [
  'function registerDocument(bytes32 _fileHash, string calldata _ipfsCid) public',
  'function getDocumentByHash(bytes32 _fileHash) public view returns (bytes32, string memory, address, uint256, uint8)',
  'function isValid(bytes32 _fileHash) public view returns (bool)',
] as const

const STATUS_LABELS: Record<number, string> = {
  0: 'No registrado',
  1: 'Válido',
  2: 'Revocado',
}

export type ChainDocument = {
  fileHash: string
  ipfsCid: string
  issuer: string | null
  timestamp: number | null
  status: number
  statusText: string
  isValid: boolean
  contractAddress: string
}

function getContractAddresses(): string[] {
  const current = process.env.CONTRACT_ADDRESS?.trim()
  const extra = (process.env.CONTRACT_ADDRESSES_VERIFY ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const list: string[] = []
  for (const addr of [current, ...extra]) {
    if (!addr || addr.length !== 42) continue
    const key = addr.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    list.push(addr)
  }
  return list
}

function initializeSigner() {
  const rpc = process.env.SEPOLIA_RPC_URL?.trim()
  const pk = process.env.PRIVATE_KEY?.trim()
  const contractAddress = process.env.CONTRACT_ADDRESS?.trim()

  if (!rpc || !pk || !contractAddress) {
    throw new Error(
      'Faltan variables Web3: SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS en .env.local'
    )
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const wallet = new ethers.Wallet(pk, provider)
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet)
  return { provider, wallet, contract, contractAddress }
}

export async function registerDocumentOnChain(
  fileHash: Buffer,
  ipfsCid: string
): Promise<string> {
  const { contract } = initializeSigner()
  const fileHashBytes32 = `0x${fileHash.toString('hex')}` as `0x${string}`
  const tx = await contract.registerDocument(fileHashBytes32, ipfsCid)
  await tx.wait()
  return tx.hash as string
}

async function getDocumentAtAddress(
  fileHash: Buffer,
  contractAddress: string
): Promise<ChainDocument | null> {
  const rpc = process.env.SEPOLIA_RPC_URL?.trim()
  if (!rpc) {
    throw new Error('SEPOLIA_RPC_URL no está configurado')
  }

  const provider = new ethers.JsonRpcProvider(rpc)
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider)
  const fileHashBytes32 = `0x${fileHash.toString('hex')}` as `0x${string}`

  try {
    const result = await contract.getDocumentByHash(fileHashBytes32)
    const status = Number(result[4])
    return {
      fileHash: String(result[0]),
      ipfsCid: String(result[1] ?? ''),
      issuer: result[2] ? String(result[2]) : null,
      timestamp: result[3] ? Number(result[3]) : null,
      status,
      statusText: STATUS_LABELS[status] ?? 'Desconocido',
      isValid: status === 1,
      contractAddress,
    }
  } catch {
    return null
  }
}

/** Busca el documento en todos los contratos configurados. */
export async function verifyDocumentOnChain(fileHash: Buffer): Promise<ChainDocument> {
  const addresses = getContractAddresses()
  if (!addresses.length) {
    throw new Error(
      'CONTRACT_ADDRESS no configurado. Agrega la dirección del contrato PdfRegistry en .env.local'
    )
  }

  for (const addr of addresses) {
    const doc = await getDocumentAtAddress(fileHash, addr)
    if (doc && doc.status !== 0) return doc
  }

  const fallback = await getDocumentAtAddress(fileHash, addresses[0]!)
  return (
    fallback ?? {
      fileHash: `0x${fileHash.toString('hex')}`,
      ipfsCid: '',
      issuer: null,
      timestamp: null,
      status: 0,
      statusText: STATUS_LABELS[0]!,
      isValid: false,
      contractAddress: addresses[0]!,
    }
  )
}

export function isWeb3Configured(): boolean {
  return Boolean(
    process.env.SEPOLIA_RPC_URL?.trim() &&
      process.env.PRIVATE_KEY?.trim() &&
      process.env.CONTRACT_ADDRESS?.trim()
  )
}

export function isPinataConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT?.trim())
}

/** Re-export para uso en rutas de verificación por hash de buffer. */
export { sha256Buffer }

import { buildDocxBufferFromMarkdown } from './build-docx'
import { parseSha256Hex, sha256Buffer, sha256Hex } from './document-hash'
import { ipfsGatewayUrl, pinFileToIPFS } from './pinata'
import type { InstrumentType } from './types'
import {
  isPinataConfigured,
  isWeb3Configured,
  registerDocumentOnChain,
  verifyDocumentOnChain,
} from './web3-registry'

export type RegisterDocumentInput = {
  textoConvenio: string
  nombreArchivo: string
  sessionId: string
  tipoInstrumento: InstrumentType
  dictamen?: string
}

export type DocumentRegistryResult = {
  status: 'registered' | 'failed'
  fileHashHex: string
  ipfsCid?: string
  ipfsUrl?: string
  txHash?: string
  blockchainStatus?: string
  isValid?: boolean
  hashVerified: boolean
  registeredAt: string
  error?: string
}

export type VerifyDocumentResult = {
  fileHashHex: string
  hashVerified: boolean
  isValid: boolean
  status: string
  ipfsCid: string | null
  ipfsUrl: string | null
  issuer: string | null
  timestamp: number | null
  contractAddressMasked: string | null
}

function safeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim()
  const withExt = base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`
  return withExt.slice(0, 180)
}

export async function registerConvenioDocument(
  input: RegisterDocumentInput
): Promise<DocumentRegistryResult> {
  const registeredAt = new Date().toISOString()
  const filename = safeFileName(input.nombreArchivo)

  if (!isPinataConfigured() || !isWeb3Configured()) {
    return {
      status: 'failed',
      fileHashHex: '',
      hashVerified: false,
      registeredAt,
      error:
        'Credenciales incompletas. Configura PINATA_JWT, SEPOLIA_RPC_URL, PRIVATE_KEY y CONTRACT_ADDRESS en .env.local',
    }
  }

  try {
    const docxBuffer = await buildDocxBufferFromMarkdown(input.textoConvenio)
    const fileHash = sha256Buffer(docxBuffer)
    const fileHashHex = sha256Hex(docxBuffer)

    const ipfsCid = await pinFileToIPFS(docxBuffer, {
      name: filename,
      keyvalues: {
        proyecto: 'ia-convenios-senado',
        session_id: input.sessionId,
        tipo_instrumento: input.tipoInstrumento,
        dictamen: input.dictamen ?? 'sin_dictamen',
        fecha: registeredAt.slice(0, 10),
      },
    })

    const txHash = await registerDocumentOnChain(fileHash, ipfsCid)
    const chainDoc = await verifyDocumentOnChain(fileHash)

    return {
      status: 'registered',
      fileHashHex,
      ipfsCid,
      ipfsUrl: ipfsGatewayUrl(ipfsCid),
      txHash,
      blockchainStatus: chainDoc.statusText,
      isValid: chainDoc.isValid,
      hashVerified: chainDoc.isValid && chainDoc.status === 1,
      registeredAt,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      status: 'failed',
      fileHashHex: '',
      hashVerified: false,
      registeredAt,
      error: msg,
    }
  }
}

export async function verifyConvenioByHash(
  fileHashHex: string
): Promise<VerifyDocumentResult | { error: string }> {
  const hashBuffer = parseSha256Hex(fileHashHex)
  if (!hashBuffer) {
    return { error: 'fileHashHex debe ser SHA-256 en hexadecimal (64 caracteres)' }
  }

  if (!isWeb3Configured()) {
    return { error: 'Blockchain no configurada (SEPOLIA_RPC_URL, CONTRACT_ADDRESS)' }
  }

  const doc = await verifyDocumentOnChain(hashBuffer)
  const hex = `0x${hashBuffer.toString('hex')}`
  const ipfsUrl = doc.ipfsCid ? ipfsGatewayUrl(doc.ipfsCid) : null
  const addr = doc.contractAddress
  const contractAddressMasked = addr
    ? `${addr.slice(0, 10)}…${addr.slice(-8)}`
    : null

  return {
    fileHashHex: hex,
    hashVerified: doc.status !== 0,
    isValid: doc.isValid,
    status: doc.statusText,
    ipfsCid: doc.ipfsCid || null,
    ipfsUrl,
    issuer: doc.issuer,
    timestamp: doc.timestamp,
    contractAddressMasked,
  }
}

/**
 * Subida de archivos a IPFS vía Pinata.
 * Requiere PINATA_JWT en variables de entorno.
 */

const PINATA_API_URL = 'https://api.pinata.cloud'

export type PinataMetadata = {
  name: string
  keyvalues?: Record<string, string>
}

export async function pinFileToIPFS(
  fileBuffer: Buffer,
  metadata: PinataMetadata,
  contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
): Promise<string> {
  const jwt = process.env.PINATA_JWT?.trim()
  if (!jwt) {
    throw new Error('PINATA_JWT no está configurado en .env.local')
  }

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType })
  formData.append('file', blob, metadata.name)
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: metadata.name,
      keyvalues: metadata.keyvalues ?? {},
    })
  )
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
  })

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    const msg =
      typeof errBody === 'object' && errBody !== null && 'error' in errBody
        ? String((errBody as { error: unknown }).error)
        : response.statusText
    throw new Error(`Error al subir a IPFS: ${msg}`)
  }

  const data = (await response.json()) as { IpfsHash?: string }
  if (!data.IpfsHash) {
    throw new Error('Pinata no devolvió IpfsHash')
  }
  return data.IpfsHash
}

export function ipfsGatewayUrl(cid: string): string {
  const gateway =
    process.env.PINATA_GATEWAY_URL?.trim() || 'https://gateway.pinata.cloud/ipfs'
  return `${gateway.replace(/\/$/, '')}/${cid}`
}

/** Descarga el archivo exacto pinneado en IPFS (mismo hash que blockchain). */
export async function fetchFileFromIpfs(cid: string): Promise<Buffer> {
  const url = ipfsGatewayUrl(cid)
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`No se pudo obtener el archivo desde IPFS (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { truncateHash } from '@/lib/senate/document-hash'
import type { VerifyDocumentResult } from '@/lib/senate/register-document'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function sha256HexFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `0x${hashHex}`
}

type Props = {
  open: boolean
  onClose: () => void
}

export function VerifyDocxModal({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localHash, setLocalHash] = useState<string | null>(null)
  const [result, setResult] = useState<VerifyDocumentResult | null>(null)

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setError(null)
    setResult(null)
    setLocalHash(null)
    if (!selected) {
      setFile(null)
      return
    }
    const isDocx =
      selected.name.toLowerCase().endsWith('.docx') ||
      selected.type === DOCX_MIME ||
      selected.type === 'application/octet-stream'
    if (!isDocx) {
      setError('Solo se aceptan archivos .docx')
      setFile(null)
      return
    }
    setFile(selected)
  }

  const handleVerify = async () => {
    if (!file) {
      setError('Seleccione un archivo .docx')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const hash = await sha256HexFromFile(file)
      setLocalHash(hash)

      const res = await fetch('/api/senate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileHashHex: hash }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Error al verificar')
      }
      setResult(data.verification as VerifyDocumentResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al verificar')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setLocalHash(null)
    setResult(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-docx-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-700" aria-hidden />
            <h2 id="verify-docx-title" className="text-sm font-semibold text-slate-900">
              Verificar convenio por hash
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-sm text-slate-600">
            Suba cualquier archivo <strong>.docx</strong> (el nombre no importa). El sistema
            calcula su hash SHA-256 del contenido y lo consulta en blockchain e IPFS.
          </p>

          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800"
          />

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {localHash ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="font-medium text-slate-800">Hash calculado (SHA-256)</p>
              <p className="mt-1 break-all font-mono text-slate-700">{localHash}</p>
            </div>
          ) : null}

          {result ? (
            <div
              className={`rounded-md border p-3 text-sm ${
                result.isValid
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : result.hashVerified
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-red-200 bg-red-50 text-red-950'
              }`}
            >
              <p className="font-semibold">
                {result.isValid
                  ? '✓ Verificado por hash — documento válido en blockchain'
                  : result.hashVerified
                    ? 'Hash encontrado — estado: ' + result.status
                    : '✗ Hash no registrado en blockchain'}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <span className="font-medium">Estado:</span> {result.status}
                </li>
                <li>
                  <span className="font-medium">Hash:</span>{' '}
                  <span className="font-mono">{truncateHash(result.fileHashHex)}</span>
                </li>
                {result.ipfsCid ? (
                  <li>
                    <span className="font-medium">IPFS:</span>{' '}
                    <a
                      href={result.ipfsUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {truncateHash(result.ipfsCid, 12, 10)}
                    </a>
                  </li>
                ) : null}
                {result.timestamp ? (
                  <li>
                    <span className="font-medium">Registrado:</span>{' '}
                    {new Date(result.timestamp * 1000).toLocaleString('es-MX')}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={!file || loading}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Verificando…
                </>
              ) : (
                'Verificar hash'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import type { DocumentRegistryResult } from '@/lib/senate/register-document'
import type { FormalizationResult, ReviewResult } from '@/lib/senate/types'
import { truncateHash } from '@/lib/senate/document-hash'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'

type Props = {
  formalizacion: FormalizationResult | undefined
  revision: ReviewResult | undefined
  textoBorrador: string
  bloqueaExportacion: boolean
  exportando: boolean
  registry: DocumentRegistryResult | null
  registrando: boolean
  onExport: () => void
  onReset: () => void
  onRetryRegister: () => void
  onOpenVerify: () => void
}

export function StepAprobado({
  formalizacion,
  revision,
  textoBorrador,
  bloqueaExportacion,
  exportando,
  registry,
  registrando,
  onExport,
  onReset,
  onRetryRegister,
  onOpenVerify,
}: Props) {
  const registroOk = registry?.status === 'registered' && registry.hashVerified

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
        <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-800" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-emerald-950">
            Listo para revisión humana
          </h2>
          <p className="mt-1 text-sm text-emerald-900">
            El sistema no sustituye la validación del área jurídica ni la firma autorizada.
            Revise el borrador antes de usarlo como documento final.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-slate-700" aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">
            Registro IPFS y verificación por hash
          </h3>
        </div>

        {registrando ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Generando .docx, calculando SHA-256, subiendo a IPFS y registrando en Sepolia…
          </div>
        ) : registroOk ? (
          <div className="mt-3 space-y-2 rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-950">
            <p className="font-semibold">✓ Verificado por hash SHA-256 en blockchain</p>
            <ul className="space-y-1 text-xs">
              <li>
                <span className="font-medium">Hash:</span>{' '}
                <code className="font-mono">{truncateHash(registry.fileHashHex)}</code>
              </li>
              {registry.ipfsCid ? (
                <li>
                  <span className="font-medium">IPFS CID:</span>{' '}
                  <a
                    href={registry.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono underline"
                  >
                    {truncateHash(registry.ipfsCid, 12, 10)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              ) : null}
              {registry.txHash ? (
                <li>
                  <span className="font-medium">Transacción Sepolia:</span>{' '}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${registry.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono underline"
                  >
                    {truncateHash(registry.txHash)}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </li>
              ) : null}
              <li>
                <span className="font-medium">Estado blockchain:</span>{' '}
                {registry.blockchainStatus ?? 'Válido'}
              </li>
            </ul>
          </div>
        ) : registry?.status === 'failed' ? (
          <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Registro pendiente o fallido</p>
                <p className="mt-1 text-xs">{registry.error}</p>
                <p className="mt-2 text-xs">
                  Puede descargar el borrador. El registro en IPFS/blockchain no bloquea la
                  exportación.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetryRegister}
              className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Reintentar registro
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            El registro se ejecutará automáticamente al aprobar el borrador.
          </p>
        )}

        <button
          type="button"
          onClick={onOpenVerify}
          className="mt-3 text-sm font-medium text-slate-700 underline hover:text-slate-900"
        >
          Verificar otro archivo .docx por hash
        </button>
        <p className="mt-1 text-xs text-slate-500">
          El nombre del archivo no afecta la verificación; importa el contenido exacto. Use
          <strong> Descargar Word</strong> aquí (copia desde IPFS) para que coincida con el hash
          registrado.
        </p>
      </section>

      {formalizacion ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Formalización documental</h3>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Forma requerida:</span>{' '}
            {formalizacion.forma_requerida}
          </p>
          <p className="mt-1 text-sm text-slate-700">{formalizacion.justificacion_forma}</p>
          {formalizacion.requiere_registro_abogado_general ? (
            <p className="mt-2 text-sm font-medium text-amber-900">
              Puede requerirse registro o dictamen del abogado general institucional.
            </p>
          ) : null}
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Anexos sugeridos</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-800">
              {formalizacion.anexos_necesarios.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Checklist previo a firma</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-800">
              {formalizacion.checklist_cierre.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          {formalizacion.observaciones.length > 0 ? (
            <div className="mt-3 text-sm text-slate-700">
              <p className="font-medium">Observaciones</p>
              <ul className="mt-1 list-disc pl-5">
                {formalizacion.observaciones.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {revision ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          <p className="font-medium">Dictamen: {revision.dictamen}</p>
          <p className="mt-1">{revision.resumen_ejecutivo}</p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Vista previa del borrador</h3>
        <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-800">
          {textoBorrador}
        </pre>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Nuevo convenio
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={bloqueaExportacion || exportando}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          {exportando ? 'Generando…' : 'Descargar Word (.docx)'}
        </button>
      </div>
      {bloqueaExportacion ? (
        <p className="text-center text-sm text-red-800">
          La exportación está deshabilitada mientras el revisor marque bloqueo.
        </p>
      ) : null}
    </div>
  )
}

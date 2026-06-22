'use client'

import type { FormalizationResult, ReviewResult } from '@/lib/senate/types'
import { CheckCircle2, Download } from 'lucide-react'

type Props = {
  formalizacion: FormalizationResult | undefined
  revision: ReviewResult | undefined
  textoBorrador: string
  bloqueaExportacion: boolean
  exportando: boolean
  onExport: () => void
  onReset: () => void
}

export function StepAprobado({
  formalizacion,
  revision,
  textoBorrador,
  bloqueaExportacion,
  exportando,
  onExport,
  onReset,
}: Props) {
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

'use client'

import type { ReviewResult } from '@/lib/senate/types'
import { Ban } from 'lucide-react'

type Props = {
  revision: ReviewResult | undefined
  onBack: () => void
  onReset: () => void
}

export function StepRechazado({ revision, onBack, onReset }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/90 p-4">
        <Ban className="mt-0.5 h-8 w-8 shrink-0 text-red-800" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-red-950">Revisión desfavorable</h2>
          <p className="mt-1 text-sm text-red-900">
            El dictamen indica riesgo jurídico relevante. Ajuste los datos o el enfoque y
            vuelva a generar, o consulte al área jurídica.
          </p>
        </div>
      </div>

      {revision ? (
        <>
          <p className="text-sm text-slate-800">{revision.resumen_ejecutivo}</p>
          {revision.alertas_criticas.length > 0 ? (
            <ul className="space-y-2">
              {revision.alertas_criticas.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-red-100 bg-white p-3 text-sm text-slate-900"
                >
                  <p className="font-medium">{a.clausula_afectada}</p>
                  <p className="mt-1">{a.observacion}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Volver a datos
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Reiniciar
        </button>
      </div>
    </div>
  )
}

'use client'

import type { ReviewResult } from '@/lib/senate/types'
import { AlertTriangle, Loader2, Scale } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

function aportesDesdeDatos(
  alertas: ReviewResult['alertas_criticas'],
  datos: Record<string, string>
): Record<string, string> {
  const o: Record<string, string> = {}
  for (const a of alertas) {
    o[a.id] = datos[`aporte_alerta_${a.id}`] ?? ''
  }
  return o
}

type Props = {
  textoBorrador: string
  revision: ReviewResult
  datosUsuario: Record<string, string>
  /** Cambia tras cada refinamiento para reiniciar campos */
  sessionUpdatedAt: string
  onBack: () => void
  onRefine: (aportesPorAlerta: Record<string, string>) => void | Promise<void>
  isRefining: boolean
  error: string | null
}

export function StepRevision({
  textoBorrador,
  revision,
  datosUsuario,
  sessionUpdatedAt,
  onBack,
  onRefine,
  isRefining,
  error,
}: Props) {
  const [aportes, setAportes] = useState<Record<string, string>>({})

  useEffect(() => {
    setAportes(aportesDesdeDatos(revision.alertas_criticas, datosUsuario))
  }, [sessionUpdatedAt, revision, datosUsuario])

  const hayAporte = useMemo(
    () => Object.values(aportes).some((t) => t.trim().length > 0),
    [aportes]
  )

  const handleRefine = () => {
    void onRefine(aportes)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Scale className="h-8 w-8 text-slate-700" aria-hidden />
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Dictamen</p>
          <p className="text-xl font-semibold text-slate-900">{revision.dictamen}</p>
          <p className="text-sm text-slate-600">
            Puntuación de riesgo (referencial): {revision.score}/100
          </p>
        </div>
        {revision.bloquea_exportacion ? (
          <span className="ml-auto rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-900">
            Exportación bloqueada
          </span>
        ) : null}
      </div>

      {revision.analisis_consentimiento ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Consentimiento</p>
          <p className="mt-1">
            Indicios de vicio:{' '}
            {revision.analisis_consentimiento.hay_indicios_vicio ? 'sí' : 'no'}.{' '}
            {revision.analisis_consentimiento.nota_breve}
          </p>
        </div>
      ) : null}

      <p className="text-sm text-slate-700">{revision.resumen_ejecutivo}</p>

      {revision.alertas_criticas.length > 0 ? (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Alertas críticas — aportes para nutrir el convenio
          </h3>
          <p className="mb-3 text-xs text-slate-600">
            Redacte en cada campo la información institucional que deba incorporarse al borrador. Luego
            pulse <strong>Integrar y volver a revisar</strong> para generar un nuevo texto y un nuevo
            dictamen.
          </p>
          <ul className="space-y-4">
            {revision.alertas_criticas.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-red-200 bg-red-50/90 p-3 text-sm text-red-950"
              >
                <p className="font-medium">{a.clausula_afectada}</p>
                <p className="mt-1">{a.observacion}</p>
                <p className="mt-1 text-xs opacity-90">{a.fundamento}</p>
                {a.sugerencia ? (
                  <p className="mt-1 text-xs text-red-900/90">
                    <span className="font-medium">Sugerencia del revisor:</span> {a.sugerencia}
                  </p>
                ) : null}
                <label className="mt-3 block" htmlFor={`aporte-${a.id}`}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Aporte humano para esta alerta
                  </span>
                  <textarea
                    id={`aporte-${a.id}`}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="Ej.: montos, fechas de ministración, cuenta CLABE, titularidad de PI, cláusulas de confidencialidad…"
                    value={aportes[a.id] ?? ''}
                    onChange={(e) =>
                      setAportes((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                    disabled={isRefining}
                  />
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              Debe completar al menos un campo con texto no vacío para ejecutar el refinamiento.
            </p>
            <button
              type="button"
              onClick={handleRefine}
              disabled={!hayAporte || isRefining}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Integrando y revisando…
                </>
              ) : (
                'Integrar y volver a revisar'
              )}
            </button>
          </div>
        </div>
      ) : null}

      {revision.alertas_observacion.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Observaciones</h3>
          <ul className="space-y-2">
            {revision.alertas_observacion.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
              >
                <p className="font-medium">{a.clausula_afectada}</p>
                <p className="mt-1">{a.observacion}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Borrador</h3>
        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-800">
          {textoBorrador}
        </pre>
      </div>

      <div className="flex justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isRefining}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Volver a datos
        </button>
      </div>
    </div>
  )
}

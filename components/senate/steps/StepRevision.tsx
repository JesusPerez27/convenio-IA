'use client'

import type { ReviewResult } from '@/lib/senate/types'
import { APORTE_CONSOLIDADO_KEY } from '@/lib/senate/constants'
import { AlertTriangle, Loader2, Scale } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

/** Viñetas orientativas: qué debe aportar el humano según cada alerta. */
function checklistContenido(
  alertas: ReviewResult['alertas_criticas']
): string[] {
  return alertas.map((a) => {
    const cl = a.clausula_afectada.trim()
    const obs = a.observacion.trim()
    const sug = a.sugerencia?.trim()
    let line = ''
    if (cl) line += `${cl}: `
    line += obs || '(sin texto de observación)'
    if (sug) line += ` — Sugerencia del revisor: ${sug}`
    return line
  })
}

/** Texto inicial del cuadro único: consolidado guardado o legado por alerta. */
function textoInicialMejora(
  datos: Record<string, string>,
  alertas: ReviewResult['alertas_criticas']
): string {
  const c = datos.aporte_revision_consolidado?.trim()
  if (c) return c
  const legacy = alertas
    .map((a) => datos[`aporte_alerta_${a.id}`]?.trim())
    .filter(Boolean)
  return legacy.join('\n\n---\n\n')
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
  const [aporteConsolidado, setAporteConsolidado] = useState('')

  useEffect(() => {
    setAporteConsolidado(textoInicialMejora(datosUsuario, revision.alertas_criticas))
  }, [sessionUpdatedAt, revision, datosUsuario])

  const puntosGuia = useMemo(
    () => checklistContenido(revision.alertas_criticas),
    [revision.alertas_criticas]
  )

  const hayAporte = aporteConsolidado.trim().length > 0

  const handleRefine = () => {
    void onRefine({
      [APORTE_CONSOLIDADO_KEY]: aporteConsolidado.trim(),
    })
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
            Alertas críticas y cuadro de mejora
          </h3>

          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50/90 p-3 text-sm text-slate-800">
            <p className="font-medium text-slate-900">Referencia por alerta</p>
            <ul className="mt-2 space-y-3">
              {revision.alertas_criticas.map((a) => (
                <li key={a.id} className="border-l-2 border-red-200 pl-3">
                  <p className="font-medium text-slate-900">{a.clausula_afectada}</p>
                  <p className="mt-0.5 text-slate-700">{a.observacion}</p>
                  {a.fundamento ? (
                    <p className="mt-1 text-xs text-slate-600">{a.fundamento}</p>
                  ) : null}
                  {a.sugerencia ? (
                    <p className="mt-1 text-xs text-slate-700">
                      <span className="font-medium">Sugerencia:</span> {a.sugerencia}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-amber-100 bg-amber-50/80 p-3 text-sm text-amber-950">
            <p className="font-semibold text-amber-950">Qué debe incluir el aporte humano</p>
            <p className="mt-1 text-xs text-amber-900/90">
              Use la lista siguiente como guía; redacte luego el texto completo en el cuadro de abajo.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 pl-1 text-sm">
              {puntosGuia.map((line, i) => (
                <li key={i} className="marker:text-amber-800">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <label className="mt-4 block" htmlFor="aporte-consolidado">
            <span className="text-sm font-semibold text-slate-900">
              Cuadro de mejora (único)
            </span>
            <p className="mt-1 text-xs text-slate-600">
              Incorpore aquí montos, fechas, esquemas de pago, titularidad de PI, confidencialidad,
              datos de cuenta, plazos y cualquier dato institucional que deba quedar en el convenio.
            </p>
            <textarea
              id="aporte-consolidado"
              rows={10}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="Escriba el texto que nutrirá el borrador atendiendo los puntos anteriores…"
              value={aporteConsolidado}
              onChange={(e) => setAporteConsolidado(e.target.value)}
              disabled={isRefining}
            />
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600">
              El cuadro de mejora no puede estar vacío para integrar y volver a revisar.
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

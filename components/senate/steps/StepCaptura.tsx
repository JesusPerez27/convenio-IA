'use client'

import type { CapturistResult, InstrumentType } from '@/lib/senate/types'
import { labelCampo } from '@/lib/senate/field-labels'
import { labelInstrumento } from '@/lib/senate/instrument-labels'
import { ClipboardList } from 'lucide-react'

type Props = {
  tipoInstrumento: InstrumentType
  capturist: CapturistResult | null
  camposFaltantesOrchestrator: string[]
  formData: Record<string, string>
  onField: (key: string, value: string) => void
  camposCriticosPendientes: string[]
  porcentajeCompletitud: number
  puedeGenerarConvenio: boolean
  onGenerar: () => void
  isLoading: boolean
  error: string | null
}

export function StepCaptura({
  tipoInstrumento,
  capturist,
  camposFaltantesOrchestrator,
  formData,
  onField,
  camposCriticosPendientes,
  porcentajeCompletitud,
  puedeGenerarConvenio,
  onGenerar,
  isLoading,
  error,
}: Props) {
  const bloques = capturist?.bloques ?? []
  const fallbackKeys = [
    ...new Set([...camposCriticosPendientes, ...camposFaltantesOrchestrator]),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ClipboardList className="mt-0.5 h-6 w-6 shrink-0 text-slate-600" aria-hidden />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Instrumento detectado
          </p>
          <p className="text-lg font-semibold text-slate-900">
            {labelInstrumento(tipoInstrumento)}
          </p>
          {camposCriticosPendientes.length > 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              Faltan datos esenciales:{' '}
              {camposCriticosPendientes.map(labelCampo).join('; ')}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-800">
              Datos mínimos cubiertos. Puede generar el borrador o completar campos opcionales.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>Completitud de campos críticos</span>
          <span>{porcentajeCompletitud}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-slate-700 transition-all"
            style={{ width: `${porcentajeCompletitud}%` }}
          />
        </div>
      </div>

      <div className="space-y-8">
        {bloques.length === 0 && fallbackKeys.length > 0 ? (
          <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Campos a completar
            </h3>
            <div className="space-y-4">
              {fallbackKeys.map((raw) => {
                const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-800">
                      {labelCampo(raw)}
                    </label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      value={formData[key] ?? ''}
                      onChange={(e) => onField(key, e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {bloques.map((bloque) => (
          <section
            key={bloque.titulo}
            className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{bloque.titulo}</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  bloque.prioridad === 'alta'
                    ? 'bg-red-100 text-red-800'
                    : bloque.prioridad === 'media'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {bloque.prioridad}
              </span>
            </div>
            <div className="space-y-4">
              {bloque.preguntas.map((p) => {
                const key = p.campo.trim().toLowerCase().replace(/\s+/g, '_')
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-800">
                      {p.pregunta}
                      {p.obligatorio ? (
                        <span className="text-red-600"> *</span>
                      ) : null}
                    </label>
                    {p.explicacion ? (
                      <p className="mt-0.5 text-xs text-slate-600">{p.explicacion}</p>
                    ) : null}
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      placeholder={p.placeholder}
                      value={formData[key] ?? ''}
                      onChange={(e) => onField(key, e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onGenerar}
          disabled={!puedeGenerarConvenio || isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Procesando…' : 'Generar borrador y revisión'}
        </button>
      </div>
    </div>
  )
}

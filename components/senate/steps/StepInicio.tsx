'use client'

import { MIN_DESCRIPCION_CLASIFICAR } from '@/lib/senate/constants'
import { FileText } from 'lucide-react'

type Props = {
  userInput: string
  onUserInput: (v: string) => void
  onClassify: () => void
  isLoading: boolean
  error: string | null
}

export function StepInicio({
  userInput,
  onUserInput,
  onClassify,
  isLoading,
  error,
}: Props) {
  const n = userInput.trim().length
  const okMin = n >= MIN_DESCRIPCION_CLASIFICAR

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <FileText className="mt-0.5 h-6 w-6 shrink-0 text-slate-600" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Descripción del convenio
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Describa la necesidad institucional, partes, objeto aproximado y cualquier dato
            relevante. El sistema clasificará el instrumento y solicitará los datos faltantes.
          </p>
        </div>
      </div>
      <textarea
        id="descripcion-convenio"
        className="min-h-[200px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        placeholder="Ej.: Convenio general de colaboración entre la UJAT y una asociación civil para actividades académicas en Tabasco…"
        value={userInput}
        onChange={(e) => onUserInput(e.target.value)}
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            if (!isLoading) onClassify()
          }
        }}
        aria-describedby="desc-convenio-hint"
      />
      <p
        id="desc-convenio-hint"
        className={`text-xs ${okMin ? 'text-slate-500' : 'text-amber-800'}`}
      >
        {n} caracteres · mínimo {MIN_DESCRIPCION_CLASIFICAR} para clasificar
        {!okMin ? ` · faltan ${MIN_DESCRIPCION_CLASIFICAR - n}` : null}
        {' · '}
        <span className="text-slate-500">Atajo: Ctrl+Enter o ⌘+Enter</span>
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClassify}
          disabled={isLoading}
          title={
            !okMin
              ? `Escriba al menos ${MIN_DESCRIPCION_CLASIFICAR} caracteres (puede pulsar igualmente para ver el aviso)`
              : undefined
          }
          className={`rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-60 ${
            okMin
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          {isLoading ? 'Clasificando…' : 'Clasificar y continuar'}
        </button>
      </div>
    </div>
  )
}

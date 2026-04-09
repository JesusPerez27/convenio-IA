'use client'

import { useSenate } from '@/hooks/useSenate'
import { StepInicio } from '@/components/senate/steps/StepInicio'
import { StepCaptura } from '@/components/senate/steps/StepCaptura'
import { StepProcesando } from '@/components/senate/steps/StepProcesando'
import { StepRevision } from '@/components/senate/steps/StepRevision'
import { StepAprobado } from '@/components/senate/steps/StepAprobado'
import { StepRechazado } from '@/components/senate/steps/StepRechazado'

const STEPS: { id: string; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'captura', label: 'Datos' },
  { id: 'procesando', label: 'Proceso' },
  { id: 'revision', label: 'Revisión' },
  { id: 'fin', label: 'Cierre' },
]

function stepIndex(step: string): number {
  if (step === 'inicio') return 0
  if (step === 'captura' || step === 'clasificacion') return 1
  if (step === 'procesando') return 2
  if (step === 'revision') return 3
  if (
    step === 'aprobado' ||
    step === 'formalizacion' ||
    step === 'rechazado'
  )
    return 4
  return 0
}

export function SenateWizard() {
  const s = useSenate()
  const idx = stepIndex(s.step)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-10 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          UJAT · Tabasco
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Senado de Agentes
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Generación asistida de convenios generales y específicos. La salida requiere revisión
          humana antes de su uso institucional.
        </p>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Progreso">
          {STEPS.map((st, i) => (
            <div
              key={st.id}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                i <= idx
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {st.label}
            </div>
          ))}
        </nav>
      </header>

      {s.step === 'inicio' ? (
        <StepInicio
          userInput={s.userInput}
          onUserInput={s.setUserInput}
          onClassify={() => {
            s.clearError()
            void s.classify()
          }}
          isLoading={s.isLoading}
          error={s.error}
        />
      ) : null}

      {s.step === 'captura' || s.step === 'clasificacion' ? (
        <StepCaptura
          tipoInstrumento={s.tipoInstrumento}
          capturist={s.capturist}
          camposFaltantesOrchestrator={s.orchestrator?.campos_faltantes ?? []}
          formData={s.formData}
          onField={s.setField}
          camposCriticosPendientes={s.camposCriticosPendientes}
          porcentajeCompletitud={s.porcentajeCompletitud}
          puedeGenerarConvenio={s.puedeGenerarConvenio}
          onGenerar={() => {
            s.clearError()
            void s.runPipeline()
          }}
          isLoading={s.isLoading}
          error={s.error}
        />
      ) : null}

      {s.step === 'procesando' ? <StepProcesando /> : null}

      {s.step === 'revision' && s.session?.resultado_revision ? (
        <StepRevision
          key={s.session.updated_at}
          textoBorrador={s.session.texto_borrador}
          revision={s.session.resultado_revision}
          datosUsuario={s.session.datos_usuario}
          sessionUpdatedAt={s.session.updated_at}
          onBack={s.backToCapture}
          onRefine={s.refineFromReview}
          isRefining={s.isLoading}
          error={s.error}
        />
      ) : null}

      {s.step === 'rechazado' ? (
        <StepRechazado
          revision={s.session?.resultado_revision}
          onBack={s.backToCapture}
          onReset={s.reset}
        />
      ) : null}

      {(s.step === 'aprobado' || s.step === 'formalizacion') && s.session ? (
        <StepAprobado
          formalizacion={s.formalizacion}
          revision={s.revision}
          textoBorrador={s.session.texto_borrador}
          bloqueaExportacion={s.bloqueaExportacion}
          exportando={s.exportando}
          onExport={() => {
            s.clearError()
            void s.exportDocx()
          }}
          onReset={s.reset}
        />
      ) : null}

      {s.step === 'aprobado' || s.step === 'formalizacion' ? (
        s.error ? (
          <p className="mt-4 text-center text-sm text-red-700" role="alert">
            {s.error}
          </p>
        ) : null
      ) : null}
    </div>
  )
}

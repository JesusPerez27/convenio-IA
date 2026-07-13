'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  CapturistResult,
  FormalizationResult,
  InstrumentType,
  OrchestratorResult,
  ReviewResult,
  SenateSession,
  WizardStep,
} from '@/lib/senate/types'
import {
  CRITICAL_FIELDS_BY_INSTRUMENT,
  getCriticalMissing,
  mergeDatosUsuario,
} from '@/lib/senate/critical-fields'
import { MIN_DESCRIPCION_CLASIFICAR } from '@/lib/senate/constants'
import type { DocumentRegistryResult } from '@/lib/senate/register-document'

function isApprovedStep(step: WizardStep): boolean {
  return step === 'aprobado' || step === 'formalizacion'
}

const SESSION_STORAGE_KEY = 'senado_session_id'

function loadStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function saveSessionId(id: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  } catch {
    /* noop */
  }
}

function clearStoredSessionId() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* noop */
  }
}

export function useSenate() {
  const [step, setStep] = useState<WizardStep>('inicio')
  const [userInput, setUserInput] = useState('')
  const [formData, setFormDataState] = useState<Record<string, string>>({})
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([])
  const [preguntasDinamicas, setPreguntasDinamicas] = useState<string[]>([])
  const [tipoInstrumento, setTipoInstrumento] =
    useState<InstrumentType>('indeterminado')
  const [orchestrator, setOrchestrator] = useState<OrchestratorResult | null>(
    null
  )
  const [capturist, setCapturist] = useState<CapturistResult | null>(null)
  const [session, setSession] = useState<SenateSession | null>(null)
  const [camposCriticosPendientes, setCamposCriticosPendientes] = useState<
    string[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [registry, setRegistry] = useState<DocumentRegistryResult | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = useCallback((key: string, value: string) => {
    const k = key.trim().toLowerCase().replace(/\s+/g, '_')
    setFormDataState((prev) => ({ ...prev, [k]: value }))
  }, [])

  const mergeForm = useCallback((merged: Record<string, string>) => {
    setFormDataState((prev) => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(merged)) {
        const nk = k.trim().toLowerCase().replace(/\s+/g, '_')
        if (v !== undefined && String(v).trim() !== '') next[nk] = String(v).trim()
      }
      return next
    })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const registerSessionDocument = useCallback(
    async (sess: SenateSession, tipo: InstrumentType) => {
      if (!sess.texto_borrador?.trim()) return
      setRegistrando(true)
      setRegistry(null)
      try {
        const res = await fetch('/api/senate/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textoConvenio: sess.texto_borrador,
            nombreArchivo: `convenio_${tipo}_${sess.session_id}.docx`,
            sessionId: sess.session_id,
            tipoInstrumento: tipo,
            dictamen: sess.resultado_revision?.dictamen,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          setRegistry({
            status: 'failed',
            fileHashHex: '',
            hashVerified: false,
            registeredAt: new Date().toISOString(),
            error:
              typeof data.error === 'string' ? data.error : 'Error al registrar en IPFS/blockchain',
          })
          return
        }
        setRegistry(data.registry as DocumentRegistryResult)
      } catch (e) {
        setRegistry({
          status: 'failed',
          fileHashHex: '',
          hashVerified: false,
          registeredAt: new Date().toISOString(),
          error: e instanceof Error ? e.message : 'Error al registrar',
        })
      } finally {
        setRegistrando(false)
      }
    },
    []
  )

  const retryRegister = useCallback(() => {
    if (!session) return
    void registerSessionDocument(session, session.tipo_instrumento)
  }, [session, registerSessionDocument])

  useEffect(() => {
    if (!orchestrator) return
    const merged = mergeDatosUsuario(
      orchestrator.datos_extraidos,
      formData
    )
    setCamposCriticosPendientes(
      getCriticalMissing(orchestrator.tipo_instrumento, merged)
    )
  }, [formData, orchestrator])

  const classify = useCallback(async () => {
    setError(null)
    const trimmed = userInput.trim()
    if (trimmed.length < MIN_DESCRIPCION_CLASIFICAR) {
      setError(
        `Escriba al menos ${MIN_DESCRIPCION_CLASIFICAR} caracteres describiendo el convenio (va ${trimmed.length}).`
      )
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/senate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          userInput,
          datosUsuario: formData,
        }),
      })
      const rawText = await res.text()
      let data: { ok?: boolean; error?: string; [key: string]: unknown }
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {}
      } catch {
        throw new Error(
          `Respuesta inválida del servidor (${res.status}). Si ves HTML, reinicia con: rm -rf .next && npm run dev. Inicio: ${rawText.slice(0, 160)}`
        )
      }
      if (!res.ok || !data.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : `Error al clasificar (${res.status})`
        )
      }
      const orch = data.orchestrator as OrchestratorResult | undefined
      if (!orch || typeof orch !== 'object') {
        throw new Error('Respuesta incompleta del servidor (sin datos del orquestador).')
      }
      setOrchestrator(orch)
      setTipoInstrumento(orch.tipo_instrumento)
      setCamposFaltantes(orch.campos_faltantes ?? [])
      setPreguntasDinamicas(orch.preguntas_dinamicas ?? [])
      setCamposCriticosPendientes(
        (data.campos_criticos_pendientes as string[] | undefined) ?? []
      )
      mergeForm((data.merged as Record<string, string> | undefined) ?? {})
      const cap = data.capturist as CapturistResult | null | undefined
      if (cap) setCapturist(cap)
      else setCapturist(null)
      setStep('captura')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al clasificar')
    } finally {
      setIsLoading(false)
    }
  }, [userInput, formData, mergeForm])

  const refineFromReview = useCallback(
    async (aportesPorAlerta: Record<string, string>) => {
      if (!session?.session_id || !session.resultado_revision) {
        setError('No hay sesión de revisión válida.')
        return
      }
      setError(null)
      setIsLoading(true)
      setStep('procesando')
      try {
        const mergedDatos = mergeDatosUsuario(session.datos_usuario, formData)
        const res = await fetch('/api/senate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'refine_from_review',
            userInput,
            datosUsuario: mergedDatos,
            tipoInstrumento: session.tipo_instrumento,
            sessionId: session.session_id,
            sessionCreatedAt: session.created_at,
            textoBorrador: session.texto_borrador,
            resultadoRevision: session.resultado_revision,
            aportesPorAlerta,
          }),
        })
        const raw = await res.text()
        let data: { ok?: boolean; error?: string; [key: string]: unknown }
        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {}
        } catch {
          throw new Error(
            `Respuesta inválida del servidor (${res.status}). Reinicie con: rm -rf .next && npm run dev`
          )
        }
        if (!res.ok || !data.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : `Error al refinamiento (${res.status})`
          )
        }
        const sess = data.session as SenateSession | undefined
        setSession(sess ?? null)
        if (sess?.datos_usuario) mergeForm(sess.datos_usuario)
        if (data.orchestrator) setOrchestrator(data.orchestrator as OrchestratorResult)
        const ws = data.wizard_step as WizardStep
        const nextStep = ws === 'captura' ? 'captura' : ws
        setStep(nextStep)
        if (isApprovedStep(nextStep) && sess) {
          void registerSessionDocument(sess, sess.tipo_instrumento)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al refinamiento')
        setStep('revision')
      } finally {
        setIsLoading(false)
      }
    },
    [session, userInput, formData, mergeForm, registerSessionDocument]
  )

  const runPipeline = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    setStep('procesando')
    try {
      const sid = session?.session_id ?? loadStoredSessionId() ?? undefined
      const res = await fetch('/api/senate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pipeline',
          userInput,
          datosUsuario: formData,
          sessionId: sid,
        }),
      })
      const rawPipeline = await res.text()
      let data: { ok?: boolean; error?: string; [key: string]: unknown }
      try {
        data = rawPipeline ? (JSON.parse(rawPipeline) as typeof data) : {}
      } catch {
        throw new Error(
          `Respuesta inválida del servidor (${res.status}). Reinicie el servidor o ejecute: rm -rf .next && npm run dev`
        )
      }
      if (!res.ok || !data.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : `Error en el pipeline (${res.status})`
        )
      }
      setOrchestrator(data.orchestrator as OrchestratorResult)
      setTipoInstrumento((data.orchestrator as OrchestratorResult).tipo_instrumento)
      if (data.capturist) setCapturist(data.capturist as CapturistResult)
      const sess = data.session as SenateSession | undefined
      setSession(sess ?? null)
      if (sess?.session_id) {
        saveSessionId(sess.session_id)
      }
      if (sess?.estado === 'captura') {
        setCamposCriticosPendientes(
          (data.orchestrator as OrchestratorResult | undefined)?.campos_faltantes ??
            []
        )
      }
      const ws = data.wizard_step as WizardStep
      const nextStep = ws === 'captura' ? 'captura' : ws
      setStep(nextStep)
      if (isApprovedStep(nextStep) && sess) {
        void registerSessionDocument(sess, sess.tipo_instrumento)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en el pipeline')
      setStep('captura')
    } finally {
      setIsLoading(false)
    }
  }, [userInput, formData, session?.session_id, registerSessionDocument])

  const exportDocx = useCallback(async () => {
    if (!session?.texto_borrador) {
      setError('No hay borrador para exportar')
      return
    }
    if (session.resultado_revision?.bloquea_exportacion) {
      setError('La exportación está bloqueada por el dictamen de revisión.')
      return
    }
    setError(null)
    setExportando(true)
    try {
      const nombreArchivo = `convenio_${tipoInstrumento}_${Date.now()}.docx`
      const payload: Record<string, string> = { nombreArchivo }
      // Mismo archivo exacto registrado en IPFS/blockchain (el hash no depende del nombre)
      if (registry?.ipfsCid) {
        payload.ipfsCid = registry.ipfsCid
      } else {
        payload.textoConvenio = session.texto_borrador
      }

      const res = await fetch('/api/senate/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al exportar')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }, [session, tipoInstrumento, registry?.ipfsCid])

  const reset = useCallback(() => {
    setStep('inicio')
    setUserInput('')
    setFormDataState({})
    setCamposFaltantes([])
    setPreguntasDinamicas([])
    setTipoInstrumento('indeterminado')
    setOrchestrator(null)
    setCapturist(null)
    setSession(null)
    setCamposCriticosPendientes([])
    setRegistry(null)
    setRegistrando(false)
    setVerifyModalOpen(false)
    setError(null)
    clearStoredSessionId()
  }, [])

  const backToCapture = useCallback(() => {
    setStep('captura')
    clearError()
  }, [clearError])

  const revision: ReviewResult | undefined = session?.resultado_revision
  const formalizacion: FormalizationResult | undefined =
    session?.resultado_formalizacion

  const puedeClasificar = useMemo(
    () => userInput.trim().length >= MIN_DESCRIPCION_CLASIFICAR,
    [userInput]
  )

  const puedeGenerarConvenio = useMemo(() => {
    if (!orchestrator || userInput.trim().length < 10) return false
    return camposCriticosPendientes.length === 0
  }, [
    orchestrator,
    userInput,
    camposCriticosPendientes.length,
  ])

  const tieneAlertasCriticas = useMemo(
    () => (revision?.alertas_criticas?.length ?? 0) > 0,
    [revision?.alertas_criticas]
  )

  const tieneObservaciones = useMemo(
    () => (revision?.alertas_observacion?.length ?? 0) > 0,
    [revision?.alertas_observacion]
  )

  const bloqueaExportacion = useMemo(
    () => session?.resultado_revision?.bloquea_exportacion === true,
    [session?.resultado_revision?.bloquea_exportacion]
  )

  const scoreRiesgo = useMemo(
    () => session?.resultado_revision?.score ?? null,
    [session?.resultado_revision?.score]
  )

  const dictamen = useMemo(
    () => session?.resultado_revision?.dictamen ?? null,
    [session?.resultado_revision?.dictamen]
  )

  const listoParaFirma = useMemo(
    () => session?.resultado_formalizacion?.listo_para_firma === true,
    [session?.resultado_formalizacion?.listo_para_firma]
  )

  const porcentajeCompletitud = useMemo(() => {
    const fields = CRITICAL_FIELDS_BY_INSTRUMENT[tipoInstrumento] ?? []
    if (fields.length === 0) return 100
    let ok = 0
    for (const f of fields) {
      const nk = f.trim().toLowerCase()
      if (formData[nk]?.trim()) ok += 1
    }
    return Math.round((ok / fields.length) * 100)
  }, [formData, tipoInstrumento])

  return {
    step,
    userInput,
    formData,
    camposFaltantes,
    preguntasDinamicas,
    tipoInstrumento,
    orchestrator,
    capturist,
    session,
    camposCriticosPendientes,
    isLoading,
    exportando,
    registry,
    registrando,
    verifyModalOpen,
    error,
    revision,
    formalizacion,
    setUserInput,
    setField,
    classify,
    runPipeline,
    refineFromReview,
    exportDocx,
    retryRegister,
    setVerifyModalOpen,
    reset,
    backToCapture,
    clearError,
    puedeClasificar,
    puedeGenerarConvenio,
    tieneAlertasCriticas,
    tieneObservaciones,
    bloqueaExportacion,
    scoreRiesgo,
    dictamen,
    listoParaFirma,
    porcentajeCompletitud,
  }
}

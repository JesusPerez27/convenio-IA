/**
 * Lógica de agentes del Senado. Ejecutar solo en servidor (API routes / Node).
 * Modelos: gpt-4o (orquestador, revisor), gpt-4o-mini (capturista, redactor, formalizador).
 */

import { z } from 'zod'
import type {
  CapturistResult,
  FormalizationResult,
  InstrumentType,
  OrchestratorResult,
  ReviewResult,
  SenateSession,
  WizardStep,
} from './types'
import { getCriticalMissing, mergeDatosUsuario } from './critical-fields'
import {
  buildCorpusContextForAgents,
  loadCorpusBundle,
} from './corpus-loader'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { APORTE_CONSOLIDADO_KEY } from './constants'
import {
  getOpenAI,
  MODEL_MINI,
  MODEL_ORCHESTRATOR,
  MODEL_REVIEWER,
} from './openai-client'
import {
  capturistResultSchema,
  formatZodError,
  formalizationResultSchema,
  orchestratorResultSchema,
  reviewResultSchema,
} from './schemas'

function clauseLibrarySnippet(maxChars = 14000): string {
  const p = path.join(process.cwd(), 'data', 'corpus', 'clause_library.json')
  const raw = fs.readFileSync(p, 'utf-8')
  return raw.slice(0, maxChars)
}

async function callJsonOnce<T>(
  schema: z.ZodType<T>,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<{ ok: true; data: T } | { ok: false; raw: string; errorMessage: string }> {
  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature,
  })
  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, raw, errorMessage: 'JSON inválido' }
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      raw,
      errorMessage: formatZodError(result.error),
    }
  }
  return { ok: true, data: result.data }
}

async function callJsonAgent<T>(
  schema: z.ZodType<T>,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<T> {
  const first = await callJsonOnce(schema, model, systemPrompt, userPrompt, temperature)
  if (first.ok) return first.data
  const repairUser = [
    'Corrige tu salida anterior para que sea un único objeto JSON válido que cumpla el esquema esperado.',
    'Errores de validación:',
    first.errorMessage,
    'JSON recibido:',
    first.raw,
  ].join('\n')
  const second = await callJsonOnce(
    schema,
    MODEL_MINI,
    'Eres un asistente que solo emite JSON válido según el esquema solicitado.',
    repairUser,
    0.1
  )
  if (!second.ok) {
    throw new Error(
      `[Senado] Validación JSON. Detalle (1.er intento): ${first.errorMessage}. Reintento: ${second.errorMessage}`
    )
  }
  return second.data
}

async function callTextAgent(params: {
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
}): Promise<string> {
  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    temperature: params.temperature ?? 0.35,
  })
  return completion.choices[0]?.message?.content?.trim() ?? ''
}

function expectedSpecificHeaderTemplate(): string {
  return [
    'CONVENIO ESPECÍFICO DE COLABORACIÓN PARA [OBJETO O PROYECTO]',
    '',
    'QUE CELEBRAN POR UNA PARTE',
    'LA UNIVERSIDAD JUÁREZ AUTÓNOMA DE TABASCO',
    'Y POR LA OTRA PARTE',
    '[NOMBRE DE LA CONTRAPARTE]',
    '',
    'Villahermosa, Tabasco. [DÍA] de [MES] de [AÑO]',
    '',
    'Después del encabezado, continúa con ANTECEDENTES, DECLARACIONES y CLÁUSULAS.',
  ].join('\n')
}

function sanitizeDraftMarkdown(raw: string): string {
  let text = (raw ?? '').trim()
  if (!text) return ''

  text = text.replace(/^```(?:markdown|md|text)?\s*/i, '').replace(/```$/i, '').trim()

  const signature = 'Este borrador ha sido refinado'
  const idx = text.indexOf(signature)
  if (idx > 0) text = text.slice(0, idx).trim()

  return text
}

function baseSystemPrompt(): string {
  const c = loadCorpusBundle()
  return [c.agent_prompts.global_system, buildCorpusContextForAgents()].join('\n\n')
}

export async function runOrchestrator(
  userInput: string,
  datosUsuario?: Record<string, string>
): Promise<OrchestratorResult> {
  const c = loadCorpusBundle()
  const thinking = c.agent_thinking.orchestrator ?? ''
  const systemPrompt = [
    baseSystemPrompt(),
    thinking,
    c.agent_prompts.orchestrator,
  ].join('\n\n')
  const datosLine = datosUsuario
    ? `Datos ya capturados (no inventar otros): ${JSON.stringify(datosUsuario)}`
    : ''
  const userPrompt = [
    'Descripción del usuario:',
    userInput,
    datosLine,
    'Devuelve un único objeto JSON con: tipo_instrumento, confianza (número entre 0 y 1), justificacion_breve, datos_extraidos (objeto clave-valor string), campos_faltantes (array de strings), preguntas_dinamicas (array breve de strings opcional).',
  ].join('\n')
  const raw = await callJsonAgent(
    orchestratorResultSchema,
    MODEL_ORCHESTRATOR,
    systemPrompt,
    userPrompt,
    0.15
  )
  return raw as OrchestratorResult
}

export async function runCapturist(
  camposFaltantes: string[],
  contexto?: {
    tipo_instrumento?: InstrumentType
    notas?: string
  }
): Promise<CapturistResult> {
  const c = loadCorpusBundle()
  const systemPrompt = [
    baseSystemPrompt(),
    c.agent_thinking.capturist ?? '',
    c.agent_prompts.capturist,
  ].join('\n\n')
  const userPrompt = [
    `Tipo de instrumento: ${contexto?.tipo_instrumento ?? 'indeterminado'}`,
    contexto?.notas ?? '',
    'Campos faltantes:',
    JSON.stringify(camposFaltantes),
    'Devuelve JSON con bloques: { bloques: [ { titulo, prioridad alta|media|baja, preguntas: [ { campo, pregunta, placeholder?, explicacion?, obligatorio } ] } ] }',
  ].join('\n')
  const data = await callJsonAgent(
    capturistResultSchema,
    MODEL_MINI,
    systemPrompt,
    userPrompt,
    0.2
  )
  return data as CapturistResult
}

export async function runRedactor(
  tipoInstrumento: InstrumentType,
  datosUsuario: Record<string, string>
): Promise<string> {
  const c = loadCorpusBundle()
  const systemPrompt = [
    baseSystemPrompt(),
    c.agent_thinking.redactor ?? '',
    c.agent_prompts.redactor,
  ].join('\n\n')
  const userPrompt = [
    `Tipo de instrumento: ${tipoInstrumento}`,
    'Datos estructurados (usa placeholders {{...}} solo donde falte dato no crítico):',
    JSON.stringify(datosUsuario),
    'Biblioteca de cláusulas (referencia, no copiar ciegamente):',
    clauseLibrarySnippet(),
    'Genera el borrador completo en Markdown con encabezados de cláusulas en MAYÚSCULAS.',
    'No envíes bloques de código con ``` ni explicaciones fuera del convenio.',
    tipoInstrumento === 'convenio_especifico_proyecto' ||
    tipoInstrumento === 'convenio_especifico_colaboracion'
      ? [
          'Encabezado obligatorio del instrumento (estructura tipo Formato Convenio Específico):',
          expectedSpecificHeaderTemplate(),
        ].join('\n')
      : '',
  ].join('\n\n')
  const text = await callTextAgent({
    model: MODEL_MINI,
    systemPrompt,
    userPrompt,
    temperature: 0.35,
  })
  return sanitizeDraftMarkdown(text)
}

/** Integra el borrador previo con textos humanos ligados a cada alerta crítica del revisor. */
export async function runRedactorRefinement(
  tipoInstrumento: InstrumentType,
  datosUsuario: Record<string, string>,
  textoBorradorActual: string,
  resultadoRevision: ReviewResult,
  aportesPorAlerta: Record<string, string>
): Promise<string> {
  const c = loadCorpusBundle()
  const systemPrompt = [
    baseSystemPrompt(),
    c.agent_thinking.redactor ?? '',
    c.agent_prompts.redactor,
    'Modo refinamiento: partes del borrador ya existen. Debes integrar los APORTES HUMANOS por alerta sin inventar hechos nuevos. Conserva cláusulas válidas y coherencia. Salida en Markdown con encabezados de cláusulas en MAYÚSCULAS.',
  ].join('\n\n')
  const consolidado = (aportesPorAlerta[APORTE_CONSOLIDADO_KEY] ?? '').trim()
  const tabla = resultadoRevision.alertas_criticas.map((a) => ({
    id_alerta: a.id,
    clausula_afectada: a.clausula_afectada,
    observacion_revisor: a.observacion,
    sugerencia_revisor: a.sugerencia ?? '',
    texto_aporte_humano: consolidado || (aportesPorAlerta[a.id] ?? '').trim(),
  }))
  const userPrompt = [
    `Tipo de instrumento: ${tipoInstrumento}`,
    'Datos estructurados:',
    JSON.stringify(datosUsuario),
    consolidado
      ? 'Hay un APORTE HUMANO UNIFICADO que debe integrarse atendiendo el contexto de cada alerta listada.'
      : 'Alertas críticas y aportes del usuario (si un aporte está vacío, no asumas datos; mantén coherencia con el resto):',
    'Alertas críticas y texto a integrar:',
    JSON.stringify(
      consolidado
        ? { aporte_unificado: consolidado, alertas: tabla.map(({ id_alerta, observacion_revisor }) => ({ id_alerta, observacion_revisor })) }
        : tabla
    ),
    'Borrador actual (intégralo y corrígelo según aportes):',
    textoBorradorActual.slice(0, 120000),
    'Devuelve el convenio completo refinado en Markdown.',
    'No envíes bloques de código con ``` ni explicaciones fuera del convenio.',
    tipoInstrumento === 'convenio_especifico_proyecto' ||
    tipoInstrumento === 'convenio_especifico_colaboracion'
      ? [
          'Conserva este patrón de encabezado al inicio (siempre):',
          expectedSpecificHeaderTemplate(),
        ].join('\n')
      : '',
  ].join('\n\n')
  const text = await callTextAgent({
    model: MODEL_MINI,
    systemPrompt,
    userPrompt,
    temperature: 0.3,
  })
  return sanitizeDraftMarkdown(text)
}

export async function runReviewer(
  textoBorrador: string,
  tipoInstrumento: InstrumentType,
  datosUsuario: Record<string, string>,
  refinamiento?: {
    revisionPrevia: ReviewResult
    aportesPorAlerta: Record<string, string>
  }
): Promise<ReviewResult> {
  const c = loadCorpusBundle()
  const systemPrompt = [
    baseSystemPrompt(),
    c.agent_thinking.reviewer ?? '',
    c.agent_prompts.reviewer,
    'Debes evaluar vicios del consentimiento (error, dolo, mala fe, violencia, lesión) solo como indicios textuales; incluye analisis_consentimiento cuando corresponda.',
    refinamiento
      ? 'Esta es una segunda revisión tras aportes humanos para subsanar alertas. Comprueba si las observaciones previas quedaron atendidas en el texto; no repitas alertas críticas si el borrador ya incorpora de forma clara el aporte. Si persisten lagunas, mantén o ajusta alertas con justificación breve.'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const userPrompt = [
    `Tipo: ${tipoInstrumento}`,
    'Datos de captura:',
    JSON.stringify(datosUsuario),
    refinamiento
      ? [
          'Revisión anterior (referencia):',
          JSON.stringify({
            dictamen: refinamiento.revisionPrevia.dictamen,
            alertas_criticas: refinamiento.revisionPrevia.alertas_criticas.map((a) => ({
              id: a.id,
              observacion: a.observacion,
            })),
          }),
          'Aportes humanos recién incorporados (por id de alerta):',
          JSON.stringify(refinamiento.aportesPorAlerta),
        ].join('\n')
      : '',
    'Borrador:',
    textoBorrador.slice(0, 120000),
    'Devuelve JSON con dictamen, score 0-100, bloquea_exportacion, alertas_criticas, alertas_observacion, resumen_ejecutivo, analisis_consentimiento { hay_indicios_vicio, vicios_evaluados[], nota_breve }.',
  ]
    .filter(Boolean)
    .join('\n\n')
  const data = await callJsonAgent(
    reviewResultSchema,
    MODEL_REVIEWER,
    systemPrompt,
    userPrompt,
    0.15
  )
  return data as ReviewResult
}

export async function runFormalizer(
  textoBorrador: string,
  tipoInstrumento: InstrumentType,
  resultadoRevision: ReviewResult,
  datosUsuario: Record<string, string>
): Promise<FormalizationResult> {
  const c = loadCorpusBundle()
  const systemPrompt = [
    baseSystemPrompt(),
    c.agent_thinking.formalizer ?? '',
    c.agent_prompts.formalizer,
  ].join('\n\n')
  const userPrompt = [
    `Tipo de instrumento: ${tipoInstrumento}`,
    'Dictamen y bloqueo:',
    JSON.stringify({
      dictamen: resultadoRevision.dictamen,
      bloquea_exportacion: resultadoRevision.bloquea_exportacion,
    }),
    'Datos:',
    JSON.stringify(datosUsuario),
    'Borrador (extracto):',
    textoBorrador.slice(0, 8000),
    'Determina si procede documento_privado o escritura_publica / ratificación / mixto según cuantía, inmuebles, actos que exijan forma especial, y normativa aplicable del corpus. justificacion_forma es obligatoria.',
    'Devuelve JSON con forma_requerida, justificacion_forma, requiere_registro_abogado_general, anexos_necesarios, checklist_cierre, listo_para_firma, observaciones.',
  ].join('\n\n')
  const data = await callJsonAgent(
    formalizationResultSchema,
    MODEL_MINI,
    systemPrompt,
    userPrompt,
    0.2
  )
  return data as FormalizationResult
}

export type SenatePipelineOutput = {
  ok: true
  wizard_step: WizardStep
  session: SenateSession
  orchestrator: OrchestratorResult
  capturist?: CapturistResult
}

export type SenatePipelineError = {
  ok: false
  error: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function buildSession(partial: Partial<SenateSession> & Pick<SenateSession, 'session_id'>): SenateSession {
  const t = nowIso()
  return {
    session_id: partial.session_id,
    tipo_instrumento: partial.tipo_instrumento ?? 'indeterminado',
    estado: partial.estado ?? 'captura',
    datos_usuario: partial.datos_usuario ?? {},
    texto_borrador: partial.texto_borrador ?? '',
    resultado_revision: partial.resultado_revision,
    resultado_formalizacion: partial.resultado_formalizacion,
    user_input_inicial: partial.user_input_inicial,
    created_at: partial.created_at ?? t,
    updated_at: t,
  }
}

function mapWizardAfterReview(
  review: ReviewResult
): Extract<WizardStep, 'revision' | 'rechazado' | 'aprobado' | 'formalizacion'> {
  if (review.dictamen === 'RECHAZADO') return 'rechazado'
  if (review.bloquea_exportacion) return 'revision'
  return 'aprobado'
}

/**
 * Orquestador + capturista si faltan campos críticos (sin redactar aún).
 */
export async function runClassificationStep(
  userInput: string,
  datosUsuario?: Record<string, string>
): Promise<{
  orchestrator: OrchestratorResult
  capturist?: CapturistResult
  wizard_step: WizardStep
  merged: Record<string, string>
  campos_criticos_pendientes: string[]
}> {
  const orchestrator = await runOrchestrator(userInput, datosUsuario)
  const merged = mergeDatosUsuario(orchestrator.datos_extraidos, datosUsuario)
  const campos_criticos_pendientes = getCriticalMissing(
    orchestrator.tipo_instrumento,
    merged
  )
  if (campos_criticos_pendientes.length > 0) {
    const capturist = await runCapturist(campos_criticos_pendientes, {
      tipo_instrumento: orchestrator.tipo_instrumento,
      notas: `Campos también señalados por orquestador: ${orchestrator.campos_faltantes.join(', ')}`,
    })
    return {
      orchestrator,
      capturist,
      wizard_step: 'captura',
      merged,
      campos_criticos_pendientes,
    }
  }
  return {
    orchestrator,
    wizard_step: 'clasificacion',
    merged,
    campos_criticos_pendientes: [],
  }
}

/**
 * Pipeline completo: orquestador → (captura si falta) → redactor → revisor → formalizador.
 */
export async function runSenatePipeline(
  userInput: string,
  datosUsuario: Record<string, string>,
  sessionId?: string
): Promise<SenatePipelineOutput | SenatePipelineError> {
  try {
    const sid = sessionId ?? randomUUID()
    const orchestrator = await runOrchestrator(userInput, datosUsuario)
    const merged = mergeDatosUsuario(orchestrator.datos_extraidos, datosUsuario)
    const missing = getCriticalMissing(orchestrator.tipo_instrumento, merged)

    if (missing.length > 0) {
      const capturist = await runCapturist(
        [...new Set([...missing, ...orchestrator.campos_faltantes])],
        {
          tipo_instrumento: orchestrator.tipo_instrumento,
          notas: 'Priorizar campos críticos listados primero.',
        }
      )
      return {
        ok: true,
        wizard_step: 'captura',
        orchestrator,
        capturist,
        session: buildSession({
          session_id: sid,
          tipo_instrumento: orchestrator.tipo_instrumento,
          estado: 'captura',
          datos_usuario: merged,
          texto_borrador: '',
          user_input_inicial: userInput,
        }),
      }
    }

    const tipo = orchestrator.tipo_instrumento
    const textoBorrador = await runRedactor(tipo, merged)
    const resultado_revision = await runReviewer(textoBorrador, tipo, merged)

    let resultado_formalizacion: FormalizationResult | undefined
    let wizard_step: WizardStep = mapWizardAfterReview(resultado_revision)
    let estado: SenateSession['estado'] = 'revision'

    if (wizard_step === 'rechazado') {
      estado = 'rechazado'
    } else if (wizard_step === 'revision') {
      estado = 'revision'
    } else {
      resultado_formalizacion = await runFormalizer(
        textoBorrador,
        tipo,
        resultado_revision,
        merged
      )
      estado = resultado_formalizacion.listo_para_firma ? 'aprobado' : 'formalizacion'
      wizard_step = estado === 'aprobado' ? 'aprobado' : 'formalizacion'
    }

    return {
      ok: true,
      wizard_step,
      orchestrator,
      session: buildSession({
        session_id: sid,
        tipo_instrumento: tipo,
        estado,
        datos_usuario: merged,
        texto_borrador: textoBorrador,
        resultado_revision,
        resultado_formalizacion,
        user_input_inicial: userInput,
      }),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

/**
 * Tras alertas críticas: integra aportes humanos por id de alerta, redacta de nuevo y re-ejecuta revisor (+ formalizador si aplica).
 */
export async function runSenateRefineFromReview(params: {
  userInput: string
  datosUsuario: Record<string, string>
  tipoInstrumento: InstrumentType
  sessionId: string
  sessionCreatedAt?: string
  textoBorrador: string
  resultadoRevision: ReviewResult
  aportesPorAlerta: Record<string, string>
}): Promise<SenatePipelineOutput | SenatePipelineError> {
  try {
    const aportesClean = Object.fromEntries(
      Object.entries(params.aportesPorAlerta)
        .map(([k, v]) => [k, String(v ?? '').trim()])
        .filter(([, v]) => v.length > 0)
    )
    if (Object.keys(aportesClean).length === 0) {
      return {
        ok: false,
        error:
          'Complete el cuadro de mejora con texto no vacío antes de volver a revisar.',
      }
    }

    const merged = mergeDatosUsuario(params.datosUsuario, {})
    for (const id of Object.keys(aportesClean)) {
      if (id === APORTE_CONSOLIDADO_KEY) {
        merged.aporte_revision_consolidado = aportesClean[id]!
      } else {
        merged[`aporte_alerta_${id}`] = aportesClean[id]!
      }
    }
    merged.refine_from_review_at = nowIso()

    const tipoInst = params.tipoInstrumento

    const textoNuevo = await runRedactorRefinement(
      tipoInst,
      merged,
      params.textoBorrador,
      params.resultadoRevision,
      aportesClean
    )

    const resultado_revision = await runReviewer(textoNuevo, tipoInst, merged, {
      revisionPrevia: params.resultadoRevision,
      aportesPorAlerta: aportesClean,
    })

    let resultado_formalizacion: FormalizationResult | undefined
    let wizard_step: WizardStep = mapWizardAfterReview(resultado_revision)
    let estado: SenateSession['estado'] = 'revision'

    if (wizard_step === 'rechazado') {
      estado = 'rechazado'
    } else if (wizard_step === 'revision') {
      estado = 'revision'
    } else {
      resultado_formalizacion = await runFormalizer(
        textoNuevo,
        tipoInst,
        resultado_revision,
        merged
      )
      estado = resultado_formalizacion.listo_para_firma ? 'aprobado' : 'formalizacion'
      wizard_step = estado === 'aprobado' ? 'aprobado' : 'formalizacion'
    }

    const orchestrator: OrchestratorResult = {
      tipo_instrumento: tipoInst,
      confianza: 1,
      justificacion_breve: 'Refinamiento desde etapa de revisión con aportes humanos.',
      datos_extraidos: merged,
      campos_faltantes: [],
      preguntas_dinamicas: [],
    }

    return {
      ok: true,
      wizard_step,
      orchestrator,
      session: buildSession({
        session_id: params.sessionId,
        tipo_instrumento: tipoInst,
        estado,
        datos_usuario: merged,
        texto_borrador: textoNuevo,
        resultado_revision,
        resultado_formalizacion,
        user_input_inicial: params.userInput,
        created_at: params.sessionCreatedAt ?? nowIso(),
      }),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

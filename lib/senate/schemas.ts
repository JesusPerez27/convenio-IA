import { z } from 'zod'

/** Mensaje legible para APIs/UI (evita `[object Object]` con flatten). */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'raíz'
      return `${path}: ${issue.message}`
    })
    .join(' | ')
}

const scoreLlm = z.preprocess((v) => {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}, z.number().min(0).max(100))

const boolLlm = z.preprocess((v) => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === '1' || s === 'sí' || s === 'si') return true
    if (s === 'false' || s === '0' || s === 'no') return false
  }
  return Boolean(v)
}, z.boolean())

const INSTRUMENTOS = [
  'convenio_general_colaboracion',
  'convenio_especifico_colaboracion',
  'convenio_especifico_proyecto',
  'convenio_modificatorio',
  'indeterminado',
] as const

export const instrumentTypeSchema = z.enum(INSTRUMENTOS)

/** El modelo a veces devuelve texto distinto; normalizamos a un valor válido. */
const tipoInstrumentoLlm = z.preprocess((v) => {
  const raw = String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if ((INSTRUMENTOS as readonly string[]).includes(raw)) return raw
  if (raw.includes('general') && raw.includes('colabor')) return 'convenio_general_colaboracion'
  if (raw.includes('modific')) return 'convenio_modificatorio'
  if (raw.includes('proyecto') || raw.includes('proyect')) {
    return 'convenio_especifico_proyecto'
  }
  if (raw.includes('especific')) return 'convenio_especifico_colaboracion'
  return 'indeterminado'
}, instrumentTypeSchema)

const recordStringLlm = z.preprocess((val) => {
  if (val == null || typeof val !== 'object' || Array.isArray(val)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v == null) continue
    if (typeof v === 'object') {
      try {
        out[String(k)] = JSON.stringify(v)
      } catch {
        out[String(k)] = '[objeto]'
      }
    } else {
      out[String(k)] = String(v)
    }
  }
  return out
}, z.record(z.string()))

const stringArrayCoerce = z.preprocess((v) => {
  if (v == null) return []
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'string') return [v]
  return []
}, z.array(z.string()))

export const orchestratorResultSchema = z.object({
  tipo_instrumento: tipoInstrumentoLlm,
  confianza: z.preprocess((v) => {
    if (v == null || v === '') return 0.7
    let n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
    if (Number.isNaN(n)) return 0.5
    if (n > 1) n = Math.min(100, n) / 100
    return Math.min(1, Math.max(0, n))
  }, z.number().min(0).max(1)),
  justificacion_breve: z.preprocess((v) => (v == null ? '' : String(v)), z.string()),
  datos_extraidos: recordStringLlm,
  campos_faltantes: stringArrayCoerce,
  preguntas_dinamicas: stringArrayCoerce,
})

export const capturistQuestionSchema = z.object({
  campo: z.preprocess((v) => (v == null ? '' : String(v)), z.string()),
  pregunta: z.preprocess((v) => (v == null ? '' : String(v)), z.string()),
  placeholder: z.preprocess(
    (v) => (v == null || v === '' ? undefined : String(v)),
    z.string().optional()
  ),
  explicacion: z.preprocess(
    (v) => (v == null || v === '' ? undefined : String(v)),
    z.string().optional()
  ),
  obligatorio: boolLlm,
})

export const capturistBlockSchema = z.object({
  titulo: z.preprocess((v) => (v == null ? '' : String(v)), z.string()),
  prioridad: z.preprocess((v) => {
    const s = String(v ?? '')
      .trim()
      .toLowerCase()
    if (s === 'alta' || s === 'high' || s === 'alto') return 'alta'
    if (s === 'media' || s === 'medium' || s === 'medio') return 'media'
    return 'baja'
  }, z.enum(['alta', 'media', 'baja'])),
  preguntas: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(capturistQuestionSchema)
  ),
})

export const capturistResultSchema = z.object({
  bloques: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(capturistBlockSchema)
  ),
})

const CONSENT_VICIOS = [
  'error',
  'dolo',
  'violencia',
  'mala_fe',
  'lesion',
  'ninguno_aparente',
] as const

const consentVicioSchema = z.enum(CONSENT_VICIOS)

const VICIOS_VALIDOS = new Set<string>(CONSENT_VICIOS)

export const revisionAlertSchema = z.object({
  id: z.string().default('ALT-000'),
  clausula_afectada: z.string().default(''),
  observacion: z.string().default(''),
  fundamento: z.string().default(''),
  sugerencia: z.string().optional(),
  vicio_consentimiento_sospecha: consentVicioSchema.optional(),
})

const dictamenLlm = z.preprocess((v) => {
  if (typeof v !== 'string') {
    return 'APROBADO_CON_OBSERVACIONES'
  }
  const s = v.trim().toUpperCase().replace(/\s+/g, '_')
  const allowed = [
    'APROBADO',
    'APROBADO_CON_OBSERVACIONES',
    'RECHAZADO_SUBSANABLE',
    'RECHAZADO',
  ] as const
  if (allowed.includes(s as (typeof allowed)[number])) return s
  if (s.includes('RECHAZADO') && s.includes('SUBSAN')) return 'RECHAZADO_SUBSANABLE'
  if (s.includes('RECHAZADO')) return 'RECHAZADO'
  if (s.includes('OBSERVAC')) return 'APROBADO_CON_OBSERVACIONES'
  if (s.includes('APROBADO')) return 'APROBADO'
  return 'APROBADO_CON_OBSERVACIONES'
}, z.enum(['APROBADO', 'APROBADO_CON_OBSERVACIONES', 'RECHAZADO_SUBSANABLE', 'RECHAZADO']))

const viciosArrayLlm = z.preprocess((v) => {
  if (!Array.isArray(v)) return []
  return v.map((item) => {
    if (typeof item !== 'string') return 'ninguno_aparente'
    const t = item.trim().toLowerCase().replace(/\s+/g, '_')
    if (VICIOS_VALIDOS.has(t)) return t as z.infer<typeof consentVicioSchema>
    return 'ninguno_aparente'
  })
}, z.array(consentVicioSchema))

const alertasArray = z.preprocess(
  (v) => (Array.isArray(v) ? v : []),
  z.array(revisionAlertSchema)
)

export const reviewResultSchema = z.object({
  dictamen: dictamenLlm,
  score: scoreLlm,
  bloquea_exportacion: boolLlm,
  alertas_criticas: alertasArray,
  alertas_observacion: alertasArray,
  resumen_ejecutivo: z.string().default(''),
  analisis_consentimiento: z
    .object({
      hay_indicios_vicio: boolLlm,
      vicios_evaluados: viciosArrayLlm,
      nota_breve: z.string().default(''),
    })
    .optional(),
})

const stringArrayLlm = z.preprocess(
  (v) => (Array.isArray(v) ? v.map((x) => String(x)) : []),
  z.array(z.string())
)

export const formalizationResultSchema = z.object({
  forma_requerida: z.enum([
    'documento_privado',
    'escritura_publica',
    'ratificacion',
    'mixto',
  ]),
  justificacion_forma: z.string().default(''),
  requiere_registro_abogado_general: boolLlm,
  anexos_necesarios: stringArrayLlm,
  checklist_cierre: stringArrayLlm,
  listo_para_firma: boolLlm,
  observaciones: stringArrayLlm,
})

export type OrchestratorResultParsed = z.infer<typeof orchestratorResultSchema>
export type CapturistResultParsed = z.infer<typeof capturistResultSchema>
export type ReviewResultParsed = z.infer<typeof reviewResultSchema>
export type FormalizationResultParsed = z.infer<typeof formalizationResultSchema>

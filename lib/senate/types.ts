/**
 * Tipos centrales del Senado de Agentes — convenios bajo legislación mexicana (enfoque Tabasco / UJAT).
 * Corpus normativo: /data/corpus/*.json (sin BD en Etapa 1).
 */

/** Tipos de instrumento soportados en Etapa 1 */
export type InstrumentType =
  | 'convenio_general_colaboracion'
  | 'convenio_especifico_colaboracion'
  | 'convenio_especifico_proyecto'
  | 'convenio_modificatorio'
  | 'indeterminado'

/** Pasos del wizard de interfaz (5 pasos principales + estados transitorios) */
export type WizardStep =
  | 'inicio'
  | 'clasificacion'
  | 'captura'
  | 'procesando'
  | 'revision'
  | 'formalizacion'
  | 'aprobado'
  | 'rechazado'

/** Estados de negocio de la sesión (pipeline y persistencia futura) */
export type SessionBusinessState =
  | 'captura'
  | 'revision'
  | 'formalizacion'
  | 'aprobado'
  | 'rechazado'

/** Dictamen del revisor legal (validación de vicios del consentimiento incluida en auditoría) */
export type ReviewDictamen =
  | 'APROBADO'
  | 'APROBADO_CON_OBSERVACIONES'
  | 'RECHAZADO_SUBSANABLE'
  | 'RECHAZADO'

/** Forma externa según cuantía, naturaleza del objeto y formalidades */
export type FormalizationForm =
  | 'documento_privado'
  | 'escritura_publica'
  | 'ratificacion'
  | 'mixto'

/** Severidad de alertas y triggers */
export type Severity = 'critical' | 'warning' | 'info'

/** Vicios del consentimiento relevantes para el Revisor (CCF y doctrina) */
export type ConsentVicioTipo =
  | 'error'
  | 'dolo'
  | 'violencia'
  | 'mala_fe'
  | 'lesion'
  | 'ninguno_aparente'

/** Resultado del Orquestador / Clasificador */
export interface OrchestratorResult {
  tipo_instrumento: InstrumentType
  confianza: number
  justificacion_breve: string
  datos_extraidos: Record<string, string>
  campos_faltantes: string[]
  preguntas_dinamicas: string[]
}

/** Pregunta estructurada del Capturista */
export interface CapturistQuestion {
  campo: string
  pregunta: string
  placeholder?: string
  explicacion?: string
  obligatorio: boolean
}

/** Bloque de captura del Capturista */
export interface CapturistBlock {
  titulo: string
  prioridad: 'alta' | 'media' | 'baja'
  preguntas: CapturistQuestion[]
}

/** Resultado del Capturista / Entrevistador legal */
export interface CapturistResult {
  bloques: CapturistBlock[]
}

/** Alerta individual en revisión formal */
export interface RevisionAlert {
  id: string
  clausula_afectada: string
  observacion: string
  fundamento: string
  sugerencia?: string
  /** Opcional: vicio de consentimiento aparente en el texto */
  vicio_consentimiento_sospecha?: ConsentVicioTipo
}

/** Resultado de la revisión legal (Revisor) — incluye análisis de consentimiento y vicios */
export interface ReviewResult {
  dictamen: ReviewDictamen
  score: number
  bloquea_exportacion: boolean
  alertas_criticas: RevisionAlert[]
  alertas_observacion: RevisionAlert[]
  resumen_ejecutivo: string
  /** Metadatos: el revisor debe explicitar si hay indicios de error, dolo o mala fe en el consentimiento */
  analisis_consentimiento?: {
    hay_indicios_vicio: boolean
    vicios_evaluados: ConsentVicioTipo[]
    nota_breve: string
  }
}

/** Resultado de formalización documental (Formalizador) */
export interface FormalizationResult {
  forma_requerida: FormalizationForm
  /** Documento privado vs escritura pública según cuantía/naturaleza/materia */
  justificacion_forma: string
  requiere_registro_abogado_general: boolean
  anexos_necesarios: string[]
  checklist_cierre: string[]
  listo_para_firma: boolean
  observaciones: string[]
}

/** Instrumento en curso: tipo + datos mínimos identificados */
export interface Instrument {
  tipo: InstrumentType
  etiqueta_humana: string
  requiere_convenio_general_previo: boolean
}

/**
 * Sesión del Senado (estado de una corrida del wizard / pipeline).
 * Preparado para futura persistencia (Supabase).
 */
export interface SenateSession {
  session_id: string
  tipo_instrumento: InstrumentType
  estado: SessionBusinessState
  datos_usuario: Record<string, string>
  texto_borrador: string
  resultado_revision?: ReviewResult
  resultado_formalizacion?: FormalizationResult
  user_input_inicial?: string
  created_at: string
  updated_at: string
}

/** Entrada para crear sesión (repositorio futuro) */
export interface CreateSessionInput {
  user_input?: string
  datos_usuario?: Record<string, string>
}

export interface SaveDraftVersionInput {
  session_id: string
  texto_borrador: string
  datos_usuario: Record<string, string>
}

export interface SessionSummary {
  session_id: string
  tipo_instrumento: InstrumentType
  estado: SessionBusinessState
  updated_at: string
}

/** Contrato de repositorio — implementación in-memory o Supabase en Etapa 1B */
export interface SenateRepository {
  createSession(input: CreateSessionInput): Promise<SessionRecord>
  getSession(id: string): Promise<SessionRecord | null>
  saveDraftVersion(input: SaveDraftVersionInput): Promise<void>
  listSessions(): Promise<SessionSummary[]>
}

export interface SessionRecord extends SenateSession {
  version?: number
}

/** Acciones de la API POST /api/senate */
export type SenateApiAction = 'classify' | 'pipeline' | 'refine_from_review'

export interface SenateClassifyRequest {
  action: 'classify'
  userInput: string
  datosUsuario?: Record<string, string>
}

export interface SenatePipelineRequest {
  action: 'pipeline'
  userInput: string
  datosUsuario: Record<string, string>
  sessionId?: string
}

/** Revisión con aportes humanos por alerta crítica → nuevo borrador + nueva revisión */
export interface SenateRefineFromReviewRequest {
  action: 'refine_from_review'
  userInput: string
  datosUsuario: Record<string, string>
  tipoInstrumento: InstrumentType
  sessionId: string
  /** Conserva la fecha de creación de la sesión original si existe */
  sessionCreatedAt?: string
  textoBorrador: string
  resultadoRevision: ReviewResult
  /** id de alerta → texto aportado por el usuario (puede omitirse o ir vacío) */
  aportesPorAlerta: Record<string, string>
}

export type SenateApiRequest =
  | SenateClassifyRequest
  | SenatePipelineRequest
  | SenateRefineFromReviewRequest

/** Respuesta genérica del pipeline (estado siguiente + payloads) */
export interface SenatePipelineResponse {
  ok: boolean
  wizard_step?: WizardStep
  session?: SenateSession
  orchestrator?: OrchestratorResult
  capturist?: CapturistResult
  error?: string
}

/** Payload exportación DOCX */
export interface ExportDocxRequest {
  textoConvenio: string
  nombreArchivo: string
}

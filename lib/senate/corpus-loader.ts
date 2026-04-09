import fs from 'fs'
import path from 'path'

export type AgentPromptsJson = {
  global_system: string
  orchestrator: string
  capturist: string
  redactor: string
  reviewer: string
  formalizer: string
}

export type AgentThinkingJson = Record<string, string>

export type CorpusBundle = {
  agent_prompts: AgentPromptsJson
  agent_thinking: AgentThinkingJson
  system_rules: Record<string, unknown>
  formato_ujat_segmentos: Record<string, unknown>
  tabasco_validation: Record<string, unknown>
  review_triggers: Record<string, unknown>
  codigo_civil: Record<string, unknown>
  ley_educacion: Record<string, unknown>
  leyes_complementarias: Record<string, unknown>
}

let cache: CorpusBundle | null = null

function readJson<T>(name: string): T {
  const p = path.join(process.cwd(), 'data', 'corpus', name)
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw) as T
}

export function loadCorpusBundle(): CorpusBundle {
  if (cache) return cache
  cache = {
    agent_prompts: readJson<AgentPromptsJson>('agent_prompts.json'),
    agent_thinking: readJson<AgentThinkingJson>('agent_thinking_prompts.json'),
    system_rules: readJson('system_rules.json'),
    formato_ujat_segmentos: readJson('formato_ujat_segmentos.json'),
    tabasco_validation: readJson('tabasco_validation_rules.json'),
    review_triggers: readJson('review_triggers.json'),
    codigo_civil: readJson('codigo_civil_federal.json'),
    ley_educacion: readJson('ley_general_educacion.json'),
    leyes_complementarias: readJson('leyes_complementarias.json'),
  }
  return cache
}

/** Fragmentos de contexto para prompts (longitud acotada). */
export function buildCorpusContextForAgents(): string {
  const c = loadCorpusBundle()
  const tabasco = JSON.stringify(c.tabasco_validation).slice(0, 6000)
  const triggers = JSON.stringify(c.review_triggers).slice(0, 4000)
  const ccf = JSON.stringify(c.codigo_civil).slice(0, 3500)
  const ujat = JSON.stringify(c.formato_ujat_segmentos).slice(0, 5000)
  return [
    '--- FORMATOS UJAT (segmentos de referencia) ---',
    ujat,
    '--- REGLAS TABASCO / VALIDACIÓN ---',
    tabasco,
    '--- TRIGGERS DE REVISIÓN ---',
    triggers,
    '--- CORPUS CCF (consentimiento / vicios) ---',
    ccf,
    '--- LGE (resumen) ---',
    JSON.stringify(c.ley_educacion).slice(0, 2000),
  ].join('\n')
}

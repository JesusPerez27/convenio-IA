import type { InstrumentType } from './types'

/** Campos mínimos para no bloquear redacción; el orquestador puede pedir más. */
export const CRITICAL_FIELDS_BY_INSTRUMENT: Record<InstrumentType, string[]> = {
  convenio_general_colaboracion: [
    'objeto',
    'nombre_parte_a',
    'nombre_parte_b',
    'vigencia',
    'representante_a',
    'representante_b',
    'facultades_a',
    'facultades_b',
    'domicilio_a',
    'domicilio_b',
  ],
  convenio_especifico_colaboracion: [
    'objeto',
    'nombre_parte_a',
    'nombre_parte_b',
    'vigencia',
    'representante_a',
    'representante_b',
    'facultades_a',
    'facultades_b',
    'domicilio_a',
    'domicilio_b',
    'referencia_convenio_general',
  ],
  convenio_especifico_proyecto: [
    'objeto',
    'nombre_parte_a',
    'nombre_parte_b',
    'vigencia',
    'representante_a',
    'representante_b',
    'facultades_a',
    'facultades_b',
    'domicilio_a',
    'domicilio_b',
    'referencia_convenio_general',
    'nombre_proyecto',
  ],
  convenio_modificatorio: [
    'identificacion_convenio_original',
    'clausulas_modificadas',
    'nombre_parte_a',
    'nombre_parte_b',
    'domicilio_a',
    'domicilio_b',
  ],
  indeterminado: ['objeto', 'nombre_parte_a', 'nombre_parte_b'],
}

export function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_')
}

/** Fusiona datos con claves normalizadas para búsqueda. */
export function mergeDatosUsuario(
  extracted: Record<string, string>,
  provided: Record<string, string> | undefined
): Record<string, string> {
  const out: Record<string, string> = {}
  const put = (k: string, v: string) => {
    const nk = normalizeKey(k)
    if (v !== undefined && String(v).trim() !== '') out[nk] = String(v).trim()
  }
  for (const [k, v] of Object.entries(extracted)) put(k, v)
  if (provided) for (const [k, v] of Object.entries(provided)) put(k, v)
  return out
}

export function getCriticalMissing(
  tipo: InstrumentType,
  merged: Record<string, string>
): string[] {
  const need = CRITICAL_FIELDS_BY_INSTRUMENT[tipo] ?? CRITICAL_FIELDS_BY_INSTRUMENT.indeterminado
  const missing: string[] = []
  for (const field of need) {
    const nk = normalizeKey(field)
    if (!merged[nk] || merged[nk].trim() === '') missing.push(field)
  }
  return missing
}

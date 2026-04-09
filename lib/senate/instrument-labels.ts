import type { InstrumentType } from './types'

const LABELS: Record<InstrumentType, string> = {
  convenio_general_colaboracion: 'Convenio general de colaboración',
  convenio_especifico_colaboracion: 'Convenio específico de colaboración',
  convenio_especifico_proyecto: 'Convenio específico (proyecto)',
  convenio_modificatorio: 'Convenio modificatorio',
  indeterminado: 'Por determinar',
}

export function labelInstrumento(t: InstrumentType): string {
  return LABELS[t] ?? t
}

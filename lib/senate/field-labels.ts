/** Etiquetas en español para claves de datos (UI captura y avisos). */
const LABELS: Record<string, string> = {
  objeto: 'Objeto del convenio',
  nombre_parte_a: 'Denominación de la parte A',
  nombre_parte_b: 'Denominación de la parte B',
  vigencia: 'Vigencia',
  representante_a: 'Representante legal (parte A)',
  representante_b: 'Representante legal (parte B)',
  facultades_a: 'Fundamento de facultades de representación (parte A)',
  facultades_b: 'Fundamento de facultades de representación (parte B)',
  domicilio_a: 'Domicilio para notificaciones y emplazamientos (parte A)',
  domicilio_b: 'Domicilio para notificaciones y emplazamientos (parte B)',
  correo_a: 'Correo electrónico (parte A)',
  correo_b: 'Correo electrónico (parte B)',
  telefono_a: 'Teléfono (parte A)',
  telefono_b: 'Teléfono (parte B)',
  referencia_convenio_general: 'Referencia al convenio general (fecha, número o cláusula)',
  nombre_proyecto: 'Nombre del proyecto',
  identificacion_convenio_original: 'Identificación del convenio que se modifica',
  clausulas_modificadas: 'Cláusulas o puntos a modificar',
}

export function labelCampo(key: string): string {
  const nk = key.trim().toLowerCase().replace(/\s+/g, '_')
  if (LABELS[nk]) return LABELS[nk]
  return nk.replace(/_/g, ' ')
}

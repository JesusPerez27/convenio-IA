'use client'

import { Loader2 } from 'lucide-react'

export function StepProcesando() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-slate-600" aria-hidden />
      <div>
        <p className="text-base font-medium text-slate-900">
          Procesando borrador y revisión legal
        </p>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          Redacción, auditoría de consentimiento y formalización documental. Puede tardar un
          minuto.
        </p>
      </div>
    </div>
  )
}

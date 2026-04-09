'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Algo salió mal</h2>
      <p className="mt-2 text-sm text-slate-600">
        {error.message || 'Error inesperado al cargar esta sección.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Reintentar
      </button>
    </div>
  )
}

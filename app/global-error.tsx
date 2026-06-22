'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Error en la aplicación</h2>
          <p className="mt-2 text-sm text-slate-600">
            {error.message || 'No se pudo cargar la página.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}

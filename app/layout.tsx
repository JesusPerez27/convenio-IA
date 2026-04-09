import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Senado de Agentes — Convenios',
  description:
    'Generación y revisión asistida de convenios bajo legislación mexicana (UJAT / Tabasco).',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { registerConvenioDocument } from '@/lib/senate/register-document'
import { instrumentTypeSchema } from '@/lib/senate/schemas'

export const maxDuration = 60

const bodySchema = z.object({
  textoConvenio: z.string().min(1),
  nombreArchivo: z.string().min(1).max(200),
  sessionId: z.string().min(1),
  tipoInstrumento: instrumentTypeSchema,
  dictamen: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const registry = await registerConvenioDocument(parsed.data)
    return NextResponse.json({ ok: true, registry })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al registrar'
    console.error('[api/senate/register]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

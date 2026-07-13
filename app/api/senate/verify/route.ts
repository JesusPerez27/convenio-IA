import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyConvenioByHash } from '@/lib/senate/register-document'

const bodySchema = z.object({
  fileHashHex: z.string().min(1),
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
    return NextResponse.json({ ok: false, error: 'Se requiere fileHashHex' }, { status: 400 })
  }

  try {
    const result = await verifyConvenioByHash(parsed.data.fileHashHex)
    if ('error' in result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, verification: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al verificar'
    console.error('[api/senate/verify]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

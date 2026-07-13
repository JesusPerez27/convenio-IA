import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildDocxBufferFromMarkdown } from '@/lib/senate/build-docx'
import { fetchFileFromIpfs } from '@/lib/senate/pinata'

const bodySchema = z
  .object({
    textoConvenio: z.string().min(1).optional(),
    nombreArchivo: z.string().min(1).max(200),
    ipfsCid: z.string().min(10).optional(),
  })
  .refine((d) => Boolean(d.ipfsCid || d.textoConvenio), {
    message: 'Se requiere ipfsCid o textoConvenio',
  })

function safeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\-\s]/g, '_').trim()
  const withExt = base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`
  return withExt.slice(0, 180)
}

export async function POST(req: NextRequest) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'textoConvenio y nombreArchivo son requeridos' },
      { status: 400 }
    )
  }

  const buffer = parsed.data.ipfsCid
    ? await fetchFileFromIpfs(parsed.data.ipfsCid)
    : await buildDocxBufferFromMarkdown(parsed.data.textoConvenio!)
  const filename = safeFileName(parsed.data.nombreArchivo)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

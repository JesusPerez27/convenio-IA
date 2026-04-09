import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  runClassificationStep,
  runSenatePipeline,
  runSenateRefineFromReview,
} from '@/lib/senate/functions'
import { instrumentTypeSchema, reviewResultSchema } from '@/lib/senate/schemas'

export const maxDuration = 120

const classifySchema = z.object({
  action: z.literal('classify'),
  userInput: z.string().min(1, 'Descripción requerida'),
  datosUsuario: z.record(z.string()).optional(),
})

const pipelineSchema = z.object({
  action: z.literal('pipeline'),
  userInput: z.string(),
  datosUsuario: z.record(z.string()),
  sessionId: z.string().optional(),
})

const refineSchema = z.object({
  action: z.literal('refine_from_review'),
  userInput: z.string(),
  datosUsuario: z.record(z.string()),
  tipoInstrumento: instrumentTypeSchema,
  sessionId: z.string().min(1),
  sessionCreatedAt: z.string().optional(),
  textoBorrador: z.string().min(1),
  resultadoRevision: reviewResultSchema,
  aportesPorAlerta: z.record(z.string()),
})

const bodySchema = z.discriminatedUnion('action', [
  classifySchema,
  pipelineSchema,
  refineSchema,
])

export async function POST(req: NextRequest) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Cuerpo JSON inválido' },
      { status: 400 }
    )
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Payload inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    if (parsed.data.action === 'classify') {
      const r = await runClassificationStep(
        parsed.data.userInput,
        parsed.data.datosUsuario
      )
      return NextResponse.json({
        ok: true,
        action: 'classify' as const,
        orchestrator: r.orchestrator,
        capturist: r.capturist,
        wizard_step: r.wizard_step,
        merged: r.merged,
        campos_criticos_pendientes: r.campos_criticos_pendientes,
      })
    }

    if (parsed.data.action === 'pipeline') {
      const r = await runSenatePipeline(
        parsed.data.userInput,
        parsed.data.datosUsuario,
        parsed.data.sessionId
      )

      if (!r.ok) {
        return NextResponse.json({ ok: false, error: r.error }, { status: 500 })
      }

      return NextResponse.json({
        ok: true,
        action: 'pipeline' as const,
        wizard_step: r.wizard_step,
        session: r.session,
        orchestrator: r.orchestrator,
        capturist: r.capturist,
      })
    }

    const r = await runSenateRefineFromReview({
      userInput: parsed.data.userInput,
      datosUsuario: parsed.data.datosUsuario,
      tipoInstrumento: parsed.data.tipoInstrumento,
      sessionId: parsed.data.sessionId,
      sessionCreatedAt: parsed.data.sessionCreatedAt,
      textoBorrador: parsed.data.textoBorrador,
      resultadoRevision: parsed.data.resultadoRevision,
      aportesPorAlerta: parsed.data.aportesPorAlerta,
    })

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      action: 'refine_from_review' as const,
      wizard_step: r.wizard_step,
      session: r.session,
      orchestrator: r.orchestrator,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    console.error('[api/senate]', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

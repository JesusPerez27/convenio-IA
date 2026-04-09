/**
 * Genera .docx editable a partir de texto tipo Markdown (borrador del redactor).
 * Estilo: Times New Roman, cuerpo justificado; títulos ## como encabezados.
 * Alternativa con plantilla institucional: `docxtemplater` + `pizzip` y un .docx en `public/templates/`.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

const FONT = 'Times New Roman'

function stripMdBold(segment: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(segment)) !== null) {
    if (m.index > last) {
      parts.push({ text: segment.slice(last, m.index), bold: false })
    }
    parts.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < segment.length) {
    parts.push({ text: segment.slice(last), bold: false })
  }
  if (parts.length === 0) {
    parts.push({ text: segment, bold: false })
  }
  return parts
}

function lineToParagraph(line: string): Paragraph {
  const trimmed = line.trim()
  if (trimmed.startsWith('## ')) {
    const t = trimmed.replace(/^##\s+/, '')
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: t, font: FONT, bold: true, size: 26 })],
    })
  }
  if (trimmed.startsWith('# ')) {
    const t = trimmed.replace(/^#\s+/, '')
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [new TextRun({ text: t, font: FONT, bold: true, size: 32 })],
    })
  }
  const chunks = stripMdBold(trimmed)
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 360 },
    children: chunks.map(
      (c) =>
        new TextRun({
          text: c.text,
          bold: c.bold,
          font: FONT,
          size: 24,
        })
    ),
  })
}

export async function buildDocxBufferFromMarkdown(markdown: string): Promise<Buffer> {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const paragraphs: Paragraph[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      paragraphs.push(
        new Paragraph({
          text: '',
          spacing: { after: 80 },
        })
      )
      continue
    }
    paragraphs.push(lineToParagraph(line))
  }
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  })
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

/**
 * A tiny, dependency-free PDF writer.
 *
 * The project has no PDF library installed and adding one is a heavyweight
 * change for a single screen, so this emits a minimal PDF 1.4 document
 * directly: one Type1 base font (Helvetica), uncompressed content streams and a
 * correct cross-reference table. Enough for a text guide that a shopkeeper
 * prints or saves.
 *
 * Base-14 fonts are guaranteed present in every conforming reader, so nothing
 * needs embedding.
 */

export type PdfAlign = 'left' | 'center' | 'right'

export interface PdfStyle {
  size?: number
  bold?: boolean
  /** Leading as a multiple of the font size. Defaults to 1.35. */
  lineHeight?: number
  color?: string
  align?: PdfAlign
  indent?: number
  spaceAfter?: number
}

export interface PdfSection {
  heading: string
  body: string[]
  bullets?: string[]
}

const PAGE_WIDTH = 595.28 // A4 in points
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

/** Helvetica advance widths per 1000 units for printable ASCII. */
const HELVETICA_WIDTHS: Record<string, number> = {
  ' ': 278, '!': 278, '"': 355, '#': 556, $: 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
  '@': 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '[': 278,
  '\\': 278, ']': 278, '^': 469, _: 556, '`': 333, a: 556, b: 556, c: 500, d: 556,
  e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556,
  o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500,
  y: 500, z: 500, '{': 334, '|': 260, '}': 334, '~': 584,
}

const BOLD_WIDTH_FACTOR = 1.06

export function textWidth(text: string, size: number, bold = false): number {
  let units = 0
  for (const ch of text) {
    // Unknown glyphs (curly quotes, dashes) approximate a wide lowercase
    // letter, which is close enough for layout.
    units += HELVETICA_WIDTHS[ch] ?? 556
  }
  return (units / 1000) * size * (bold ? BOLD_WIDTH_FACTOR : 1)
}

/** Greedy word wrap, mirroring how a text engine breaks lines. */
export function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (textWidth(candidate, size, bold) <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Escapes the characters that terminate a PDF string literal. */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/**
 * Assembles the document, paginating as it lays out so a heading is never
 * orphaned at the bottom of a page. Returns a Blob for the caller to download.
 */
export function buildPdf(opts: {
  title: string
  subtitle?: string
  sections: PdfSection[]
}): Blob {
  const { title, subtitle, sections } = opts

  const pages: string[] = []
  let ops: string[] = []
  let cursorY = PAGE_HEIGHT - MARGIN

  const newPage = () => {
    pages.push(ops.join('\n'))
    ops = []
    cursorY = PAGE_HEIGHT - MARGIN
  }

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < MARGIN) newPage()
  }

  const drawText = (text: string, style: PdfStyle = {}) => {
    const size = style.size ?? 11
    const bold = style.bold ?? false
    const lineHeight = (style.lineHeight ?? 1.35) * size
    const indent = style.indent ?? 0
    const color = style.color ?? '0 0 0'
    const availWidth = CONTENT_WIDTH - indent

    for (const line of wrapText(text, availWidth, size, bold)) {
      ensureSpace(lineHeight)
      let x = MARGIN + indent
      if (style.align === 'center') {
        x = MARGIN + indent + (availWidth - textWidth(line, size, bold)) / 2
      } else if (style.align === 'right') {
        x = PAGE_WIDTH - MARGIN - textWidth(line, size, bold)
      }
      const baseline = cursorY - size
      ops.push(
        `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdfText(line)}) Tj ET`
      )
      cursorY -= lineHeight
    }
    cursorY -= style.spaceAfter ?? 0
  }

  const drawRule = () => {
    ensureSpace(10)
    ops.push(
      `${MARGIN} ${cursorY.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${cursorY.toFixed(2)} l 0.85 0.87 0.9 RG 0.7 w S`
    )
    cursorY -= 12
  }

  drawText(title, { size: 20, bold: true, spaceAfter: 4 })
  if (subtitle) {
    drawText(subtitle, { size: 11, color: '0.35 0.38 0.44', spaceAfter: 10 })
  }
  drawRule()

  for (const section of sections) {
    // Keep a heading with at least two lines of its body.
    ensureSpace(46)
    drawText(section.heading, { size: 13, bold: true, color: '0.09 0.11 0.15', spaceAfter: 5 })

    for (const paragraph of section.body) {
      drawText(paragraph, { size: 10.5, color: '0.2 0.23 0.28', spaceAfter: 6 })
    }

    if (section.bullets?.length) {
      for (const bullet of section.bullets) {
        const size = 10.5
        const lineHeight = 1.35 * size
        wrapText(bullet, CONTENT_WIDTH - 16, size, false).forEach((line, i) => {
          ensureSpace(lineHeight)
          if (i === 0) {
            // Mid-dot bullet marker, as an escaped octal byte.
            ops.push(
              `BT /F1 ${size} Tf 0.35 0.38 0.44 rg 1 0 0 1 ${(MARGIN + 2).toFixed(2)} ${(cursorY - size).toFixed(2)} Tm (\\267) Tj ET`
            )
          }
          const baseline = cursorY - size
          ops.push(
            `BT /F1 ${size} Tf 0.2 0.23 0.28 rg 1 0 0 1 ${(MARGIN + 16).toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdfText(line)}) Tj ET`
          )
          cursorY -= lineHeight
        })
        cursorY -= 3
      }
      cursorY -= 4
    }
  }

  pages.push(ops.join('\n'))

  // Footers are added once the page count is known.
  const total = pages.length
  const footered = pages
    .map((content, i) => {
      const label = `Business Bot GH  ·  ${title}  ·  Page ${i + 1} of ${total}`
      const w = textWidth(label, 8.5)
      const footer =
        `BT /F1 8.5 Tf 0.55 0.58 0.63 rg 1 0 0 1 ${(PAGE_WIDTH - MARGIN - w).toFixed(2)} 34 Tm ` +
        `(${escapePdfText(label)}) Tj ET`
      return content.trim().length > 0 ? `${content}\n${footer}` : footer
    })
    .filter((c) => c.trim().length > 0)

  return assemblePdfBytes(footered)
}

/**
 * Byte length of a string as it will be written to the file.
 *
 * PDF syntax is ASCII, but the guide contains a middle-dot separator and the
 * occasional curly punctuation, so this counts UTF-8 bytes the same way
 * TextEncoder does. Kept dependency-free because jsdom does not expose
 * TextEncoder globally.
 */
function utf8Length(text: string): number {
  let bytes = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      // Surrogate pair encodes a single 4-byte code point.
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

/**
 * Serialises page content streams into a valid PDF file.
 *
 * Object layout: 1 catalog, 2 page tree, 3 F1, 4 F2, then two objects per page
 * (the page and its content stream). xref offsets must point at exact byte
 * positions, so offsets are counted in UTF-8 bytes rather than by string
 * length.
 */
function assemblePdfBytes(pageContents: string[]): Blob {
  const objects: string[] = []
  const pageCount = pageContents.length

  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  const kids = Array.from({ length: pageCount }, (_, i) => `${5 + i * 2} 0 R`).join(' ')
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  pageContents.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`
    )
    objects.push(`<< /Length ${utf8Length(content)} >>\nstream\n${content}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []

  objects.forEach((body, i) => {
    offsets.push(utf8Length(pdf))
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefStart = utf8Length(pdf)
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  pdf += xref

  return new Blob([pdf], { type: 'application/pdf' })
}

/** Triggers a browser download for the given blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
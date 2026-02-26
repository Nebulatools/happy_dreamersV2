/**
 * Parser para el output del Pasante AI
 *
 * Dos modos de operacion:
 * - Estructurado: Detecta headers SITUACION GENERAL:, HALLAZGOS DEL TEXTO LIBRE:, RECOMENDACIONES:
 * - Fallback: Para historial viejo sin estructura, separa por doble salto de linea
 */

export interface ParsedSection {
  type: "situation" | "findings" | "recommendations" | "paragraph"
  title?: string
  content: string[] // Parrafos o items de lista
}

// Headers que el AI genera en modo estructurado
const SECTION_HEADERS: Record<string, ParsedSection["type"]> = {
  "SITUACION GENERAL": "situation",
  "SITUACIÓN GENERAL": "situation",
  "HALLAZGOS DEL TEXTO LIBRE": "findings",
  "HALLAZGOS DEL TEXTO": "findings",
  "RECOMENDACIONES": "recommendations",
  "RECOMENDACIONES GENERALES": "recommendations",
}

/**
 * Detecta si el texto tiene estructura con headers en mayusculas
 */
function isStructured(text: string): boolean {
  return Object.keys(SECTION_HEADERS).some(header =>
    text.includes(`${header}:`) || text.includes(`${header}:\n`)
  )
}

/**
 * Parsea texto con headers en mayusculas (SITUACION GENERAL:, etc.)
 */
function parseStructured(text: string): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Regex para detectar headers: linea que empieza con texto en mayusculas seguido de ":"
  const headerPattern = new RegExp(
    `(?:^|\\n)(${Object.keys(SECTION_HEADERS).join("|")}):\\s*\\n?`,
    "g"
  )

  const matches = [...text.matchAll(headerPattern)]

  // Texto antes del primer header (si existe)
  if (matches.length > 0 && matches[0].index > 0) {
    const preText = text.slice(0, matches[0].index).trim()
    if (preText) {
      sections.push({
        type: "paragraph",
        content: splitIntoParas(preText),
      })
    }
  }

  // Cada seccion entre headers
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const headerKey = match[1]
    const type = SECTION_HEADERS[headerKey] || "paragraph"
    const startIdx = match.index + match[0].length
    const endIdx = i + 1 < matches.length ? matches[i + 1].index : text.length
    const body = text.slice(startIdx, endIdx).trim()

    if (body) {
      sections.push({
        type,
        title: headerKey,
        content: type === "recommendations" || type === "findings"
          ? extractListItems(body)
          : splitIntoParas(body),
      })
    }
  }

  return sections
}

/**
 * Parsea texto plano sin estructura (historial viejo)
 * Separa por doble salto de linea, detecta bullets y headers implicitos
 */
function parseFallback(text: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const blocks = text.split(/\n\n+/).filter(b => b.trim())

  for (const block of blocks) {
    const trimmed = block.trim()

    // Detectar bloque de lista (todas las lineas empiezan con "- " o "* " o numeros)
    const lines = trimmed.split("\n")
    const isList = lines.every(l => /^\s*[-*•]\s|^\s*\d+[.)]\s/.test(l))

    if (isList) {
      // Intentar detectar si es recomendaciones por contexto
      const lastSection = sections[sections.length - 1]
      const isAfterRecommendationHint = lastSection?.content.some(c =>
        /recomendaci|sugier|consider/i.test(c)
      )

      sections.push({
        type: isAfterRecommendationHint ? "recommendations" : "paragraph",
        content: extractListItems(trimmed),
      })
    } else if (/^[A-ZÁÉÍÓÚÑ\s]+:/.test(trimmed)) {
      // Linea que parece header en mayusculas (fallback parcial)
      const colonIdx = trimmed.indexOf(":")
      const title = trimmed.slice(0, colonIdx).trim()
      const body = trimmed.slice(colonIdx + 1).trim()

      const type = Object.entries(SECTION_HEADERS).find(([key]) =>
        title.includes(key)
      )?.[1] || "paragraph"

      sections.push({
        type,
        title,
        content: body ? (type === "recommendations" ? extractListItems(body) : splitIntoParas(body)) : [],
      })
    } else {
      // Parrafo normal
      sections.push({
        type: "paragraph",
        content: [trimmed],
      })
    }
  }

  return sections
}

/**
 * Separa texto en parrafos por salto de linea simple
 */
function splitIntoParas(text: string): string[] {
  return text
    .split(/\n(?!\s*[-*•]\s)/) // No cortar en bullets
    .map(p => p.trim())
    .filter(Boolean)
}

/**
 * Extrae items de una lista con bullets (- , * , numeros)
 */
function extractListItems(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  return lines.map(line =>
    line.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+[.)]\s+/, "")
  )
}

/**
 * Punto de entrada principal: parsea el texto del AI en secciones estructuradas
 */
export function parseAISummary(text: string): ParsedSection[] {
  if (!text || !text.trim()) return []

  const cleaned = text.trim()

  if (isStructured(cleaned)) {
    return parseStructured(cleaned)
  }

  return parseFallback(cleaned)
}

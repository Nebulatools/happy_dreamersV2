"use client"

import { parseAISummary, type ParsedSection } from "./parse-ai-summary"
import { cn } from "@/lib/utils"

interface FormattedAISummaryProps {
  text: string
  compact?: boolean // Menos spacing para historial
}

/**
 * Renderiza texto inline con soporte para **bold**
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Detectar **texto** para bold
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return text

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

/**
 * Renderiza una seccion de tipo "situation" o "paragraph"
 */
function SituationSection({ section, compact }: { section: ParsedSection; compact?: boolean }) {
  return (
    <div className={cn(compact ? "mb-2" : "mb-3")}>
      {section.title && (
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {section.title}
        </h4>
      )}
      {section.content.map((para, i) => (
        <p
          key={i}
          className={cn(
            "text-sm text-gray-700 leading-relaxed",
            i < section.content.length - 1 && (compact ? "mb-1.5" : "mb-2")
          )}
        >
          {renderInlineFormatting(para)}
        </p>
      ))}
    </div>
  )
}

/**
 * Renderiza una seccion de tipo "findings" (hallazgos del texto libre)
 */
function FindingsSection({ section, compact }: { section: ParsedSection; compact?: boolean }) {
  return (
    <div
      className={cn(
        "border-l-2 border-amber-400 bg-amber-50/50 rounded-r-lg",
        compact ? "px-3 py-2 mb-2" : "px-4 py-3 mb-3"
      )}
    >
      <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
        {section.title || "Hallazgos del texto libre"}
      </h4>
      <ul className="space-y-1.5">
        {section.content.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="leading-relaxed">{renderInlineFormatting(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renderiza una seccion de tipo "recommendations"
 */
function RecommendationsSection({ section, compact }: { section: ParsedSection; compact?: boolean }) {
  return (
    <div
      className={cn(
        "bg-purple-50/50 rounded-lg",
        compact ? "p-2 mb-2" : "p-3 mb-3"
      )}
    >
      <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
        {section.title || "Recomendaciones"}
      </h4>
      <ul className="space-y-1.5">
        {section.content.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
            <span className="leading-relaxed">{renderInlineFormatting(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Componente principal: renderiza el output del Pasante AI con formato visual
 */
export function FormattedAISummary({ text, compact = false }: FormattedAISummaryProps) {
  const sections = parseAISummary(text)

  // Si el parser no pudo extraer secciones, fallback a texto plano
  if (sections.length === 0) {
    return (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    )
  }

  return (
    <div>
      {sections.map((section, i) => {
        switch (section.type) {
          case "situation":
            return <SituationSection key={i} section={section} compact={compact} />
          case "findings":
            return <FindingsSection key={i} section={section} compact={compact} />
          case "recommendations":
            return <RecommendationsSection key={i} section={section} compact={compact} />
          case "paragraph":
          default:
            return <SituationSection key={i} section={section} compact={compact} />
        }
      })}
    </div>
  )
}

export default FormattedAISummary

// Triage ligero: evalua G2 (Medico) y G4 (Ambiental) sobre surveyData
// para clasificar severidad de un nino sin queries adicionales a MongoDB.
// Usado por el Panel General (dashboard-metrics) para alertas masivas.

import { validateMedicalIndicators } from "./rules/medical-rules"
import { validateEnvironmentalFactors } from "./rules/environmental-rules"
import { flattenSurveyData } from "./flatten-survey-data"

export interface TriageResult {
  severity: "critical" | "warning" | "ok"
  diagnosis: string // Texto legible: "Medico: Ronca, Respira por boca | Ambiental: Colecho"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function triageChild(rawSurveyData: Record<string, any>): TriageResult {
  const flat = flattenSurveyData(rawSurveyData)

  // Sin datos de survey -> no hay alertas posibles
  if (Object.keys(flat).length === 0) {
    return { severity: "ok", diagnosis: "" }
  }

  // G2: Indicadores medicos (survey-only, events vacio)
  const g2 = validateMedicalIndicators({ surveyData: flat, events: [] })

  // G4: Factores ambientales (survey-only, sin notas ni chat)
  const g4 = validateEnvironmentalFactors({
    surveyData: flat,
    recentEventNotes: [],
    chatMessages: [],
  })

  // Construir diagnostico legible desde criterios con alerta/warning
  const parts: string[] = []

  // G2 alerts
  const g2Alerts = g2.criteria
    .filter((c) => c.status === "alert")
    .map((c) => c.name)
  if (g2Alerts.length > 0) {
    parts.push(`Medico: ${g2Alerts.join(", ")}`)
  }

  // G4 alerts
  const g4Alerts = g4.criteria
    .filter((c) => c.status === "alert")
    .map((c) => c.name)
  if (g4Alerts.length > 0) {
    parts.push(`Ambiental: ${g4Alerts.join(", ")}`)
  }

  // G4 warnings (solo si no hay alerts que ya cubran)
  const g4Warnings = g4.criteria
    .filter((c) => c.status === "warning" && c.dataAvailable)
    .map((c) => c.name)
  if (g4Warnings.length > 0) {
    parts.push(`Revision: ${g4Warnings.join(", ")}`)
  }

  const diagnosis = parts.join(" | ")

  // Severity = peor entre g2 y g4 (alert -> critical, warning -> warning)
  let severity: TriageResult["severity"] = "ok"
  if (g2.status === "alert" || g4.status === "alert") {
    severity = "critical"
  } else if (g2.status === "warning" || g4.status === "warning") {
    severity = "warning"
  }

  return { severity, diagnosis }
}

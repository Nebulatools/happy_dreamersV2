/**
 * Ejemplo de migración de componentes al nuevo sistema de diseño
 * Este archivo muestra el antes y después de migrar un componente
 */

import { colors, spacing, borders, typography } from "@/lib/design-system"

// ============================================
// ANTES: Colores hardcodeados
// ============================================

export function ComponenteBefore() {
  return (
    <div 
      className="p-4 rounded-lg"
      style={{
        backgroundColor: "#F5F9FF",
        border: "1px solid #E5E7EB",
      }}
    >
      <h3 
        style={{ 
          color: "#2F2F2F",
          fontSize: "20px",
          marginBottom: "8px",
        }}
      >
        Título
      </h3>
      <div
        style={{
          backgroundColor: "#628BE6",
          color: "#FFFFFF",
          padding: "8px 16px",
          borderRadius: "8px",
        }}
      >
        Botón
      </div>
    </div>
  )
}

// ============================================
// DESPUÉS: Usando el sistema de diseño
// ============================================

export function ComponenteAfter() {
  return (
    <div 
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.blue[50], // #F5F9FF
        border: `1px solid ${colors.gray[200]}`, // #E5E7EB
      }}
    >
      <h3 
        style={{ 
          color: colors.gray[800], // #2F2F2F
          fontSize: typography.fontSize.xl[0], // 20px
          marginBottom: spacing[2], // 8px
        }}
      >
        Título
      </h3>
      <div
        style={{
          backgroundColor: colors.brand.mediumBlue, // #628BE6
          color: colors.white,
          padding: `${spacing[2]} ${spacing[4]}`, // 8px 16px
          borderRadius: borders.radius.lg, // 8px
        }}
      >
        Botón
      </div>
    </div>
  )
}

// ============================================
// EJEMPLO: Función getPriorityColor migrada
// ============================================

// ANTES
function getPriorityColorBefore(priority: string) {
  switch (priority) {
  case "high":
    return "bg-red-50 border-red-100"
  case "medium":
    return "bg-yellow-50 border-yellow-100"
  case "low":
    return "bg-green-50 border-green-100"
  default:
    return "bg-gray-50 border-gray-100"
  }
}

// DESPUÉS - Usando el sistema pero manteniendo las clases Tailwind
function getPriorityColorAfter(priority: string) {
  // Nota: Las clases Tailwind ya están configuradas con nuestros tokens
  // Esta función se mantiene igual porque Tailwind ya usa nuestro sistema
  switch (priority) {
  case "high":
    return "bg-red-50 border-red-100"
  case "medium":
    return "bg-yellow-50 border-yellow-100"
  case "low":
    return "bg-green-50 border-green-100"
  default:
    return "bg-gray-50 border-gray-100"
  }
}

// ============================================
// EJEMPLO: Colores de gráficos migrados
// ============================================

import { getChartColor, getEventColor, getMoodColor } from "@/lib/design-system"

// ANTES
const chartColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"]
const sleepColor = "#7DBFE2"
const moodColors = {
  feliz: "#FFBB28",
  tranquilo: "#00C49F",
  cansado: "#0088FE",
  irritable: "#FF8042",
}

// DESPUÉS
function ChartExample() {
  // Colores de gráfico por índice
  const seriesColors = [0, 1, 2, 3].map(i => getChartColor(i))
  
  // Color de evento de sueño
  const sleepEventColor = getEventColor("sleep")
  
  // Colores de estado de ánimo
  const happyMoodColor = getMoodColor("feliz")
  const calmMoodColor = getMoodColor("tranquilo")
  
  return {
    seriesColors,
    sleepEventColor,
    moodColors: {
      happy: happyMoodColor,
      calm: calmMoodColor,
    },
  }
}

// ============================================
// EJEMPLO: Componente completo migrado
// ============================================

import React from "react"
import { happyDreamersTokens } from "@/lib/design-system"

// ANTES
export function SleepCardBefore() {
  return (
    <div 
      style={{
        backgroundColor: "#FFFFFF",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <h2 style={{ color: "#4A90E2", fontSize: "24px" }}>
        Análisis de Sueño
      </h2>
      <div style={{ marginTop: "16px" }}>
        <div style={{ backgroundColor: "#F5F9FF", padding: "12px", borderRadius: "8px" }}>
          <span style={{ color: "#6B7280" }}>Horas recomendadas:</span>
          <strong style={{ color: "#2F2F2F", marginLeft: "8px" }}>11-14 horas</strong>
        </div>
      </div>
    </div>
  )
}

// DESPUÉS
export function SleepCardAfter() {
  const { components } = happyDreamersTokens
  const toddlerSleep = happyDreamersTokens.sleepRecommendations.toddler
  
  return (
    <div 
      style={{
        backgroundColor: colors.white,
        padding: components.card.padding,
        borderRadius: components.card.borderRadius,
        boxShadow: components.card.shadow,
      }}
    >
      <h2 style={{ 
        color: colors.brand.secondary, 
        fontSize: typography.fontSize["2xl"][0], 
      }}>
        Análisis de Sueño
      </h2>
      <div style={{ marginTop: spacing[4] }}>
        <div style={{ 
          backgroundColor: colors.blue[50], 
          padding: spacing[3], 
          borderRadius: borders.radius.lg, 
        }}>
          <span style={{ color: colors.gray[500] }}>
            Horas recomendadas:
          </span>
          <strong style={{ 
            color: colors.gray[800], 
            marginLeft: spacing[2], 
          }}>
            {toddlerSleep.min}-{toddlerSleep.max} horas
          </strong>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MEJORES PRÁCTICAS
// ============================================

/**
 * 1. Usa los tokens en lugar de valores hardcodeados
 * 2. Aprovecha los helpers para casos comunes (eventos, moods, charts)
 * 3. Si necesitas un color nuevo, agrégalo al sistema primero
 * 4. Mantén consistencia usando los mismos tokens en componentes similares
 * 5. Documenta cualquier excepción o caso especial
 */

// EJEMPLO DE USO CON STYLED COMPONENTS O EMOTION
const StyledCard = styled.div`
  background-color: ${colors.white};
  padding: ${spacing[6]};
  border-radius: ${borders.radius.xl};
  box-shadow: ${shadows.md};
  
  &:hover {
    box-shadow: ${shadows.lg};
    transition: box-shadow ${animations.duration[300]} ${animations.timing.inOut};
  }
`

// EJEMPLO DE USO CON CSS MODULES
/*
.card {
  background-color: var(--color-white);
  padding: var(--spacing-6);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}
*/
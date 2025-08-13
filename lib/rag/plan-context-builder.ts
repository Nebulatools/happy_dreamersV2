// Builder de contexto para planes de niños en el sistema RAG
// Obtiene y formatea información del plan activo para el asistente

import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { ChildPlan } from "@/types/models"
import { createLogger } from "@/lib/logger"

const logger = createLogger("PlanContextBuilder")

/**
 * Obtiene el plan activo de un niño (el de mayor planNumber con status active)
 */
export async function getActivePlan(childId: string, userId: string): Promise<ChildPlan | null> {
  try {
    const { db } = await connectToDatabase()
    
    const plan = await db.collection("child_plans")
      .findOne({
        childId: new ObjectId(childId),
        userId: new ObjectId(userId),
        status: "active"
      }, {
        sort: { planNumber: -1 } // El más reciente
      })

    if (!plan) {
      logger.info(`No se encontró plan activo para childId: ${childId}`)
      return null
    }

    logger.info(`Plan activo encontrado: Plan ${plan.planNumber} para childId: ${childId}`)
    return plan as ChildPlan

  } catch (error) {
    logger.error("Error obteniendo plan activo:", error)
    return null
  }
}

/**
 * Construye un contexto estructurado del plan para el asistente
 */
export function buildPlanContext(plan: ChildPlan): string {
  if (!plan) return ""

  let context = "=== PLAN ACTUAL DEL NIÑO ===\n"
  
  // Información básica del plan
  context += `Plan Número: ${plan.planNumber}\n`
  context += `Título: ${plan.title}\n`
  context += `Tipo: ${plan.planType === 'initial' ? 'Plan Inicial' : 'Plan Basado en Análisis'}\n\n`

  // Objetivos del plan
  if (plan.objectives && plan.objectives.length > 0) {
    context += "📋 OBJETIVOS DEL PLAN:\n"
    plan.objectives.forEach((objetivo, index) => {
      context += `${index + 1}. ${objetivo}\n`
    })
    context += "\n"
  }

  // Horarios estructurados
  if (plan.schedule) {
    context += "⏰ HORARIOS ESTABLECIDOS:\n"
    
    if (plan.schedule.bedtime) {
      context += `• Hora de acostarse: ${plan.schedule.bedtime}\n`
    }
    
    if (plan.schedule.wakeTime) {
      context += `• Hora de despertar: ${plan.schedule.wakeTime}\n`
    }

    // Siestas
    if (plan.schedule.naps && plan.schedule.naps.length > 0) {
      context += "• Siestas programadas:\n"
      plan.schedule.naps.forEach((nap, index) => {
        context += `  - ${nap.time} (${nap.duration} minutos)${nap.description ? ` - ${nap.description}` : ''}\n`
      })
    }

    // Comidas
    if (plan.schedule.meals && plan.schedule.meals.length > 0) {
      context += "• Horarios de comidas:\n"
      plan.schedule.meals.forEach((meal) => {
        context += `  - ${meal.time}: ${meal.type}${meal.description ? ` - ${meal.description}` : ''}\n`
      })
    }

    // Actividades
    if (plan.schedule.activities && plan.schedule.activities.length > 0) {
      context += "• Actividades programadas:\n"
      plan.schedule.activities.forEach((activity) => {
        context += `  - ${activity.time}: ${activity.activity} (${activity.duration} min)${activity.description ? ` - ${activity.description}` : ''}\n`
      })
    }
    context += "\n"
  }

  // Recomendaciones específicas
  if (plan.recommendations && plan.recommendations.length > 0) {
    context += "💡 RECOMENDACIONES ESPECÍFICAS:\n"
    plan.recommendations.forEach((rec, index) => {
      context += `${index + 1}. ${rec}\n`
    })
    context += "\n"
  }

  // Información sobre la base del plan
  if (plan.basedOn) {
    context += "📊 BASE DEL PLAN:\n"
    if (plan.basedOn === "survey_stats_rag") {
      context += "• Basado en: Cuestionario inicial + Estadísticas del niño + Conocimiento médico\n"
      if (plan.sourceData) {
        context += `• Edad del niño: ${plan.sourceData.ageInMonths} meses\n`
        context += `• Eventos registrados: ${plan.sourceData.totalEvents}\n`
      }
    } else if (plan.basedOn === "transcript_analysis") {
      context += "• Basado en: Análisis de consulta médica transcrita\n"
      if (plan.transcriptAnalysis) {
        context += `• Plan anterior actualizado: Plan ${plan.transcriptAnalysis.previousPlanNumber}\n`
      }
    }
    context += "\n"
  }

  context += "=== FIN DEL PLAN ACTUAL ===\n"
  
  return context
}

/**
 * Obtiene un resumen corto del plan para mostrar en la UI
 */
export function getPlanSummary(plan: ChildPlan): string {
  if (!plan) return "Sin plan activo"
  
  const bedtime = plan.schedule?.bedtime || "No definida"
  const wakeTime = plan.schedule?.wakeTime || "No definida"
  const napCount = plan.schedule?.naps?.length || 0
  
  return `Plan ${plan.planNumber}: Dormir ${bedtime} - Despertar ${wakeTime}${napCount > 0 ? ` - ${napCount} siesta(s)` : ''}`
}

/**
 * Verifica si existe un plan activo para un niño
 */
export async function hasActivePlan(childId: string, userId: string): Promise<boolean> {
  try {
    const plan = await getActivePlan(childId, userId)
    return plan !== null
  } catch (error) {
    logger.error("Error verificando si existe plan activo:", error)
    return false
  }
}

/**
 * Obtiene información contextual completa del niño incluyendo el plan
 */
export async function getChildPlanContext(childId: string, userId: string): Promise<string> {
  try {
    const plan = await getActivePlan(childId, userId)
    
    if (!plan) {
      return "El niño no tiene un plan de sueño activo. Recomiendo generar un plan inicial basado en sus datos actuales."
    }

    return buildPlanContext(plan)
  } catch (error) {
    logger.error("Error obteniendo contexto del plan del niño:", error)
    return "Error al obtener el plan del niño."
  }
}

/**
 * Obtiene el historial completo de planes del niño para contexto evolutivo
 */
export async function getAllPlansContext(childId: string, userId: string): Promise<string> {
  try {
    const { db } = await connectToDatabase()
    
    const plans = await db.collection("child_plans")
      .find({
        childId: new ObjectId(childId),
        userId: new ObjectId(userId)
      })
      .sort({ planNumber: -1 }) // Más reciente primero
      .limit(3) // Máximo 3 planes para eficiencia
      .toArray()

    if (plans.length === 0) {
      return "No hay planes registrados para este niño."
    }

    logger.info(`Historial de planes encontrado: ${plans.length} planes para childId: ${childId}`)

    // Formatear evolución de planes de manera concisa
    let context = "=== EVOLUCIÓN DE PLANES ===\n"
    
    plans.forEach((plan, index) => {
      const isActive = plan.status === "active"
      const status = isActive ? "(ACTIVO)" : "(ANTERIOR)"
      
      context += `\n📋 PLAN ${plan.planNumber} ${status}:\n`
      context += `• Tipo: ${plan.planType === 'initial' ? 'Plan Inicial' : 'Plan Basado en Análisis'}\n`
      
      if (plan.schedule) {
        if (plan.schedule.bedtime) {
          context += `• Hora de dormir: ${plan.schedule.bedtime}\n`
        }
        if (plan.schedule.wakeTime) {
          context += `• Hora de despertar: ${plan.schedule.wakeTime}\n`
        }
        if (plan.schedule.naps?.length > 0) {
          context += `• Siestas: ${plan.schedule.naps.length} programadas\n`
        }
      }
      
      // Solo mostrar 2 recomendaciones principales para eficiencia
      if (plan.recommendations && plan.recommendations.length > 0) {
        context += `• Recomendaciones principales:\n`
        plan.recommendations.slice(0, 2).forEach(rec => {
          context += `  - ${rec}\n`
        })
      }
    })
    
    context += "\n=== FIN EVOLUCIÓN ===\n"
    
    return context
  } catch (error) {
    logger.error("Error obteniendo historial de planes:", error)
    return "Error al obtener el historial de planes del niño."
  }
}
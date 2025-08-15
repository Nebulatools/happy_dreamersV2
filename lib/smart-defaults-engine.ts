// Smart Defaults Engine para modo simple - Happy Dreamers v5.0
// Genera defaults inteligentes basados en edad, historial y contexto

import { 
  SmartDefaultsEngineConfig, 
  SmartDefaultsResult, 
  UserModePreferences 
} from '@/types/mode-system'
import { EventData, EventType, FeedingType, EmotionalState } from '@/components/events/types'
import { parseISO, differenceInMonths } from 'date-fns'

/**
 * Engine inteligente para generar defaults basados en:
 * - Edad del niño
 * - Historial de eventos
 * - Hora del día
 * - Preferencias del usuario
 * - Patrones de comportamiento
 */
export class SmartDefaultsEngine {
  private childData: SmartDefaultsEngineConfig['childData']
  private eventHistory: EventData[]
  private userPreferences: UserModePreferences
  private currentTime: Date

  constructor(config: SmartDefaultsEngineConfig) {
    this.childData = config.childData
    this.eventHistory = config.eventHistory
    this.userPreferences = config.userPreferences
    this.currentTime = config.currentTime
  }

  /**
   * Genera todos los defaults inteligentes
   */
  generateDefaults(): SmartDefaultsResult {
    const sleepDefaults = this.getSleepDefaults()
    const feedingDefaults = this.getFeedingDefaults()
    
    return {
      sleepDefaults,
      feedingDefaults,
      confidence: this.calculateConfidence(),
      basedOn: this.getPrimarySource()
    }
  }

  /**
   * Defaults específicos para eventos de sueño
   */
  getSleepDefaults(): Partial<EventData> {
    const hour = this.currentTime.getHours()
    
    // Base según edad
    const baseDelay = this.getAgeBasedSleepDelay()
    
    // Ajuste según historial
    const historicalDelay = this.getAverageSleepDelay()
    
    // Ajuste según hora del día
    const timeAdjustment = this.getTimeBasedSleepAdjustment(hour)
    
    // Default final (prioridad: historial > edad > tiempo)
    const finalDelay = historicalDelay !== null 
      ? Math.min(historicalDelay + timeAdjustment, 45) // Máximo 45min
      : Math.min(baseDelay + timeAdjustment, 30)       // Máximo 30min si no hay historial
    
    return {
      sleepDelay: Math.max(0, finalDelay), // Nunca negativo
      emotionalState: this.getPredictedEmotionalState(),
      notes: '',
      fromSimpleMode: true
    }
  }

  /**
   * Defaults específicos para eventos de alimentación
   */
  getFeedingDefaults(): Partial<EventData> {
    const hour = this.currentTime.getHours()
    
    return {
      feedingType: this.getPreferredFeedingType(),
      feedingAmount: this.getAgeAppropriateFeedingAmount(),
      feedingDuration: this.getTypicalFeedingDuration(),
      babyState: this.predictBabyState(hour),
      feedingNotes: '',
      emotionalState: 'neutral' as EmotionalState,
      fromSimpleMode: true
    }
  }

  // ========== MÉTODOS PRIVADOS PARA CÁLCULOS ESPECÍFICOS ==========

  /**
   * Delay de sueño base según edad del niño
   */
  private getAgeBasedSleepDelay(): number {
    const ageMonths = this.childData.ageInMonths
    
    if (ageMonths < 3) return 2  // 0-3 meses: muy poco delay
    if (ageMonths < 6) return 3  // 3-6 meses: poco delay
    if (ageMonths < 12) return 5 // 6-12 meses: delay normal
    if (ageMonths < 24) return 8 // 1-2 años: más delay
    return 10                    // 2+ años: delay mayor
  }

  /**
   * Promedio histórico de sleepDelay
   */
  private getAverageSleepDelay(): number | null {
    const sleepEvents = this.eventHistory
      .filter(e => ['sleep', 'nap'].includes(e.eventType))
      .filter(e => e.sleepDelay !== null && e.sleepDelay !== undefined)
      .slice(-10) // Últimos 10 eventos para relevancia
    
    if (sleepEvents.length < 3) return null // Necesitamos al menos 3 eventos
    
    const total = sleepEvents.reduce((sum, e) => sum + (e.sleepDelay || 0), 0)
    return Math.round(total / sleepEvents.length)
  }

  /**
   * Ajuste de delay según hora del día
   */
  private getTimeBasedSleepAdjustment(hour: number): number {
    // Horarios de sueño nocturno (más difícil dormirse)
    if (hour >= 19 || hour < 6) return 3
    
    // Horarios de siesta (varía según hora)
    if (hour >= 12 && hour <= 15) return 0  // Siesta post-almuerzo
    if (hour >= 16 && hour <= 18) return 2  // Siesta tardía
    
    // Otros horarios (unusual)
    return 1
  }

  /**
   * Predice estado emocional basado en patrones
   */
  private getPredictedEmotionalState(): EmotionalState {
    const hour = this.currentTime.getHours()
    
    // Análisis de historial reciente
    const recentEvents = this.eventHistory
      .filter(e => ['sleep', 'nap'].includes(e.eventType))
      .slice(-5)
    
    if (recentEvents.length >= 3) {
      const emotionalStates = recentEvents
        .map(e => e.emotionalState)
        .filter(Boolean)
      
      // Encontrar el estado más común
      const stateFreq = emotionalStates.reduce((acc, state) => {
        acc[state!] = (acc[state!] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const mostCommon = Object.entries(stateFreq)
        .sort(([,a], [,b]) => b - a)[0]
      
      if (mostCommon) return mostCommon[0] as EmotionalState
    }
    
    // Fallback basado en hora (patrones típicos)
    if (hour >= 20 || hour < 6) return 'tranquilo'  // Noche
    if (hour >= 16 && hour <= 19) return 'inquieto' // Tarde/evening
    return 'tranquilo' // Default seguro
  }

  /**
   * Tipo de alimentación preferido basado en historial
   */
  private getPreferredFeedingType(): FeedingType {
    const feedingEvents = this.eventHistory
      .filter(e => e.eventType === 'feeding')
      .slice(-15) // Últimos 15 eventos
    
    if (feedingEvents.length >= 5) {
      const typeFreq = feedingEvents.reduce((acc, e) => {
        const type = e.feedingType
        if (type) acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<FeedingType, number>)
      
      const mostUsed = Object.entries(typeFreq)
        .sort(([,a], [,b]) => b - a)[0]
      
      if (mostUsed) return mostUsed[0] as FeedingType
    }
    
    // Fallback basado en edad y preferencias
    if (this.childData.ageInMonths < 6) {
      return this.userPreferences.smartDefaults.feedingType === 'breast' 
        ? 'breast' : 'bottle'
    }
    
    return this.userPreferences.smartDefaults.feedingType
  }

  /**
   * Cantidad apropiada según edad y tipo
   */
  private getAgeAppropriateFeedingAmount(): number {
    const ageMonths = this.childData.ageInMonths
    const preferredType = this.getPreferredFeedingType()
    
    // Análisis histórico si hay datos suficientes
    const historicalAmount = this.getAverageFeedingAmount(preferredType)
    if (historicalAmount !== null) {
      return historicalAmount
    }
    
    // Defaults por edad y tipo
    switch (preferredType) {
      case 'breast':
        if (ageMonths < 3) return 15   // 15 min
        if (ageMonths < 6) return 20   // 20 min
        if (ageMonths < 12) return 25  // 25 min
        return 20                      // 20 min default
        
      case 'bottle':
        if (ageMonths < 1) return 60   // 60ml
        if (ageMonths < 3) return 90   // 90ml
        if (ageMonths < 6) return 120  // 120ml
        if (ageMonths < 12) return 180 // 180ml
        return 200                     // 200ml
        
      case 'solids':
        if (ageMonths < 6) return 30   // 30gr (inicio BLW)
        if (ageMonths < 12) return 50  // 50gr
        if (ageMonths < 18) return 75  // 75gr
        return 100                     // 100gr
        
      default:
        return this.userPreferences.smartDefaults.feedingAmount
    }
  }

  /**
   * Promedio histórico de cantidad por tipo
   */
  private getAverageFeedingAmount(type: FeedingType): number | null {
    const events = this.eventHistory
      .filter(e => e.eventType === 'feeding' && e.feedingType === type)
      .filter(e => e.feedingAmount && e.feedingAmount > 0)
      .slice(-8) // Últimos 8 eventos del tipo
    
    if (events.length < 3) return null
    
    const total = events.reduce((sum, e) => sum + (e.feedingAmount || 0), 0)
    return Math.round(total / events.length)
  }

  /**
   * Duración típica de alimentación
   */
  private getTypicalFeedingDuration(): number {
    const preferredType = this.getPreferredFeedingType()
    
    // Para pecho, usar el tiempo como cantidad
    if (preferredType === 'breast') {
      return this.getAgeAppropriateFeedingAmount()
    }
    
    // Para otros tipos, calcular duración basada en historial o defaults
    const historicalDuration = this.getAverageFeedingDuration()
    if (historicalDuration !== null) {
      return historicalDuration
    }
    
    // Defaults por edad
    const ageMonths = this.childData.ageInMonths
    if (ageMonths < 6) return 15   // 15 min
    if (ageMonths < 12) return 20  // 20 min
    return 25                      // 25 min
  }

  /**
   * Promedio histórico de duración de alimentación
   */
  private getAverageFeedingDuration(): number | null {
    const events = this.eventHistory
      .filter(e => e.eventType === 'feeding')
      .filter(e => e.feedingDuration && e.feedingDuration > 0)
      .slice(-10)
    
    if (events.length < 3) return null
    
    const total = events.reduce((sum, e) => sum + (e.feedingDuration || 0), 0)
    return Math.round(total / events.length)
  }

  /**
   * Predice estado del bebé según hora
   */
  private predictBabyState(hour: number): 'awake' | 'asleep' {
    // Tomas nocturnas típicas
    if (hour >= 22 || hour < 6) return 'asleep'
    
    // Horario diurno
    return 'awake'
  }

  /**
   * Calcula confianza en los defaults (0-1)
   */
  private calculateConfidence(): number {
    let confidence = 0.5 // Base
    
    // +0.3 si tenemos historial suficiente
    if (this.eventHistory.length >= 10) confidence += 0.3
    
    // +0.2 si tenemos eventos recientes del mismo tipo
    const recentEvents = this.eventHistory.slice(-5)
    if (recentEvents.length >= 3) confidence += 0.2
    
    // -0.1 si el niño es muy joven (menos predictible)
    if (this.childData.ageInMonths < 3) confidence -= 0.1
    
    return Math.min(1, Math.max(0, confidence))
  }

  /**
   * Determina fuente principal de los defaults
   */
  private getPrimarySource(): SmartDefaultsResult['basedOn'] {
    if (this.eventHistory.length >= 10) return 'history'
    if (this.eventHistory.length >= 3) return 'preference'
    if (this.currentTime.getHours() >= 19 || this.currentTime.getHours() < 6) return 'time'
    return 'age'
  }
}

/**
 * Helper function para crear el engine con datos del niño
 */
export function createSmartDefaultsEngine(
  childData: { id: string; birthDate: string },
  eventHistory: EventData[],
  userPreferences: UserModePreferences,
  currentTime: Date = new Date()
): SmartDefaultsEngine {
  const ageInMonths = differenceInMonths(currentTime, parseISO(childData.birthDate))
  
  const config: SmartDefaultsEngineConfig = {
    childData: {
      ...childData,
      ageInMonths: Math.max(0, ageInMonths)
    },
    eventHistory,
    userPreferences,
    currentTime
  }
  
  return new SmartDefaultsEngine(config)
}

/**
 * Función de conveniencia para obtener defaults rápidamente
 */
export function getQuickDefaults(
  eventType: EventType,
  childData: { id: string; birthDate: string },
  eventHistory: EventData[],
  userPreferences: UserModePreferences
): Partial<EventData> {
  const engine = createSmartDefaultsEngine(childData, eventHistory, userPreferences)
  const defaults = engine.generateDefaults()
  
  if (eventType === 'sleep' || eventType === 'nap') {
    return defaults.sleepDefaults
  }
  
  if (eventType === 'feeding') {
    return defaults.feedingDefaults
  }
  
  return {}
}
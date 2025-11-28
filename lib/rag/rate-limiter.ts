// Rate Limiter para proteger el sistema RAG de abuso
// Implementación con memory store para nivel profesional

import { createLogger } from "@/lib/logger"

const logger = createLogger("RateLimiter")

interface RateLimitData {
  count: number
  resetTime: number
  firstRequest: number
}

// Map para almacenar los contadores por usuario
const requestCounts = new Map<string, RateLimitData>()

// Configuración por defecto
const DEFAULT_LIMITS = {
  requests: 30,        // 30 requests por minuto
  window: 60 * 1000,   // Ventana de 1 minuto
  burstRequests: 10,   // Máximo 10 requests en burst inicial
  burstWindow: 10 * 1000, // Ventana de burst de 10 segundos
}

/**
 * Verifica si el usuario puede hacer una request
 * @param userId ID único del usuario
 * @param limits Límites personalizados (opcional)
 * @returns true si puede continuar, false si está limitado
 */
export function checkRateLimit(
  userId: string, 
  limits = DEFAULT_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  
  const now = Date.now()
  const userLimit = requestCounts.get(userId)
  
  // Primera request del usuario o window expiró
  if (!userLimit || now > userLimit.resetTime) {
    const newData: RateLimitData = {
      count: 1,
      resetTime: now + limits.window,
      firstRequest: now,
    }
    
    requestCounts.set(userId, newData)
    
    logger.info(`✅ Nueva ventana para usuario ${userId.substring(0, 8)}...`)
    
    return {
      allowed: true,
      remaining: limits.requests - 1,
      resetTime: newData.resetTime,
    }
  }
  
  // Verificar límite de burst (primeros 10 segundos)
  const timeSinceFirst = now - userLimit.firstRequest
  if (timeSinceFirst <= limits.burstWindow && userLimit.count >= limits.burstRequests) {
    logger.warn(`🚨 Burst limit excedido para ${userId.substring(0, 8)}... (${userLimit.count}/${limits.burstRequests})`)
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    }
  }
  
  // Verificar límite general
  if (userLimit.count >= limits.requests) {
    logger.warn(`⛔ Rate limit excedido para ${userId.substring(0, 8)}... (${userLimit.count}/${limits.requests})`)
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    }
  }
  
  // Incrementar contador
  userLimit.count++
  
  const remaining = limits.requests - userLimit.count
  logger.debug(`📊 Rate limit para ${userId.substring(0, 8)}...: ${userLimit.count}/${limits.requests} (${remaining} restantes)`)
  
  return {
    allowed: true,
    remaining,
    resetTime: userLimit.resetTime,
  }
}

/**
 * Obtiene estadísticas del rate limiter para monitoreo
 */
export function getRateLimitStats() {
  const now = Date.now()
  const active = Array.from(requestCounts.entries())
    .filter(([_, data]) => now <= data.resetTime)
    .length
  
  const total = requestCounts.size
  
  return {
    activeUsers: active,
    totalTracked: total,
    cacheSize: requestCounts.size,
  }
}

/**
 * Limpia datos expirados para evitar memory leaks
 */
export function cleanExpiredRateLimits() {
  const now = Date.now()
  let cleaned = 0
  
  for (const [userId, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(userId)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    logger.info(`🧹 Limpiados ${cleaned} rate limits expirados`)
  }
  
  return cleaned
}

/**
 * Reset manual del rate limit para un usuario (para admin)
 */
export function resetUserRateLimit(userId: string): boolean {
  const existed = requestCounts.has(userId)
  requestCounts.delete(userId)
  
  if (existed) {
    logger.info(`🔄 Rate limit reseteado manualmente para ${userId.substring(0, 8)}...`)
  }
  
  return existed
}

// Cleanup automático cada 5 minutos
setInterval(() => {
  cleanExpiredRateLimits()
}, 5 * 60 * 1000)
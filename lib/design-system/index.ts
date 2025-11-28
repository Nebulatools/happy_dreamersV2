/**
 * Happy Dreamers Design System
 * 
 * Sistema centralizado de tokens de diseño para mantener
 * consistencia visual en toda la aplicación
 */

// Re-exportar todos los tokens
export * from "./tokens"

// Re-exportar helpers específicos
export { 
  getEventColor, 
  getMoodColor, 
  getChartColor, 
} from "./tokens"

// Exportar un objeto único con todos los tokens para uso conveniente
import * as tokens from "./tokens"

export const designSystem = {
  colors: tokens.colors,
  spacing: tokens.spacing,
  typography: tokens.typography,
  borders: tokens.borders,
  shadows: tokens.shadows,
  breakpoints: tokens.breakpoints,
  zIndex: tokens.zIndex,
  animations: tokens.animations,
  happyDreamers: tokens.happyDreamersTokens,
} as const

// Alias convenientes para uso común
export const theme = designSystem
export const ds = designSystem
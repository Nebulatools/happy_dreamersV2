// Utilidades para manejar respuestas de API
// Ayuda a manejar diferentes formatos de respuesta de manera consistente

import type { Child } from "@/types/models"

/**
 * Extrae el array de niños de diferentes formatos de respuesta de API
 * @param data - Respuesta de la API en cualquier formato
 * @returns Array de niños o array vacío si no se puede extraer
 */
export function extractChildrenFromResponse(data: any): Child[] {
  // Nuevo formato con data wrapper
  if (data?.data?.children && Array.isArray(data.data.children)) {
    return data.data.children
  }
  
  // Formato con success flag
  if (data?.success && data?.children && Array.isArray(data.children)) {
    return data.children
  }
  
  // Formato directo (array)
  if (Array.isArray(data)) {
    return data
  }
  
  // Si no coincide con ningún formato conocido, retornar array vacío
  return []
}

/**
 * Verifica si la respuesta contiene niños válidos
 * @param data - Respuesta de la API
 * @returns true si hay niños válidos, false en caso contrario
 */
export function hasValidChildren(data: any): boolean {
  const children = extractChildrenFromResponse(data)
  return children.length > 0
}
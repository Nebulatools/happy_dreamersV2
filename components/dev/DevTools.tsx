"use client"

import React from 'react'
import { TimeAdjuster } from './TimeAdjuster'
import { useDevTime } from '@/context/dev-time-context'

/**
 * Contenedor para herramientas de desarrollo
 * Solo se muestra en modo desarrollo
 */
export function DevTools() {
  const { setSimulatedTime, isDevelopment } = useDevTime()
  
  // No mostrar en producción
  if (!isDevelopment) return null
  
  return (
    <>
      {/* Reloj de desarrollo para simular diferentes horas */}
      <TimeAdjuster onTimeChange={setSimulatedTime} />
      
      {/* Aquí se pueden agregar más herramientas de desarrollo en el futuro */}
    </>
  )
}
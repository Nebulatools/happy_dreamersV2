"use client"

import React from 'react'
import { TimeAdjuster } from './TimeAdjuster'
import { useDevTime } from '@/context/dev-time-context'
import { useUser } from '@/context/UserContext'

/**
 * Contenedor para herramientas de desarrollo
 * Solo se muestra en modo desarrollo
 */
export function DevTools() {
  const { setSimulatedTime, isDevelopment } = useDevTime()
  const { userData } = useUser()

  // No mostrar en producción
  if (!isDevelopment) return null

  return (
    <>
      {/* Reloj de desarrollo para simular diferentes horas */}
      <TimeAdjuster
        onTimeChange={setSimulatedTime}
        timezone={userData?.timezone}
      />

      {/* Aquí se pueden agregar más herramientas de desarrollo en el futuro */}
    </>
  )
}
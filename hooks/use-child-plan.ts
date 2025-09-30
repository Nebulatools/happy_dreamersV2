// Hook simplificado para obtener y cachear el plan activo del niño
// Proporciona horarios de sueño y contexto temporal

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface Schedule {
  bedtime: string
  wakeTime: string
  naps?: Array<{
    time: string
    duration: number
    description?: string
  }>
}

interface ChildPlan {
  _id?: string
  schedule: Schedule
  planNumber?: number
  title?: string
  isDefault: boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useChildPlan(childId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ChildPlan>(
    childId ? `/api/children/${childId}/active-plan` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache por 1 minuto
    }
  )

  // Helper seguro para convertir "HH:MM" a minutos desde 00:00
  const toMinutes = (t?: string | null): number | null => {
    if (!t || typeof t !== 'string') return null
    const parts = t.split(':')
    if (parts.length !== 2) return null
    const h = Number(parts[0])
    const m = Number(parts[1])
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m))
  }

  // Función helper para determinar si es horario nocturno
  const isNightTime = (date: Date = new Date()): boolean => {
    if (!data?.schedule) return false
    
    const currentHour = date.getHours()
    const currentMinutes = date.getMinutes()
    const currentTime = currentHour * 60 + currentMinutes
    
    const bedtime = toMinutes(data.schedule.bedtime) ?? toMinutes('20:00')!
    const wakeTime = toMinutes(data.schedule.wakeTime) ?? toMinutes('07:00')!
    
    // Si bedtime es después de medianoche (ej: 01:00)
    if (bedtime < wakeTime) {
      return currentTime >= bedtime && currentTime < wakeTime
    }
    
    // Si bedtime es antes de medianoche (ej: 20:00)
    return currentTime >= bedtime || currentTime < wakeTime
  }

  // Función helper para determinar si es hora de siesta
  const isNapTime = (date: Date = new Date()): boolean => {
    const naps = data?.schedule?.naps
    if (!naps || naps.length === 0) return false
    
    const currentHour = date.getHours()
    const currentMinutes = date.getMinutes()
    const currentTime = currentHour * 60 + currentMinutes
    
    return naps.some(nap => {
      const napStart = toMinutes(nap?.time)
      const dur = typeof nap?.duration === 'number' ? nap.duration : 0
      if (napStart === null || dur <= 0) return false
      const napEnd = napStart + dur
      
      return currentTime >= napStart && currentTime <= napEnd
    })
  }

  // Función para obtener el contexto temporal actual
  const getTimeContext = (date: Date = new Date()) => {
    if (isNightTime(date)) {
      return 'night' as const
    }
    if (isNapTime(date)) {
      return 'nap' as const
    }
    return 'day' as const
  }

  return {
    plan: data,
    schedule: data?.schedule || {
      bedtime: "20:00",
      wakeTime: "07:00",
      naps: []
    },
    isLoading,
    error,
    isDefault: data?.isDefault ?? true,
    isNightTime,
    isNapTime,
    getTimeContext,
    refetch: mutate
  }
}

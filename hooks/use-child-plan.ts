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

  // Función helper para determinar si es horario nocturno
  const isNightTime = (date: Date = new Date()): boolean => {
    if (!data?.schedule) return false
    
    const currentHour = date.getHours()
    const currentMinutes = date.getMinutes()
    const currentTime = currentHour * 60 + currentMinutes
    
    const [bedtimeHour, bedtimeMin] = data.schedule.bedtime.split(':').map(Number)
    const [wakeHour, wakeMin] = data.schedule.wakeTime.split(':').map(Number)
    
    const bedtime = bedtimeHour * 60 + bedtimeMin
    const wakeTime = wakeHour * 60 + wakeMin
    
    // Si bedtime es después de medianoche (ej: 01:00)
    if (bedtime < wakeTime) {
      return currentTime >= bedtime && currentTime < wakeTime
    }
    
    // Si bedtime es antes de medianoche (ej: 20:00)
    return currentTime >= bedtime || currentTime < wakeTime
  }

  // Función helper para determinar si es hora de siesta
  const isNapTime = (date: Date = new Date()): boolean => {
    if (!data?.schedule.naps || data.schedule.naps.length === 0) return false
    
    const currentHour = date.getHours()
    const currentMinutes = date.getMinutes()
    const currentTime = currentHour * 60 + currentMinutes
    
    return data.schedule.naps.some(nap => {
      const [napHour, napMin] = nap.time.split(':').map(Number)
      const napStart = napHour * 60 + napMin
      const napEnd = napStart + nap.duration
      
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
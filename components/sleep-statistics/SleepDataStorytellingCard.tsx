"use client"

import React, { useState, useMemo } from 'react'
import { AlertTriangle, Eye, EyeOff, Moon, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { useSleepData } from '@/hooks/use-sleep-data'
import { format, parseISO, differenceInMinutes, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface SleepDayData {
  date: string
  totalHours: number
  nightSleepHours: number
  napHours: number
  bedtime: string
  sleepTime: string
  wakeTime: string
  sleepDelay: number
  wakeups: number
  quality: 'insufficient' | 'low' | 'optimal'
  consistency: 'consistent' | 'variable'
}

interface SleepDataStorytellingCardProps {
  childId: string
  dateRange: string
  className?: string
}

const getQualityColor = (quality: string): string => {
  switch (quality) {
    case 'insufficient':
      return 'bg-red-500'
    case 'low':
      return 'bg-yellow-500'
    case 'optimal':
      return 'bg-green-500'
    default:
      return 'bg-gray-400'
  }
}

const getQualityLabel = (quality: string): string => {
  switch (quality) {
    case 'insufficient':
      return 'Insuficiente (<9h)'
    case 'low':
      return 'Bajo (9-10h)'
    case 'optimal':
      return 'Óptimo (10-12h)'
    default:
      return 'Desconocido'
  }
}

export default function SleepDataStorytellingCard({ 
  childId, 
  dateRange, 
  className = "" 
}: SleepDataStorytellingCardProps) {
  const { data: sleepData, loading, error } = useSleepData(childId, dateRange)
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<SleepDayData | null>(null)

  // Procesar datos del hook para crear el array de días
  const processedData = useMemo(() => {
    if (!sleepData || !sleepData.events) return []
    
    // Agrupar eventos por día
    const dayMap = new Map<string, any[]>()
    
    sleepData.events.forEach(event => {
      if (!event.startTime) return
      const dayKey = startOfDay(parseISO(event.startTime)).toISOString()
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, [])
      }
      dayMap.get(dayKey)!.push(event)
    })
    
    // Convertir a array de días con métricas
    const days: SleepDayData[] = []
    
    dayMap.forEach((events, dayKey) => {
      const date = parseISO(dayKey)
      
      // Calcular métricas para este día
      const nightSleepEvents = events.filter(e => 
        ['sleep', 'bedtime'].includes(e.eventType) && 
        new Date(e.startTime).getHours() >= 18 || new Date(e.startTime).getHours() <= 6
      )
      
      const napEvents = events.filter(e => e.eventType === 'nap')
      const wakeEvents = events.filter(e => e.eventType === 'wake')
      const nightWakingEvents = events.filter(e => e.eventType === 'night_waking')
      
      // Calcular duración del sueño nocturno
      let nightSleepHours = 0
      if (nightSleepEvents.length > 0 && wakeEvents.length > 0) {
        const sleepEvent = nightSleepEvents[0]
        const wakeEvent = wakeEvents.find(w => new Date(w.startTime) > new Date(sleepEvent.startTime))
        if (wakeEvent) {
          const sleepTime = parseISO(sleepEvent.startTime)
          const actualSleepTime = new Date(sleepTime.getTime() + (sleepEvent.sleepDelay || 0) * 60 * 1000)
          const duration = differenceInMinutes(parseISO(wakeEvent.startTime), actualSleepTime)
          nightSleepHours = duration / 60
        }
      }
      
      // Calcular duración de siestas
      let napHours = 0
      napEvents.forEach(nap => {
        if (nap.endTime) {
          napHours += differenceInMinutes(parseISO(nap.endTime), parseISO(nap.startTime)) / 60
        }
      })
      
      const totalHours = nightSleepHours + napHours
      
      // Determinar calidad del sueño (ajustado para niños)
      const quality = totalHours < 9 ? 'insufficient' : 
                     totalHours < 10 ? 'low' : 
                     'optimal'
      
      // Obtener horarios
      const bedtimeEvent = nightSleepEvents[0]
      const bedtime = bedtimeEvent ? format(parseISO(bedtimeEvent.startTime), 'HH:mm') : '--:--'
      const sleepDelay = bedtimeEvent?.sleepDelay || 0
      const sleepTime = bedtimeEvent ? 
        format(new Date(parseISO(bedtimeEvent.startTime).getTime() + sleepDelay * 60 * 1000), 'HH:mm') : 
        '--:--'
      const wakeTime = wakeEvents[0] ? format(parseISO(wakeEvents[0].startTime), 'HH:mm') : '--:--'
      
      days.push({
        date: dayKey,
        totalHours,
        nightSleepHours,
        napHours,
        bedtime,
        sleepTime,
        wakeTime,
        sleepDelay,
        wakeups: nightWakingEvents.length,
        quality,
        consistency: 'consistent' // Simplificado por ahora
      })
    })
    
    // Ordenar por fecha
    return days.sort((a, b) => a.date.localeCompare(b.date))
  }, [sleepData])

  const { filteredData, anomalies, stats } = useMemo(() => {
    const anomalies = processedData.filter(day => 
      day.quality === 'insufficient' || 
      day.quality === 'low' ||
      day.wakeups > 2
    )
    const filteredData = showAnomaliesOnly ? anomalies : processedData
    
    const stats = {
      totalDays: processedData.length,
      anomalies: anomalies.length,
      averageHours: processedData.length > 0 
        ? processedData.reduce((sum, day) => sum + day.totalHours, 0) / processedData.length 
        : 0,
      insufficientDays: processedData.filter(day => day.quality === 'insufficient').length,
      lowDays: processedData.filter(day => day.quality === 'low').length,
      optimalDays: processedData.filter(day => day.quality === 'optimal').length,
      averageWakeups: processedData.length > 0
        ? processedData.reduce((sum, day) => sum + day.wakeups, 0) / processedData.length
        : 0
    }
    
    return { filteredData, anomalies, stats }
  }, [processedData, showAnomaliesOnly])

  // Ajustar visualización según el rango de fechas
  const getBarWidth = () => {
    if (dateRange === '7-days') return 'w-12'
    if (dateRange === '30-days') return 'w-3'
    return 'w-1' // 90 días
  }

  const showDayLabels = dateRange === '7-days'
  const maxHours = 14 // Máximo para niños

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Cargando análisis de sueño...</p>
        </div>
      </div>
    )
  }

  if (error || processedData.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No hay datos suficientes para el análisis</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#2F2F2F]">Análisis Detallado del Sueño</h3>
          <p className="text-sm text-gray-600">
            Últimos {processedData.length} días • {anomalies.length} anomalías detectadas
          </p>
        </div>
        
        <button
          onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            showAnomaliesOnly 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showAnomaliesOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showAnomaliesOnly ? 'Mostrar Todo' : 'Solo Anomalías'}
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600">Insuficiente (&lt;9h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">Bajo (9-10h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Óptimo (10-12h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded"></div>
          <span className="text-gray-600">Rango Recomendado</span>
        </div>
      </div>

      {/* Gráfico */}
      <div className="relative">
        <div className="flex items-end gap-0.5 h-64 relative overflow-x-auto">
          {/* Rango recomendado overlay */}
          <div 
            className="absolute left-0 right-0 bg-blue-100 opacity-30 border-t border-b border-blue-300"
            style={{
              bottom: `${(10 / maxHours) * 100}%`,
              height: `${((12 - 10) / maxHours) * 100}%`
            }}
          />
          
          {filteredData.map((day, index) => (
            <div
              key={day.date}
              className={`relative ${getBarWidth()} group cursor-pointer flex-shrink-0 transition-all duration-500`}
              style={{ 
                height: `${(day.totalHours / maxHours) * 100}%`,
                transitionDelay: `${index * 20}ms`
              }}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div 
                className={`w-full h-full ${getQualityColor(day.quality)} rounded-t-sm transition-all duration-200 group-hover:opacity-80`}
              />
              
              {/* Indicadores de anomalías */}
              {(day.quality === 'insufficient' || day.quality === 'low' || day.wakeups > 2) && (
                <AlertTriangle className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-3 h-3 text-red-500" />
              )}
              
              {/* Tooltip */}
              {hoveredDay?.date === day.date && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-md p-3 shadow-lg z-10 min-w-48 transition-opacity duration-200"
                  style={{ opacity: hoveredDay?.date === day.date ? 1 : 0 }}
                >
                  <div className="text-xs space-y-2">
                    <div className="font-bold text-[#2F2F2F] text-sm">
                      {format(parseISO(day.date), "d 'de' MMMM", { locale: es })}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sueño total:</span>
                        <span className="font-medium">{day.totalHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Acostarse:</span>
                        <span className="font-medium">{day.bedtime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dormirse:</span>
                        <span className="font-medium">{day.sleepTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tardó:</span>
                        <span className="font-medium">{day.sleepDelay} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Despertares:</span>
                        <span className={`font-medium ${day.wakeups > 2 ? 'text-red-600' : ''}`}>
                          {day.wakeups}
                        </span>
                      </div>
                    </div>
                    <div className={`text-xs pt-1 border-t ${
                      day.quality === 'insufficient' ? 'text-red-600' :
                      day.quality === 'low' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {getQualityLabel(day.quality)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Etiquetas del eje Y */}
        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500 -ml-8">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>{Math.round((maxHours * (5 - i)) / 5)}h</span>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#2F2F2F]">{stats.averageHours.toFixed(1)}h</div>
          <div className="text-sm text-gray-600">Promedio</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.optimalDays}</div>
          <div className="text-sm text-gray-600">Días Óptimos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.lowDays}</div>
          <div className="text-sm text-gray-600">Días Bajos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.insufficientDays}</div>
          <div className="text-sm text-gray-600">Insuficientes</div>
        </div>
      </div>

      {/* Información adicional de patrones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-[#8B7ADD]" />
            <h4 className="font-medium text-[#2F2F2F]">Consistencia de Horarios</h4>
          </div>
          <p className="text-sm text-gray-600">
            Hora promedio de acostarse: <span className="font-medium">{sleepData?.avgBedtime || '--:--'}</span>
          </p>
          <p className="text-sm text-gray-600">
            Hora promedio de dormir: <span className="font-medium">{sleepData?.avgSleepTime || '--:--'}</span>
          </p>
          <p className="text-sm text-gray-600">
            Tiempo promedio para dormirse: <span className="font-medium">{sleepData?.bedtimeToSleepDifference || '--'}</span>
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[#628BE6]" />
            <h4 className="font-medium text-[#2F2F2F]">Calidad del Sueño</h4>
          </div>
          <p className="text-sm text-gray-600">
            Promedio de despertares: <span className="font-medium">{stats.averageWakeups.toFixed(1)} por noche</span>
          </p>
          <p className="text-sm text-gray-600">
            Sueño nocturno: <span className="font-medium">{sleepData?.avgSleepDuration.toFixed(1) || '0'}h</span>
          </p>
          <p className="text-sm text-gray-600">
            Siestas: <span className="font-medium">{sleepData?.avgNapDuration.toFixed(1) || '0'}h</span>
          </p>
        </div>
      </div>

      {/* Alerta de patrones problemáticos */}
      {anomalies.length > processedData.length * 0.3 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 transition-all duration-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Alerta de Patrón de Sueño</h4>
              <p className="text-sm text-red-700 mt-1">
                Se detectaron {anomalies.length} días con sueño subóptimo en los últimos {processedData.length} días. 
                Considera establecer una rutina de sueño más consistente y consultar con el pediatra si el patrón persiste.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
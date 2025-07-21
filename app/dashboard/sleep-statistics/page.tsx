'use client'

import { useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SleepMetricsGrid from '@/components/child-profile/SleepMetricsGrid'

export default function SleepStatisticsPage() {
  const [selectedChild, setSelectedChild] = useState('lucas-garcia')
  const [dateRange, setDateRange] = useState('7-days')
  const [eventType, setEventType] = useState('all')

  return (
    <div className="min-h-screen bg-[#F5F9FF] p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header con título y botones de acción */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#2F2F2F]">
            Estadísticas de Sueño
          </h1>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </Button>
          </div>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Selector de Niño */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niño
              </label>
              <div className="relative">
                <select 
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full h-12 px-3 pr-10 bg-white border border-gray-300 rounded-xl text-gray-900 focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20 outline-none transition-colors"
                >
                  <option value="lucas-garcia">Lucas García (4 años)</option>
                  <option value="maria-lopez">María López (6 años)</option>
                  <option value="juan-martinez">Juan Martínez (3 años)</option>
                </select>
                <div className="absolute right-3 top-4 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Selector de Rango de Fechas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rango de fechas
              </label>
              <div className="relative">
                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full h-12 px-3 pr-10 bg-white border border-gray-300 rounded-xl text-gray-900 focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20 outline-none transition-colors"
                >
                  <option value="7-days">Últimos 7 días</option>
                  <option value="30-days">Últimos 30 días</option>
                  <option value="90-days">Últimos 3 meses</option>
                </select>
                <div className="absolute right-3 top-4 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Selector de Tipo de Evento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de evento
              </label>
              <div className="relative">
                <select 
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-12 px-3 pr-10 bg-white border border-gray-300 rounded-xl text-gray-900 focus:border-[#4A90E2] focus:ring-2 focus:ring-[#4A90E2] focus:ring-opacity-20 outline-none transition-colors"
                >
                  <option value="all">Todos los eventos</option>
                  <option value="sleep">Solo sueño nocturno</option>
                  <option value="nap">Solo siestas</option>
                  <option value="wake">Solo despertares</option>
                </select>
                <div className="absolute right-3 top-4 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Botón Aplicar Filtros */}
            <div className="flex items-end">
              <Button 
                className="w-full bg-gradient-to-r from-[#628BE6] to-[#67C5FF] text-white hover:from-[#5478D2] hover:to-[#5AB1E6] shadow-sm h-11 font-medium"
                onClick={() => {
                  // TODO: Aplicar filtros y actualizar datos
                  console.log('Filtros aplicados:', { selectedChild, dateRange, eventType })
                }}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Métricas Principales - Reutilizando el componente existente */}
        <SleepMetricsGrid childId={selectedChild} />

        {/* Placeholder para Gráficos Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duración del sueño */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2F2F2F]">
                Duración del sueño (últimos 7 días)
              </h3>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Gráfico de duración de sueño próximamente...</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Promedio nocturno: 8.3 horas</p>
              <p>Promedio siestas: 1.2 horas</p>
            </div>
          </div>

          {/* Consistencia de horarios */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2F2F2F]">
                Consistencia de horarios
              </h3>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Gráfico de consistencia próximamente...</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Hora promedio de acostarse: 20:30 ±15min</p>
              <p>Hora promedio de levantarse: 07:15 ±10min</p>
            </div>
          </div>
        </div>

        {/* Segunda fila de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Despertares nocturnos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2F2F2F]">
                Despertares nocturnos
              </h3>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Gráfico de despertares próximamente...</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Total de despertares: 9 veces</p>
              <p>Promedio: 1.2 por noche</p>
            </div>
          </div>

          {/* Distribución del sueño */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#2F2F2F]">
                Distribución del sueño
              </h3>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Gráfico circular próximamente...</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Total horas de sueño: 9.5 horas/día</p>
              <p>Recomendado para su edad: 10-13 horas/día</p>
            </div>
          </div>
        </div>

        {/* Placeholder para Análisis y Recomendaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#2F2F2F]">
              Análisis y recomendaciones
            </h2>
            <Button variant="outline" className="text-[#4A90E2] border-[#4A90E2] hover:bg-[#4A90E2] hover:text-white">
              Ver todas
            </Button>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <p>Cards de análisis próximamente...</p>
          </div>
        </div>

        {/* Placeholder para Tabla Comparativa */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
              Comparativa con períodos anteriores
            </h2>
            <div className="flex space-x-2">
              <Button size="sm" className="bg-[#F0F7FF] text-[#4A90E2] hover:bg-[#4A90E2] hover:text-white">
                Esta semana
              </Button>
              <Button size="sm" variant="outline" className="text-gray-600">
                Mes anterior
              </Button>
              <Button size="sm" variant="outline" className="text-gray-600">
                3 meses
              </Button>
            </div>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <p>Tabla comparativa próximamente...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

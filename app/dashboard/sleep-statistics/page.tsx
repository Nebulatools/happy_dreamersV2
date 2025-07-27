"use client"

import { useState } from "react"
import { Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import SleepMetricsGrid from "@/components/child-profile/SleepMetricsGrid"
import SleepDurationChart from "@/components/sleep-statistics/SleepDurationChart"
import SleepConsistencyChart from "@/components/sleep-statistics/SleepConsistencyChart"
import NightWakeupsChart from "@/components/sleep-statistics/NightWakeupsChart"
import SleepDistributionChart from "@/components/sleep-statistics/SleepDistributionChart"
import SleepComparison from "@/components/sleep-statistics/SleepComparison"
import { useActiveChild } from "@/context/active-child-context"
import { useToast } from "@/hooks/use-toast"

import { createLogger } from "@/lib/logger"

const logger = createLogger("SleepStatistics")

export default function SleepStatisticsPage() {
  const { activeChildId } = useActiveChild()
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState("7-days")
  const [eventType, setEventType] = useState("sleep")

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

        {/* Panel de Filtros Simplificado */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <option value="sleep">Solo sueño nocturno</option>
                  <option value="nap">Solo siestas</option>
                  <option value="wake">Solo despertares</option>
                  <option value="all">Todos los eventos</option>
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
                  toast({
                    title: "Filtros aplicados",
                    description: `Mostrando datos de los ${dateRange === '7-days' ? 'últimos 7 días' : dateRange === '30-days' ? 'últimos 30 días' : 'últimos 3 meses'}`,
                  })
                }}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Métricas Principales */}
        {activeChildId ? (
          <SleepMetricsGrid childId={activeChildId} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500">Por favor selecciona un niño desde el menú superior para ver las estadísticas</p>
          </div>
        )}

        {/* Gráficos Principales con datos reales */}
        {activeChildId ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Duración del sueño */}
              <SleepDurationChart childId={activeChildId} />

              {/* Consistencia de horarios */}
              <SleepConsistencyChart childId={activeChildId} />
            </div>

            {/* Segunda fila de gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Despertares nocturnos */}
              <NightWakeupsChart childId={activeChildId} />

              {/* Distribución del sueño */}
              <SleepDistributionChart childId={activeChildId} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500">Selecciona un niño para ver los gráficos detallados</p>
          </div>
        )}

        {/* Placeholder para Análisis y Recomendaciones */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#2F2F2F]">
              Análisis y recomendaciones
            </h2>
            <Button variant="outline" className="border-[#628BE6] text-[#628BE6] hover:hd-gradient-button hover:text-white hover:border-transparent">
              Ver todas
            </Button>
          </div>
          
          <div className="text-center py-8 text-gray-500">
            <p>Cards de análisis próximamente...</p>
          </div>
        </div>

        {/* Tabla Comparativa con datos reales */}
        {activeChildId ? (
          <SleepComparison childId={activeChildId} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <h2 className="text-xl font-bold text-[#2F2F2F] mb-4">
              Comparativa con períodos anteriores
            </h2>
            <p className="text-gray-500">Selecciona un niño para ver la comparativa</p>
          </div>
        )}
      </div>
    </div>
  )
}

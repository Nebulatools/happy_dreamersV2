import React from "react"
import { useSleepData } from "@/hooks/use-sleep-data"
import { aggregateDailySleep } from "@/lib/sleep-calculations"
import { Clock, Moon, Sun, Activity, Info } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from "recharts"

interface SleepDistributionChartProps {
  childId: string
  dateRange?: string
}

export default function SleepDistributionChart({ childId, dateRange = "7-days" }: SleepDistributionChartProps) {
  const { data, loading, error } = useSleepData(childId, dateRange)

  // Calcular porcentajes coherentes con promedios diarios agregados
  // Importante: los hooks (useMemo) deben ejecutarse en cada render, no después de returns condicionales
  const agg = React.useMemo(() => {
    const events = data?.events ? (data.events as any[]) : []
    return aggregateDailySleep(events, dateRange, { denominator: "dataDays" })
  }, [data, dateRange])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Distribución del sueño
          </h3>
          <Clock className="w-5 h-5 text-[#4ECDC4]" />
        </div>
        <div className="h-96 flex items-center justify-center text-gray-500">
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2F2F2F]">
            Distribución del sueño
          </h3>
          <Clock className="w-5 h-5 text-[#4ECDC4]" />
        </div>
        <div className="h-96 flex items-center justify-center text-red-500">
          <p>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  const nightPercentage = agg.nightPercentage
  const napPercentage = agg.napPercentage

  // Función para obtener color según duración del período
  const getWindowColor = (minutes: number) => {
    if (minutes < 120) return "#60A5FA" // Azul claro < 2h
    if (minutes < 180) return "#86EFAC" // Verde suave 2-3h
    if (minutes < 240) return "#FDE047" // Amarillo suave 3-4h
    if (minutes < 300) return "#FDBA74" // Naranja suave 4-5h
    return "#FCA5A5" // Rojo suave > 5h
  }

  const getWindowColorClass = (minutes: number) => {
    if (minutes < 120) return "bg-blue-100 text-blue-700"
    if (minutes < 180) return "bg-green-100 text-green-700"
    if (minutes < 240) return "bg-yellow-100 text-yellow-700"
    if (minutes < 300) return "bg-orange-100 text-orange-700"
    return "bg-red-100 text-red-700"
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#2F2F2F]">
          Distribución del sueño
        </h3>
        <Clock className="w-5 h-5 text-[#4ECDC4]" />
      </div>

      {/* Sección 1: Timeline Visual del Día */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Timeline del día
          {data.awakePeriods.length > 0 && data.awakePeriods[0].durationFormatted.includes("promedio") && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              (Mostrando promedios de {dateRange.replace("-", " ")})
            </span>
          )}
        </h4>
        <div className="relative h-20 bg-gray-50 rounded-lg p-2">
          {/* Marcadores de hora */}
          <div className="absolute inset-x-0 top-0 flex justify-between px-2 text-xs text-gray-400">
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
            <span>6am</span>
          </div>
          
          {/* Barra de timeline */}
          <div className="relative mt-6 h-8 bg-gray-200 rounded-full overflow-hidden">
            {/* Bloques de períodos despierto del día */}
            {data.awakePeriods.map((period, index) => {
              let startPercent: number
              let durationPercent: number
              
              // Si es promedio, usar horarios típicos para cada período
              if (period.durationFormatted.includes("promedio")) {
                // Definir horarios típicos para cada período del día
                const typicalStartHours: Record<string, number> = {
                  "mañana": 7,    // 7:00 AM
                  "mediodía": 11, // 11:00 AM  
                  "tarde": 15,    // 3:00 PM
                  "noche": 19,     // 7:00 PM
                }
                
                const startHour = typicalStartHours[period.period] || 7
                startPercent = (startHour / 24) * 100
                durationPercent = (period.duration / (24 * 60)) * 100
              } else {
                // Usar horarios reales si no es promedio
                const startHour = parseISO(period.startTime).getHours()
                const startMinutes = parseISO(period.startTime).getMinutes()
                startPercent = ((startHour + startMinutes/60) / 24) * 100
                durationPercent = (period.duration / (24 * 60)) * 100
              }
              
              return (
                <div
                  key={index}
                  className="absolute h-full"
                  style={{
                    left: `${startPercent}%`,
                    width: `${durationPercent}%`,
                    backgroundColor: getWindowColor(period.duration),
                    opacity: period.durationFormatted.includes("promedio") ? 0.5 : 0.7,
                  }}
                  title={`${period.period}: ${period.durationFormatted}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Sección 2: Distribución Nocturno vs Siestas (solo estadísticas, sin rueda) */}
      <div className="mb-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Moon className="w-4 h-4 mr-2 text-[#1E40AF]" />
              <span className="text-sm">Sueño nocturno:</span>
            </div>
            <span className="text-sm font-semibold text-[#1E40AF]">
              {agg.avgNightHoursPerDay.toFixed(1)}h ({nightPercentage.toFixed(0)}%)
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sun className="w-4 h-4 mr-2 text-[#FBBF24]" />
              <span className="text-sm">Siestas:</span>
            </div>
            <span className="text-sm font-semibold text-[#FBBF24]">
              {agg.avgNapHoursPerDay.toFixed(1)}h ({napPercentage.toFixed(0)}%)
            </span>
          </div>
          {/* Nota: la métrica de total diario se muestra arriba, se omite aquí */}
        </div>
      </div>

      {/* Sección 3: Tiempo despierto */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          Tiempo despierto entre sueños
        </h4>
        {data.awakePeriods.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            {(() => {
              const total = data.awakePeriods.length
              const inRange = data.awakePeriods.filter(p => p.duration >= 120 && p.duration <= 240).length
              const pct = Math.round((inRange / total) * 100)
              const statusColor = pct >= 70 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-700"
              return (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>
                    Ventanas 2–4 h:
                    <span className={`font-semibold ml-1 ${statusColor}`}>{pct}%</span>
                    <span className="text-xs text-gray-500 ml-2">({inRange}/{total})</span>
                  </span>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Las “ventanas de vigilia” (tiempo despierto entre ciclos de sueño)
                        suelen estar en 2–4 horas como rango general. Mantenerse dentro
                        de ese rango ayuda a evitar sobrecansancio y facilita conciliar
                        y sostener el sueño. Este indicador muestra qué porcentaje de
                        períodos despierto caen en 2–4 h en el período seleccionado.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )
            })()}
          </div>
        )}
        
        {data.awakePeriods.length > 0 ? (
          <div className="space-y-2">
            {data.awakePeriods.map((period, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${getWindowColorClass(period.duration)}`}>
                    {period.period}
                  </div>
                  {!period.durationFormatted.includes("promedio") ? (
                    <div className="text-sm text-gray-600">
                      {format(parseISO(period.startTime), "HH:mm", { locale: es })} - 
                      {format(parseISO(period.endTime), "HH:mm", { locale: es })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Promedio del período
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Barra visual de duración */}
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.min((period.duration / 300) * 100, 100)}%`,
                        backgroundColor: getWindowColor(period.duration),
                      }}
                    />
                  </div>
                  <span className={`text-xs ${period.duration >= 120 && period.duration <= 240 ? "text-green-700" : "text-gray-500"}`}>
                    {period.duration >= 120 && period.duration <= 240 ? "Dentro 2–4h" : "Fuera 2–4h"}
                  </span>
                  
                  <span className="text-sm font-semibold text-gray-700 min-w-[60px] text-right">
                    {period.durationFormatted}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No hay registros de tiempo despierto para hoy</p>
            <p className="text-xs mt-1">Registra cuando duerme y despierta para ver esta información</p>
          </div>
        )}

        {/* Histograma compacto de ventanas (duración en minutos) */}
        {data.awakePeriods.length > 0 && (() => {
          const durations = data.awakePeriods.map(p => p.duration)
          const bins = [0, 60, 120, 180, 240, 300, Infinity]
          const labels = ["<1h", "1–2h", "2–3h", "3–4h", "4–5h", ">5h"]
          const counts = new Array(labels.length).fill(0)
          durations.forEach(m => {
            const idx = bins.findIndex((edge, i) => m > edge && m <= bins[i+1])
            if (idx >= 0) counts[idx]++
          })
          const histData = labels.map((lab, i) => ({ range: lab, count: counts[i] }))
          const total = durations.length || 1
          return (
            <div className="mt-4">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Histograma de ventanas ({dateRange.replace("-days"," días")})</h5>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={22} />
                    <ReTooltip formatter={(value: any, name: any, props: any) => [`${value} (${Math.round((value/total)*100)}%)`, "ventanas"]} />
                    <Bar dataKey="count" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })()}

        {/* Leyenda de colores */}
        {data.awakePeriods.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            {data.awakePeriods[0].durationFormatted.includes("promedio") && (
              <p className="text-xs text-blue-600 mb-2">
                ℹ️ Mostrando promedios basados en los últimos {dateRange.replace("-days", " días")}
              </p>
            )}
            <p className="text-xs text-gray-500 mb-2">Escala de duración:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-300 mr-1"></span> &lt; 2h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-300 mr-1"></span> 2-3h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-300 mr-1"></span> 3-4h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-orange-300 mr-1"></span> 4-5h
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-300 mr-1"></span> &gt; 5h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

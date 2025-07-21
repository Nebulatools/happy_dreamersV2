import React from 'react'
import { Clock, Moon, AlertCircle, Heart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SleepMetric {
  title: string
  value: string
  icon: React.ReactNode
  status: {
    label: string
    variant: 'good' | 'consistent' | 'average' | 'poor'
  }
  change: string
  iconBg: string
}

interface SleepMetricsGridProps {
  childId: string
}

export default function SleepMetricsGrid({ childId }: SleepMetricsGridProps) {
  // TODO: Obtener datos reales del API
  const sleepMetrics: SleepMetric[] = [
    {
      title: 'Tiempo total de sueño (promedio)',
      value: '9.5h',
      icon: <Clock className="w-3 h-3" />,
      status: {
        label: 'Bueno',
        variant: 'good'
      },
      change: '+0.5h vs. semana anterior',
      iconBg: 'bg-[#B7F1C0]'
    },
    {
      title: 'Hora de acostarse (promedio)',
      value: '20:30',
      icon: <Moon className="w-5 h-4" />,
      status: {
        label: 'Consistente',
        variant: 'consistent'
      },
      change: '±15 min de variación',
      iconBg: 'bg-[#D4C1FF]'
    },
    {
      title: 'Despertares nocturnos (promedio)',
      value: '1.2',
      icon: <AlertCircle className="w-4 h-4" />,
      status: {
        label: 'Promedio',
        variant: 'average'
      },
      change: '-0.3 vs. semana anterior',
      iconBg: 'bg-[#FFE442]'
    },
    {
      title: 'Calidad del sueño',
      value: '40%',
      icon: <Heart className="w-4 h-4" />,
      status: {
        label: 'Mala',
        variant: 'poor'
      },
      change: '-20 % vs. semana anterior',
      iconBg: 'bg-[#FFC4C4]'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {sleepMetrics.map((metric, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          {/* Contenido principal */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              {/* Información de la métrica */}
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2 leading-tight">
                  {metric.title}
                </p>
                <p className="text-4xl font-extrabold text-[#2F2F2F] leading-none">
                  {metric.value}
                </p>
              </div>

              {/* Ícono de la métrica */}
              <div className={`w-10 h-10 rounded-xl ${metric.iconBg} flex items-center justify-center ml-4`}>
                <div className="text-gray-700">
                  {metric.icon}
                </div>
              </div>
            </div>

            {/* Estado y cambio */}
            <div className="space-y-2">
              <Badge variant={metric.status.variant} className="text-xs font-medium">
                {metric.status.label}
              </Badge>
              <p className="text-xs text-gray-600">
                {metric.change}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

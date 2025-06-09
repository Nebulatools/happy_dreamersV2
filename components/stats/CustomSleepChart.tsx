"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea
} from "recharts"
import { BarChart as BarChartIcon } from "lucide-react"

interface CustomSleepChartProps {
  data: any[];
  formatTimeTick: (tickItem: number) => string;
}

export function CustomSleepChart({ data, formatTimeTick }: CustomSleepChartProps) {
  
  // Calculate average values to draw deviation bands
  const averages = data.reduce((acc, curr) => {
    if (curr.bedTime) acc.bedTime.push(curr.bedTime)
    if (curr.wakeUpTime) acc.wakeUpTime.push(curr.wakeUpTime)
    if (curr.firstNapStartTime) acc.firstNapStartTime.push(curr.firstNapStartTime)
    return acc
  }, { bedTime: [], wakeUpTime: [], firstNapStartTime: [] })

  const getAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const avgBedTime = getAverage(averages.bedTime)
  const avgWakeUpTime = getAverage(averages.wakeUpTime)
  const avgFirstNapStartTime = getAverage(averages.firstNapStartTime)

  const DEVIATION = 30 // 30 minutes deviation

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BarChartIcon className="text-indigo-600" />
            Patrones de Sueño con Desviaciones
        </CardTitle>
        <CardDescription>Visualización de horas clave de sueño y su consistencia.</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              domain={[0, 1440]} 
              tickFormatter={formatTimeTick} 
              tick={{ fontSize: 12 }}
              label={{ value: 'Hora del día', angle: -90, position: 'insideLeft' }}
              ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
              width={80}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${formatTimeTick(value)}`, name]} 
              labelStyle={{ fontWeight: 'bold' }}
              itemStyle={{ fontWeight: 'normal' }}
            />
            <Legend />

            {/* Deviation Band for Bedtime */}
            <ReferenceArea
              y1={avgBedTime - DEVIATION}
              y2={avgBedTime + DEVIATION}
              strokeOpacity={0.2}
              fill="#8884d8"
              fillOpacity={0.1}
              ifOverflow="visible"
              label={{ value: 'Desv. Acostar', position: 'insideTopLeft', fill: '#8884d8', fontSize: 10 }}
            />

            {/* Deviation Band for Wake Up Time */}
            <ReferenceArea
              y1={avgWakeUpTime - DEVIATION}
              y2={avgWakeUpTime + DEVIATION}
              strokeOpacity={0.2}
              fill="#82ca9d"
              fillOpacity={0.1}
              ifOverflow="visible"
              label={{ value: 'Desv. Despertar', position: 'insideTopLeft', fill: '#82ca9d', fontSize: 10 }}
            />
            
            {/* Deviation Band for First Nap */}
             <ReferenceArea
              y1={avgFirstNapStartTime - DEVIATION}
              y2={avgFirstNapStartTime + DEVIATION}
              strokeOpacity={0.2}
              fill="#ffc658"
              fillOpacity={0.1}
              ifOverflow="visible"
              label={{ value: 'Desv. 1ª Siesta', position: 'insideTopLeft', fill: '#ffc658', fontSize: 10 }}
            />

            <Bar 
              dataKey="bedTime" 
              name="Hora de Acostar" 
              fill="#8884d8" 
            />
            <Bar 
              dataKey="wakeUpTime" 
              name="Hora de Despertar" 
              fill="#82ca9d" 
            />
            <Bar 
              dataKey="firstNapStartTime" 
              name="Inicio 1ª Siesta" 
              fill="#ffc658" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface SleepPatternChartProps {
  bedWakeChartData: any[];
  formatTimeTick: (tickItem: number) => string;
}

export function SleepPatternChart({ bedWakeChartData, formatTimeTick }: SleepPatternChartProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Patrón de Sueño Nocturno</CardTitle>
        <CardDescription>Hora de acostarse y despertarse</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bedWakeChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              domain={[0, 1440]} 
              tickFormatter={formatTimeTick} 
              label={{ value: "Hora del día", angle: -90, position: "insideLeft" }}
              ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]} // Cada 3 horas
            />
            <Tooltip formatter={(value: number) => formatTimeTick(value)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bedTime" 
              name="Hora de Acostarse" 
              stroke="#8884d8" 
              connectNulls 
            />
            <Line 
              type="monotone" 
              dataKey="wakeUpTime" 
              name="Hora de Despertar" 
              stroke="#82ca9d" 
              connectNulls 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 
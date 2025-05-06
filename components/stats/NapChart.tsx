"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface NapChartProps {
  napChartData: any[];
  formatTimeTick: (tickItem: number) => string;
}

export function NapChart({ napChartData, formatTimeTick }: NapChartProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Registro de Siestas</CardTitle>
        <CardDescription>Hora de inicio y duración de las siestas</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid />
            <XAxis 
              type="number" 
              dataKey="startTimeMinutes" 
              name="Hora de Inicio" 
              domain={[0, 1440]} 
              tickFormatter={formatTimeTick}
              ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
            />
            <YAxis type="category" dataKey="date" name="Fecha" reversed={true} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, props) => {
              if (name === "startTimeMinutes") return formatTimeTick(value as number);
              if (name === "duration") return `${value} min`;
              return value;
            }} />
            <Legend />
            <Scatter name="Siestas" data={napChartData} fill="#ffc658" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 
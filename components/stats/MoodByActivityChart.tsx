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
  ResponsiveContainer
} from "recharts"

interface MoodByActivityChartProps {
  moodByActivityData: any[];
}

export function MoodByActivityChart({ moodByActivityData }: MoodByActivityChartProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Estados emocionales por tipo de evento</CardTitle>
        <CardDescription>Análisis de estados emocionales según la actividad</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={moodByActivityData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="feliz" name="Feliz" stackId="a" fill="#FFBB28" />
            <Bar dataKey="tranquilo" name="Tranquilo" stackId="a" fill="#00C49F" />
            <Bar dataKey="cansado" name="Cansado" stackId="a" fill="#0088FE" />
            <Bar dataKey="irritable" name="Irritable" stackId="a" fill="#FF8042" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 
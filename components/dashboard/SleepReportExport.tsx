"use client"

// Componente para exportar reportes de sueño desde el dashboard

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { PDFExportButton } from "@/components/reports/PDFExportButton"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Download, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

interface SleepReportExportProps {
  childId: string
  childName: string
}

export function SleepReportExport({ childId, childName }: SleepReportExportProps) {
  const [reportType, setReportType] = useState<"week" | "month" | "custom">("month")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  })

  const getExportDateRange = () => {
    if (reportType === "week") {
      const now = new Date()
      return {
        from: new Date(now.setDate(now.getDate() - 7)),
        to: new Date()
      }
    } else if (reportType === "month") {
      return {
        year: selectedYear,
        month: selectedMonth
      }
    } else {
      return dateRange ? {
        from: dateRange.from || new Date(),
        to: dateRange.to || new Date()
      } : undefined
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)
  const months = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar Reportes de Sueño
        </CardTitle>
        <CardDescription>
          Genera reportes PDF con los datos de sueño de {childName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de tipo de reporte */}
        <div className="space-y-2">
          <Label>Tipo de reporte</Label>
          <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Mes específico</SelectItem>
              <SelectItem value="custom">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selector de mes si es reporte mensual */}
        {reportType === "month" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select 
                value={selectedMonth.toString()} 
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Año</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Selector de rango personalizado */}
        {reportType === "custom" && (
          <div className="space-y-2">
            <Label>Rango de fechas</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "d MMM, yyyy", { locale: es })} -{" "}
                        {format(dateRange.to, "d MMM, yyyy", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "d MMM, yyyy", { locale: es })
                    )
                  ) : (
                    "Selecciona un rango"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Información del reporte */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-900 font-medium mb-1">
            El reporte incluirá:
          </p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Horas totales de sueño</li>
            <li>• Despertares nocturnos</li>
            <li>• Número y duración de siestas</li>
            <li>• Análisis del patrón de sueño</li>
            <li>• Recomendaciones personalizadas</li>
          </ul>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <PDFExportButton
            childId={childId}
            reportType={reportType === "month" ? "monthly_summary" : "sleep_report"}
            dateRange={getExportDateRange()}
            className="flex-1"
          />
        </div>
      </CardContent>
    </Card>
  )
}
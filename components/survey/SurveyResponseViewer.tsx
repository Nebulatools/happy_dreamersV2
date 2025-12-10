// Componente principal para visualizar todas las secciones de una encuesta
// Usa Accordion para organizar las 6 secciones de forma colapsable

"use client"

import { useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Pencil, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { SurveySection, SECTION_TITLES } from "./SurveySection"
import { SurveyEditModal } from "./SurveyEditModal"
import type { SurveyData } from "@/types/models"

// Lista ordenada de secciones
const SECTIONS = [
  { key: "informacionFamiliar", title: "Informacion Familiar", icon: "users" },
  { key: "dinamicaFamiliar", title: "Dinamica Familiar", icon: "home" },
  { key: "historial", title: "Historial del Nino", icon: "clipboard" },
  { key: "desarrolloSalud", title: "Desarrollo y Salud", icon: "heart" },
  { key: "actividadFisica", title: "Actividad Fisica", icon: "activity" },
  { key: "rutinaHabitos", title: "Rutina y Habitos", icon: "moon" },
] as const

interface SurveyResponseViewerProps {
  surveyData: SurveyData
  childId: string
  childName?: string
  onUpdate?: () => void
  readOnly?: boolean
}

export function SurveyResponseViewer({
  surveyData,
  childId,
  childName,
  onUpdate,
  readOnly = false,
}: SurveyResponseViewerProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [openItems, setOpenItems] = useState<string[]>([])

  // Verificar si una seccion tiene datos
  const hasSectionData = (sectionKey: string): boolean => {
    const sectionData = surveyData?.[sectionKey as keyof SurveyData]
    if (!sectionData) return false
    if (typeof sectionData !== "object") return false
    return Object.keys(sectionData).length > 0
  }

  // Calcular progreso de la encuesta
  const calculateProgress = () => {
    const totalSections = SECTIONS.length
    const completedSections = SECTIONS.filter((s) => hasSectionData(s.key)).length
    return {
      completed: completedSections,
      total: totalSections,
      percentage: Math.round((completedSections / totalSections) * 100),
    }
  }

  const progress = calculateProgress()

  const handleEditClick = (sectionKey: string) => {
    setEditingSection(sectionKey)
  }

  const handleModalClose = () => {
    setEditingSection(null)
  }

  const handleSaveSuccess = () => {
    setEditingSection(null)
    onUpdate?.()
  }

  // Si no hay surveyData
  if (!surveyData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sin datos de encuesta</h3>
          <p className="text-muted-foreground">
            Este nino aun no tiene datos de encuesta registrados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estado de la encuesta */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {surveyData.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <CardTitle className="text-lg">
                  Estado de la Encuesta
                </CardTitle>
                <CardDescription>
                  {childName && `Encuesta de ${childName}`}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={surveyData.completed ? "default" : "secondary"}
              className={surveyData.completed ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
            >
              {surveyData.completed ? "Completada" : "En progreso"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-medium">{progress.completed}/{progress.total} secciones</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
            {surveyData.lastUpdated && (
              <div className="text-sm text-muted-foreground">
                Ultima actualizacion:{" "}
                {new Date(surveyData.lastUpdated).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accordion con las secciones */}
      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={setOpenItems}
        className="space-y-2"
      >
        {SECTIONS.map(({ key, title }) => {
          const sectionData = surveyData[key as keyof SurveyData]
          const hasData = hasSectionData(key)

          return (
            <AccordionItem
              key={key}
              value={key}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-medium">{title}</span>
                  {hasData ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      Con datos
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sin datos
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 pb-2">
                  {/* Boton de editar */}
                  {!readOnly && (
                    <div className="flex justify-end mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(key)}
                        className="gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar Seccion
                      </Button>
                    </div>
                  )}

                  {/* Contenido de la seccion */}
                  <SurveySection
                    sectionKey={key}
                    data={sectionData as Record<string, any>}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Modal de edicion */}
      {!readOnly && (
        <SurveyEditModal
          open={!!editingSection}
          onClose={handleModalClose}
          sectionKey={editingSection}
          sectionData={editingSection ? surveyData[editingSection as keyof SurveyData] : null}
          childId={childId}
          onSave={handleSaveSuccess}
        />
      )}
    </div>
  )
}

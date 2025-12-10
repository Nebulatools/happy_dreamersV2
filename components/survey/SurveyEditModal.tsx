// Modal para editar una seccion especifica de la encuesta
// Reutiliza los componentes de pasos existentes del wizard

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSectionTitle } from "./SurveySection"

// Importar los componentes de pasos existentes
import { FamilyInfoStep } from "./steps/FamilyInfoStep"
import { FamilyDynamicsStep } from "./steps/FamilyDynamicsStep"
import { ChildHistoryStep } from "./steps/ChildHistoryStep"
import { HealthDevStep } from "./steps/HealthDevStep"
import { PhysicalActivityStep } from "./steps/PhysicalActivityStep"
import { RoutineHabitsStep } from "./steps/RoutineHabitsStep"

// Mapeo de secciones a componentes de formulario
const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  informacionFamiliar: FamilyInfoStep,
  dinamicaFamiliar: FamilyDynamicsStep,
  historial: ChildHistoryStep,
  desarrolloSalud: HealthDevStep,
  actividadFisica: PhysicalActivityStep,
  rutinaHabitos: RoutineHabitsStep,
}

interface SurveyEditModalProps {
  open: boolean
  onClose: () => void
  sectionKey: string | null
  sectionData: any
  childId: string
  onSave?: () => void
}

export function SurveyEditModal({
  open,
  onClose,
  sectionKey,
  sectionData,
  childId,
  onSave,
}: SurveyEditModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<any>(sectionData)
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Resetear formData cuando cambia sectionData
  useEffect(() => {
    if (sectionData) {
      setFormData(sectionData)
      setHasChanges(false)
    }
  }, [sectionData, open])

  // Handler para cambios en el formulario
  const handleChange = useCallback((newData: any) => {
    setFormData(newData)
    setHasChanges(true)
  }, [])

  // Guardar cambios
  const handleSave = async () => {
    if (!sectionKey || !childId) return

    setIsLoading(true)

    try {
      const response = await fetch(`/api/children/${childId}/survey`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: sectionKey,
          data: formData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al guardar")
      }

      toast({
        title: "Cambios guardados",
        description: `La seccion "${getSectionTitle(sectionKey)}" se actualizo correctamente`,
      })

      setHasChanges(false)
      onSave?.()
    } catch (error) {
      console.error("Error al guardar seccion:", error)
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Confirmar antes de cerrar si hay cambios
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "Tienes cambios sin guardar. ¿Estas seguro de que quieres cerrar?"
      )
      if (!confirmed) return
    }
    onClose()
  }

  // Si no hay seccion seleccionada, no renderizar
  if (!sectionKey) return null

  const SectionComponent = SECTION_COMPONENTS[sectionKey]

  if (!SectionComponent) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              No se encontro el componente para la seccion "{sectionKey}"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar {getSectionTitle(sectionKey)}
          </DialogTitle>
          <DialogDescription>
            Modifica los campos necesarios y guarda los cambios.
            {hasChanges && (
              <span className="text-amber-600 ml-2">(Cambios sin guardar)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <SectionComponent
            data={formData}
            onChange={handleChange}
            errors={{}}
            context={{ isAdminEdit: true }}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

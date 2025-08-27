"use client"

// Componente para edición profesional de reportes

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Save,
  Edit3,
  Eye,
  Download,
  Share2,
  History,
  FileSignature,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  FileText,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  X
} from "lucide-react"
import { PDFExportButton } from "@/components/reports/PDFExportButton"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ReportData {
  analysis: string
  recommendations: string
  childContext?: {
    name: string
    ageInMonths: number
    totalEvents: number
  }
  metadata?: {
    reportId: string
    createdAt: string
    adminName: string
  }
}

interface ProfessionalReportData {
  _id?: string
  originalData: ReportData
  editedData: {
    analysis: string
    recommendations: string
    professionalNotes?: string
    diagnosis?: string
    treatment?: string
    followUp?: {
      required: boolean
      nextAppointment?: string
      frequency?: string
      notes?: string
    }
    customSections?: Array<{
      title: string
      content: string
      order: number
    }>
  }
  status: "draft" | "review" | "approved" | "shared"
  version: number
  editHistory?: Array<{
    field: string
    editedAt: string
    editedBy: string
    reason?: string
  }>
  privacy?: {
    parentCanView: boolean
    parentCanDownload: boolean
    requiresApproval: boolean
  }
}

interface ProfessionalReportEditorProps {
  reportData: ReportData
  professionalReport?: ProfessionalReportData
  onSave?: (data: ProfessionalReportData) => Promise<void>
  onApprove?: (reportId: string) => Promise<void>
  onSign?: (reportId: string, signatureData: any) => Promise<void>
  isProfessional?: boolean
  childName?: string
  childId?: string
}

export function ProfessionalReportEditor({
  reportData,
  professionalReport,
  onSave,
  onApprove,
  onSign,
  isProfessional = false,
  childName,
  childId
}: ProfessionalReportEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeTab, setActiveTab] = useState("analysis")
  
  // Estado del reporte editado
  const [editedReport, setEditedReport] = useState<ProfessionalReportData>({
    originalData: reportData,
    editedData: {
      analysis: professionalReport?.editedData?.analysis || reportData.analysis,
      recommendations: professionalReport?.editedData?.recommendations || reportData.recommendations,
      professionalNotes: professionalReport?.editedData?.professionalNotes || "",
      diagnosis: professionalReport?.editedData?.diagnosis || "",
      treatment: professionalReport?.editedData?.treatment || "",
      followUp: professionalReport?.editedData?.followUp || {
        required: false,
        frequency: "monthly",
        notes: ""
      },
      customSections: professionalReport?.editedData?.customSections || []
    },
    status: professionalReport?.status || "draft",
    version: professionalReport?.version || 1,
    privacy: professionalReport?.privacy || {
      parentCanView: true,
      parentCanDownload: false,
      requiresApproval: true
    }
  })

  // Estado para tracking de cambios
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set())
  const [editReason, setEditReason] = useState("")

  // Detectar cambios
  const handleFieldChange = (field: string, value: any) => {
    setEditedReport(prev => ({
      ...prev,
      editedData: {
        ...prev.editedData,
        [field]: value
      }
    }))
    
    // Marcar campo como cambiado
    setChangedFields(prev => new Set(prev.add(field)))
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!onSave) return
    
    setIsSaving(true)
    try {
      await onSave(editedReport)
      toast.success("Reporte guardado exitosamente", {
        description: `Versión ${editedReport.version + 1} creada`
      })
      
      // Incrementar versión y limpiar cambios
      setEditedReport(prev => ({
        ...prev,
        version: prev.version + 1
      }))
      setChangedFields(new Set())
      setIsEditing(false)
      setEditReason("")
    } catch (error) {
      toast.error("Error al guardar el reporte")
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  // Aprobar reporte
  const handleApprove = async () => {
    if (!onApprove || !editedReport._id) return
    
    try {
      await onApprove(editedReport._id)
      setEditedReport(prev => ({
        ...prev,
        status: "approved"
      }))
      toast.success("Reporte aprobado", {
        description: "El reporte está listo para compartir con los padres"
      })
    } catch (error) {
      toast.error("Error al aprobar el reporte")
    }
  }

  // Agregar sección personalizada
  const addCustomSection = () => {
    const newSection = {
      title: "",
      content: "",
      order: (editedReport.editedData.customSections?.length || 0) + 1
    }
    
    setEditedReport(prev => ({
      ...prev,
      editedData: {
        ...prev.editedData,
        customSections: [...(prev.editedData.customSections || []), newSection]
      }
    }))
    
    setChangedFields(prev => new Set(prev.add("customSections")))
  }

  // Eliminar sección personalizada
  const removeCustomSection = (index: number) => {
    setEditedReport(prev => ({
      ...prev,
      editedData: {
        ...prev.editedData,
        customSections: prev.editedData.customSections?.filter((_, i) => i !== index)
      }
    }))
    
    setChangedFields(prev => new Set(prev.add("customSections")))
  }

  // Comparación lado a lado
  const ComparisonView = ({ field, original, edited }: any) => {
    const hasChanges = original !== edited
    
    return (
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`p-3 rounded-lg border ${hasChanges ? 'border-gray-200' : 'border-transparent'}`}>
          <Label className="text-xs text-muted-foreground mb-1">Original</Label>
          <ScrollArea className="h-32">
            <p className="text-sm whitespace-pre-wrap">{original}</p>
          </ScrollArea>
        </div>
        <div className={`p-3 rounded-lg border ${hasChanges ? 'border-green-200 bg-green-50' : 'border-transparent'}`}>
          <Label className="text-xs text-muted-foreground mb-1">
            Editado {hasChanges && <Badge variant="outline" className="ml-2 text-xs">Modificado</Badge>}
          </Label>
          <ScrollArea className="h-32">
            <p className="text-sm whitespace-pre-wrap">{edited}</p>
          </ScrollArea>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Editor de Reporte Profesional
              </CardTitle>
              <CardDescription>
                {childName && `Paciente: ${childName} • `}
                Versión {editedReport.version} • Estado: {" "}
                <Badge variant={
                  editedReport.status === "approved" ? "default" :
                  editedReport.status === "review" ? "secondary" :
                  editedReport.status === "shared" ? "outline" : "destructive"
                }>
                  {editedReport.status === "draft" ? "Borrador" :
                   editedReport.status === "review" ? "En Revisión" :
                   editedReport.status === "approved" ? "Aprobado" : "Compartido"}
                </Badge>
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Historial
                  </Button>
                  {professionalReport?._id && (
                    <PDFExportButton
                      reportId={professionalReport._id}
                      reportType="professional_report"
                      size="sm"
                      variant="outline"
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={editedReport.status === "approved"}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {editedReport.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={handleApprove}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setChangedFields(new Set())
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || changedFields.size === 0}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Guardar Cambios
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analysis">Análisis</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          <TabsTrigger value="professional">Notas Profesionales</TabsTrigger>
          <TabsTrigger value="followup">Seguimiento</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>

        {/* Tab: Análisis */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Clínico</CardTitle>
              <CardDescription>
                Evalúe y modifique el análisis generado por IA según su criterio profesional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <ComparisonView
                  field="analysis"
                  original={reportData.analysis}
                  edited={editedReport.editedData.analysis}
                />
              ) : (
                <>
                  <div>
                    <Label>Análisis Original (Referencia)</Label>
                    <ScrollArea className="h-32 mt-2 p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm whitespace-pre-wrap">{reportData.analysis}</p>
                    </ScrollArea>
                  </div>
                  <div>
                    <Label>Análisis Editado</Label>
                    <Textarea
                      value={editedReport.editedData.analysis}
                      onChange={(e) => handleFieldChange("analysis", e.target.value)}
                      className="min-h-[200px] mt-2"
                      placeholder="Ingrese su análisis profesional..."
                    />
                    {changedFields.has("analysis") && (
                      <p className="text-xs text-green-600 mt-1">✓ Modificado</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Recomendaciones */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Mejoramiento</CardTitle>
              <CardDescription>
                Ajuste las recomendaciones basándose en su evaluación profesional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <ComparisonView
                  field="recommendations"
                  original={reportData.recommendations}
                  edited={editedReport.editedData.recommendations}
                />
              ) : (
                <>
                  <div>
                    <Label>Recomendaciones Originales (Referencia)</Label>
                    <ScrollArea className="h-32 mt-2 p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm whitespace-pre-wrap">{reportData.recommendations}</p>
                    </ScrollArea>
                  </div>
                  <div>
                    <Label>Recomendaciones Editadas</Label>
                    <Textarea
                      value={editedReport.editedData.recommendations}
                      onChange={(e) => handleFieldChange("recommendations", e.target.value)}
                      className="min-h-[200px] mt-2"
                      placeholder="Ingrese sus recomendaciones profesionales..."
                    />
                    {changedFields.has("recommendations") && (
                      <p className="text-xs text-green-600 mt-1">✓ Modificado</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notas Profesionales */}
        <TabsContent value="professional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Profesional</CardTitle>
              <CardDescription>
                Agregue diagnóstico, tratamiento y notas adicionales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Diagnóstico</Label>
                <Textarea
                  value={editedReport.editedData.diagnosis}
                  onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
                  disabled={!isEditing}
                  className="mt-2"
                  placeholder="Ingrese el diagnóstico..."
                />
              </div>
              
              <div>
                <Label>Plan de Tratamiento</Label>
                <Textarea
                  value={editedReport.editedData.treatment}
                  onChange={(e) => handleFieldChange("treatment", e.target.value)}
                  disabled={!isEditing}
                  className="mt-2"
                  placeholder="Describa el plan de tratamiento..."
                />
              </div>
              
              <div>
                <Label>Notas Adicionales del Profesional</Label>
                <Textarea
                  value={editedReport.editedData.professionalNotes}
                  onChange={(e) => handleFieldChange("professionalNotes", e.target.value)}
                  disabled={!isEditing}
                  className="mt-2 min-h-[120px]"
                  placeholder="Observaciones adicionales, consideraciones especiales, etc..."
                />
              </div>

              {/* Secciones personalizadas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Secciones Personalizadas</Label>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCustomSection}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar Sección
                    </Button>
                  )}
                </div>
                
                {editedReport.editedData.customSections?.map((section, index) => (
                  <Card key={index} className="mt-2">
                    <CardContent className="pt-4 space-y-2">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Input
                              value={section.title}
                              onChange={(e) => {
                                const updated = [...(editedReport.editedData.customSections || [])]
                                updated[index] = { ...updated[index], title: e.target.value }
                                handleFieldChange("customSections", updated)
                              }}
                              placeholder="Título de la sección"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCustomSection(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={section.content}
                            onChange={(e) => {
                              const updated = [...(editedReport.editedData.customSections || [])]
                              updated[index] = { ...updated[index], content: e.target.value }
                              handleFieldChange("customSections", updated)
                            }}
                            placeholder="Contenido de la sección"
                            className="min-h-[100px]"
                          />
                        </>
                      ) : (
                        <>
                          <h4 className="font-semibold">{section.title}</h4>
                          <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seguimiento */}
        <TabsContent value="followup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan de Seguimiento</CardTitle>
              <CardDescription>
                Configure el seguimiento requerido para el paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editedReport.editedData.followUp?.required}
                  onCheckedChange={(checked) => 
                    handleFieldChange("followUp", {
                      ...editedReport.editedData.followUp,
                      required: checked
                    })
                  }
                  disabled={!isEditing}
                />
                <Label>Requiere seguimiento</Label>
              </div>
              
              {editedReport.editedData.followUp?.required && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Próxima Cita</Label>
                      <Input
                        type="date"
                        value={editedReport.editedData.followUp?.nextAppointment}
                        onChange={(e) => 
                          handleFieldChange("followUp", {
                            ...editedReport.editedData.followUp,
                            nextAppointment: e.target.value
                          })
                        }
                        disabled={!isEditing}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label>Frecuencia</Label>
                      <Select
                        value={editedReport.editedData.followUp?.frequency}
                        onValueChange={(value) => 
                          handleFieldChange("followUp", {
                            ...editedReport.editedData.followUp,
                            frequency: value
                          })
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quincenal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="as_needed">Según necesidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Notas de Seguimiento</Label>
                    <Textarea
                      value={editedReport.editedData.followUp?.notes}
                      onChange={(e) => 
                        handleFieldChange("followUp", {
                          ...editedReport.editedData.followUp,
                          notes: e.target.value
                        })
                      }
                      disabled={!isEditing}
                      className="mt-2"
                      placeholder="Instrucciones específicas para el seguimiento..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Privacidad */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Privacidad</CardTitle>
              <CardDescription>
                Controle quién puede ver y descargar este reporte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Los padres pueden ver el reporte</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite que los padres vean el reporte editado
                    </p>
                  </div>
                  <Switch
                    checked={editedReport.privacy?.parentCanView}
                    onCheckedChange={(checked) => 
                      setEditedReport(prev => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy!,
                          parentCanView: checked
                        }
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Los padres pueden descargar el reporte</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite la descarga en formato PDF
                    </p>
                  </div>
                  <Switch
                    checked={editedReport.privacy?.parentCanDownload}
                    onCheckedChange={(checked) => 
                      setEditedReport(prev => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy!,
                          parentCanDownload: checked
                        }
                      }))
                    }
                    disabled={!isEditing || !editedReport.privacy?.parentCanView}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Requiere aprobación antes de compartir</Label>
                    <p className="text-xs text-muted-foreground">
                      El supervisor debe aprobar antes de enviar a los padres
                    </p>
                  </div>
                  <Switch
                    checked={editedReport.privacy?.requiresApproval}
                    onCheckedChange={(checked) => 
                      setEditedReport(prev => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy!,
                          requiresApproval: checked
                        }
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              {editedReport.privacy?.parentCanView && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Nota de Privacidad</p>
                      <p className="text-blue-700 mt-1">
                        {editedReport.privacy.parentCanView && editedReport.privacy.parentCanDownload
                          ? "Los padres podrán ver y descargar este reporte una vez aprobado."
                          : editedReport.privacy.parentCanView
                          ? "Los padres podrán ver este reporte en línea pero no descargarlo."
                          : "Este reporte permanecerá privado y solo será accesible para profesionales."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Historial de cambios */}
      {showHistory && editedReport.editHistory && editedReport.editHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Ediciones</CardTitle>
            <CardDescription>
              Registro de todos los cambios realizados en este reporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {editedReport.editHistory.map((edit, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="mt-1">
                      <Edit3 className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Campo: {edit.field}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(edit.editedAt), "PPpp", { locale: es })}
                      </p>
                      {edit.reason && (
                        <p className="text-xs mt-1 text-gray-600">
                          Razón: {edit.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Razón del cambio (cuando está editando) */}
      {isEditing && changedFields.size > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm">Razón de los Cambios (Opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Explique brevemente el motivo de estas modificaciones..."
              className="bg-white"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
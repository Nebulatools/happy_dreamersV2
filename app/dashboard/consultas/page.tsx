// Página de consultas (solo para administradores)
// Permite hacer consultas combinando transcript + datos del niño + knowledge base

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Stethoscope, FileText, Mic, History, Calendar } from "lucide-react"
import { useSession } from "next-auth/react"
import { UserChildSelector } from "@/components/consultas/UserChildSelector"
import { TranscriptInput } from "@/components/consultas/TranscriptInput"
import { AnalysisReport } from "@/components/consultas/AnalysisReport"
import { ConsultationHistory } from "@/components/consultas/ConsultationHistory"
import { PlanManager } from "@/components/consultas/PlanManager"
import { ConsultationWizard } from "@/components/consultas/ConsultationWizard"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


interface User {
  _id: string
  name: string
  email: string
  role: string
}

interface Child {
  _id: string
  firstName: string
  lastName: string
  parentId: string
  birthDate?: string
}

export default function ConsultasPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userChildren, setUserChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [loadingChildren, setLoadingChildren] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  
  // Estado del wizard
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Verificar que el usuario es admin
  useEffect(() => {
    if (session && session.user.role !== "admin") {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta página.",
        variant: "destructive",
      })
      return
    }
  }, [session, toast])

  // Cargar niños cuando se selecciona un usuario
  const loadUserChildren = async (userId: string) => {
    try {
      setLoadingChildren(true)
      const response = await fetch(`/api/children?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error("Error al cargar los niños del usuario")
      }
      
      const data = await response.json()
      
      // La API regresa un objeto con estructura { children: [], success: true }
      // Para admins consultando niños de otro usuario viene en data.data.children
      const children = Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
      
      setUserChildren(children)
      setSelectedChild(null) // Reset child selection
      setAnalysisResult(null) // Reset analysis
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los niños del usuario.",
        variant: "destructive",
      })
    } finally {
      setLoadingChildren(false)
    }
  }

  // Manejar selección de usuario
  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    loadUserChildren(user._id)
    
    // Marcar paso 1 como completado y avanzar al paso 2
    setCompletedSteps(prev => new Set([...prev, 1]))
    setCurrentStep(2)
  }

  // Manejar selección de niño
  const handleChildSelect = (child: Child) => {
    setSelectedChild(child)
    setAnalysisResult(null) // Reset analysis
    
    // Marcar paso 2 como completado y avanzar al paso 3
    setCompletedSteps(prev => new Set([...prev, 2]))
    setCurrentStep(3)
  }

  // Procesar análisis
  const handleAnalyze = async () => {
    if (!selectedUser || !selectedChild || !transcript.trim()) {
      toast({
        title: "Información incompleta",
        description: "Selecciona un usuario, niño y proporciona un transcript.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const startTime = Date.now()
      
      const response = await fetch("/api/consultas/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          childId: selectedChild._id,
          transcript: transcript.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar el análisis")
      }

      const result = await response.json()
      
      // Agregar metadata del procesamiento
      const processingTime = Date.now() - startTime
      const analysisWithMetadata = {
        ...result,
        metadata: {
          reportId: result.reportId,
          createdAt: new Date().toISOString(),
          adminName: session?.user?.name || "Admin",
          processingTime: `${processingTime}ms`,
        },
      }
      
      setAnalysisResult(analysisWithMetadata)
      
      toast({
        title: "Análisis completado",
        description: "Se ha generado el análisis y plan de mejoramiento.",
      })

      // Marcar paso 3 como completado y cambiar al tab de análisis
      setCompletedSteps(prev => new Set([...prev, 3]))
      setCurrentStep(5)
    } catch (error) {
      logger.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar el análisis.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Manejar click en pasos del wizard
  const handleStepClick = (step: number) => {
    // Paso 1 siempre disponible
    if (step === 1) {
      setCurrentStep(1)
    } 
    // Paso 2 solo si hay usuario seleccionado
    else if (step === 2 && selectedUser) {
      setCurrentStep(2)
    } 
    // Pasos 3-6 disponibles si hay usuario y niño seleccionados
    else if (step > 2 && selectedUser && selectedChild) {
      setCurrentStep(step)
    }
  }

  if (session?.user.role !== "admin") {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <p>Acceso denegado. Solo los administradores pueden acceder a esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Renderizar contenido basado en el paso actual
  const renderStepContent = () => {
    // Pasos 1 y 2: Selección de usuario y niño
    if (currentStep === 1 || currentStep === 2) {
      return (
        <UserChildSelector
          selectedUser={selectedUser}
          selectedChild={selectedChild}
          onUserSelect={handleUserSelect}
          onChildSelect={handleChildSelect}
          userChildren={userChildren}
          loading={loadingChildren}
          mode="wizard"
          currentStep={currentStep}
        />
      )
    }

    // Pasos 3-6: Tabs de funcionalidad
    if (!selectedUser || !selectedChild) {
      return (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Completa los pasos anteriores</h3>
              <p className="text-muted-foreground">
                Primero selecciona un usuario y un niño para continuar.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    switch (currentStep) {
      case 3: // Transcript
        return (
          <>
            <TranscriptInput
              value={transcript}
              onChange={setTranscript}
              disabled={isAnalyzing}
            />
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleAnalyze}
                disabled={!transcript.trim() || isAnalyzing}
                size="lg"
                className="min-w-[200px]"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Stethoscope className="h-4 w-4 mr-2" />
                )}
                {isAnalyzing ? "Analizando..." : "Generar Análisis Completo"}
              </Button>
            </div>
          </>
        )

      case 4: // Plan
        return (
          <PlanManager
            selectedUserId={selectedUser._id}
            selectedChildId={selectedChild._id}
            selectedChildName={`${selectedChild.firstName} ${selectedChild.lastName}`}
            hasAnalysisResult={!!analysisResult}
            latestReportId={analysisResult?.reportId || null}
          />
        )

      case 5: // Análisis
        return (
          <AnalysisReport
            result={analysisResult}
            isLoading={isAnalyzing}
            userName={selectedUser.name}
            childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
          />
        )

      case 6: // Historial
        return (
          <ConsultationHistory
            selectedUserId={selectedUser._id}
            selectedChildId={selectedChild._id}
            selectedChildName={`${selectedChild.firstName} ${selectedChild.lastName}`}
            visible={true}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* Wizard Header */}
      <ConsultationWizard
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        hasUser={!!selectedUser}
        hasChild={!!selectedChild}
        userName={selectedUser?.name}
        childName={selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : undefined}
      />

      {/* Main Content */}
      <div className="container py-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Stethoscope className="h-8 w-8" />
            Consultas Especializadas
          </h1>
          <p className="text-muted-foreground">
            Realiza consultas combinando transcripts con datos del niño y knowledge base
          </p>
        </div>

        {/* Información de contexto cuando usuario y niño están seleccionados */}
        {selectedUser && selectedChild && currentStep > 2 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm font-medium">
                  Consulta para <strong>{selectedChild.firstName} {selectedChild.lastName}</strong> 
                  {" "}de <strong>{selectedUser.name}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenido del paso actual */}
        {renderStepContent()}
      </div>
    </>
  )
}
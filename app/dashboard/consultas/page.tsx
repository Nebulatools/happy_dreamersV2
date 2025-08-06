// Página de consultas (solo para administradores)
// Permite hacer consultas combinando transcript + datos del niño + knowledge base

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Stethoscope } from "lucide-react"
import { useSession } from "next-auth/react"
import { TranscriptInput } from "@/components/consultas/TranscriptInput"
import { AnalysisReport } from "@/components/consultas/AnalysisReport"
import { ConsultationHistory } from "@/components/consultas/ConsultationHistory"
import { PlanManager } from "@/components/consultas/PlanManager"
import { ConsultationTabs } from "@/components/consultas/ConsultationTabs"
import { useActiveChild } from "@/context/active-child-context"
import { ArrowUp } from "lucide-react"

import { createLogger } from "@/lib/logger"

const logger = createLogger("page")


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
  const { activeUserId, activeUserName, activeChildId } = useActiveChild()
  
  const [activeTab, setActiveTab] = useState("transcript")
  const [transcript, setTranscript] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [childData, setChildData] = useState<Child | null>(null)
  const [loadingChild, setLoadingChild] = useState(true)

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

  // Cargar datos del niño seleccionado
  useEffect(() => {
    const loadChildData = async () => {
      if (!activeChildId || !activeUserId) {
        setLoadingChild(false)
        return
      }

      try {
        const response = await fetch(`/api/children?userId=${activeUserId}`)
        if (!response.ok) throw new Error("Error al cargar datos del niño")
        
        const data = await response.json()
        const children = Array.isArray(data) ? data : (data?.children || data?.data?.children || [])
        const child = children.find((c: Child) => c._id === activeChildId)
        
        setChildData(child || null)
      } catch (error) {
        logger.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del niño.",
          variant: "destructive",
        })
      } finally {
        setLoadingChild(false)
      }
    }

    loadChildData()
  }, [activeChildId, activeUserId, toast])


  // Procesar análisis
  const handleAnalyze = async () => {
    if (!activeUserId || !activeChildId || !transcript.trim()) {
      toast({
        title: "Información incompleta",
        description: "Asegúrate de tener un paciente seleccionado y proporciona un transcript.",
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
          userId: activeUserId,
          childId: activeChildId,
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

      // Cambiar al tab de análisis después de un pequeño delay
      setTimeout(() => {
        setActiveTab("analysis")
      }, 100)
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

  // Renderizar contenido basado en el tab activo
  const renderTabContent = () => {
    if (!activeUserId || !activeChildId) {
      return null
    }

    // Verificación defensiva para childData
    if (loadingChild || !childData) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Cargando datos del niño...</span>
        </div>
      )
    }

    const childName = `${childData.firstName} ${childData.lastName}`

    try {
      switch (activeTab) {
      case "transcript":
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

      case "plan":
        return (
          <PlanManager
            selectedUserId={activeUserId}
            selectedChildId={activeChildId}
            selectedChildName={childName}
            hasAnalysisResult={!!analysisResult}
            latestReportId={analysisResult?.reportId || null}
          />
        )

      case "analysis":
        return (
          <AnalysisReport
            result={analysisResult}
            isLoading={isAnalyzing}
            userName={activeUserName || ""}
            childName={childName}
          />
        )

      case "history":
        return (
          <ConsultationHistory
            selectedUserId={activeUserId}
            selectedChildId={activeChildId}
            selectedChildName={childName}
            visible={true}
          />
        )

      default:
        return null
      }
    } catch (error) {
      logger.error("Error rendering tab content:", error)
      return (
        <div className="flex items-center justify-center py-8 text-red-600">
          <span>Error al cargar el contenido. Por favor, recarga la página.</span>
        </div>
      )
    }
  }

  // Si hay selección, mostrar tabs
  if (activeUserId && activeChildId && !loadingChild) {
    return (
      <>
        {/* Tabs de navegación */}
        <ConsultationTabs
          activeTab={activeTab}
          onTabChange={(newTab) => {
            // Prevenir cambios de tab durante análisis o carga
            if (isAnalyzing || loadingChild) return
            setActiveTab(newTab)
          }}
          userName={activeUserName || ""}
          childName={childData ? `${childData.firstName} ${childData.lastName}` : ""}
        />

        {/* Contenido principal */}
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

          {/* Contenido del tab activo */}
          {renderTabContent()}
        </div>
      </>
    )
  }

  // Estado vacío cuando no hay selección
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Stethoscope className="h-8 w-8" />
          Consultas Especializadas
        </h1>
        <p className="text-muted-foreground">
          Realiza consultas combinando transcripts con datos del niño y knowledge base
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="py-16 text-center">
          <Stethoscope className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold mb-2">
            Selecciona un paciente para comenzar
          </h3>
          <p className="text-muted-foreground mb-6">
            Usa el selector en la parte superior para elegir un paciente y niño
          </p>
          <div className="flex justify-center">
            <ArrowUp className="h-8 w-8 text-muted-foreground animate-bounce" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
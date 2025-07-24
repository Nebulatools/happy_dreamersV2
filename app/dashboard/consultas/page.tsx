// Página de consultas (solo para administradores)
// Permite hacer consultas combinando transcript + datos del niño + knowledge base

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Stethoscope, FileText, Mic, History } from "lucide-react"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserChildSelector } from "@/components/consultas/UserChildSelector"
import { TranscriptInput } from "@/components/consultas/TranscriptInput"
import { AnalysisReport } from "@/components/consultas/AnalysisReport"
import { ConsultationHistory } from "@/components/consultas/ConsultationHistory"

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
      setUserChildren(data)
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
  }

  // Manejar selección de niño
  const handleChildSelect = (child: Child) => {
    setSelectedChild(child)
    setAnalysisResult(null) // Reset analysis
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

  return (
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel de Selección */}
        <div className="lg:col-span-1 space-y-4">
          <UserChildSelector
            selectedUser={selectedUser}
            selectedChild={selectedChild}
            onUserSelect={handleUserSelect}
            onChildSelect={handleChildSelect}
            userChildren={userChildren}
            loading={loadingChildren}
          />
        </div>

        {/* Panel Principal */}
        <div className="lg:col-span-2">
          {selectedUser && selectedChild ? (
            <Tabs defaultValue="transcript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transcript">
                  <FileText className="h-4 w-4 mr-2" />
                  Transcript
                </TabsTrigger>
                <TabsTrigger value="analysis">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Análisis
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  Historial
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transcript" className="space-y-4">
                <TranscriptInput
                  value={transcript}
                  onChange={setTranscript}
                  disabled={isAnalyzing}
                />
                
                <div className="flex justify-center">
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
              </TabsContent>

              <TabsContent value="analysis">
                <AnalysisReport
                  result={analysisResult}
                  isLoading={isAnalyzing}
                  userName={selectedUser?.name}
                  childName={selectedChild ? `${selectedChild.firstName} ${selectedChild.lastName}` : undefined}
                />
              </TabsContent>

              <TabsContent value="history">
                <ConsultationHistory
                  selectedUserId={selectedUser?._id}
                  selectedChildId={selectedChild?._id}
                  visible={true}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecciona un Usuario y Niño</h3>
                  <p className="text-muted-foreground">
                    Para comenzar una consulta, primero selecciona un usuario y luego el niño específico.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
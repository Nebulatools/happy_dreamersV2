// Página de encuesta
// Implementa el formulario de encuesta para recopilar información detallada sobre el niño

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ParentInfoForm } from "@/components/survey/parent-info-form"
import { ChildHistoryForm } from "@/components/survey/child-history-form"
import { FamilyDynamicsForm } from "@/components/survey/family-dynamics-form"
import { SleepRoutineForm } from "@/components/survey/sleep-routine-form"

export default function SurveyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("parent-info")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para almacenar las respuestas de cada sección
  const [formData, setFormData] = useState({
    parentInfo: {},
    childHistory: {},
    familyDynamics: {},
    sleepRoutine: {},
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const handleSectionSubmit = (section: string, data: any) => {
    // Actualizar el estado con los datos de la sección
    setFormData((prev) => ({
      ...prev,
      [section]: data,
    }))

    // Avanzar a la siguiente pestaña
    const tabs = ["parent-info", "child-history", "family-dynamics", "sleep-routine"]
    const currentIndex = tabs.indexOf(section)

    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1])
    } else {
      // Si es la última sección, enviar todo el formulario
      handleSubmitSurvey()
    }
  }

  const handleSubmitSurvey = async () => {
    setIsSubmitting(true)
    try {
      // Aquí enviaríamos los datos a la API
      console.log("Datos completos de la encuesta:", formData)

      // Simulamos una llamada a la API
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Encuesta completada",
        description: "La información ha sido guardada correctamente.",
      })

      // Redirigir al dashboard
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la encuesta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Encuesta Inicial</h1>
        <p className="text-muted-foreground">Completa esta encuesta para ayudarnos a entender mejor a tu hijo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información detallada</CardTitle>
          <CardDescription>Esta información nos ayudará a personalizar nuestras recomendaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="parent-info">Información de Padres</TabsTrigger>
              <TabsTrigger value="child-history">Historia del Niño</TabsTrigger>
              <TabsTrigger value="family-dynamics">Dinámica Familiar</TabsTrigger>
              <TabsTrigger value="sleep-routine">Rutinas de Sueño</TabsTrigger>
            </TabsList>

            <TabsContent value="parent-info">
              <ParentInfoForm onSubmit={(data) => handleSectionSubmit("parentInfo", data)} />
            </TabsContent>

            <TabsContent value="child-history">
              <ChildHistoryForm onSubmit={(data) => handleSectionSubmit("childHistory", data)} />
            </TabsContent>

            <TabsContent value="family-dynamics">
              <FamilyDynamicsForm onSubmit={(data) => handleSectionSubmit("familyDynamics", data)} />
            </TabsContent>

            <TabsContent value="sleep-routine">
              <SleepRoutineForm
                onSubmit={(data) => handleSectionSubmit("sleepRoutine", data)}
                isSubmitting={isSubmitting}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <Button
            variant="outline"
            onClick={() => {
              const tabs = ["parent-info", "child-history", "family-dynamics", "sleep-routine"]
              const currentIndex = tabs.indexOf(activeTab)
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1])
              }
            }}
            disabled={activeTab === "parent-info" || isSubmitting}
          >
            Anterior
          </Button>
          <Button
            onClick={() => {
              const tabs = ["parent-info", "child-history", "family-dynamics", "sleep-routine"]
              const currentIndex = tabs.indexOf(activeTab)
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1])
              }
            }}
            disabled={activeTab === "sleep-routine" || isSubmitting}
          >
            Siguiente
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

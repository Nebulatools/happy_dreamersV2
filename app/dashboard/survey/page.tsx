// Página de encuesta
// Implementa el formulario de encuesta para recopilar información detallada sobre el niño

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
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

  // Al cargar la página, intentar recuperar datos guardados previamente
  useEffect(() => {
    const savedData = localStorage.getItem(`survey_${childId}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setFormData(parsedData)
        
        // También podríamos restaurar la pestaña activa
        const lastTab = localStorage.getItem(`survey_tab_${childId}`)
        if (lastTab) {
          setActiveTab(lastTab)
        }
        
        toast({
          title: "Datos recuperados",
          description: "Se han cargado tus respuestas anteriores",
        })
      } catch (error) {
        console.error("Error al cargar datos guardados:", error)
      }
    }
  }, [childId, toast])

  const handleTabChange = (value: string) => {
    // Guardar la pestaña actual en localStorage antes de cambiar
    localStorage.setItem(`survey_tab_${childId}`, value)
    setActiveTab(value)
  }

  const handleSectionSubmit = (section: string, data: any) => {
    // Actualizar el estado con los datos de la sección
    const updatedFormData = {
      ...formData,
      [section]: data,
    }
    
    // Guardar los datos actualizados en localStorage
    localStorage.setItem(`survey_${childId}`, JSON.stringify(updatedFormData))
    
    setFormData(updatedFormData)

    // Mostrar mensaje de guardado exitoso
    toast({
      title: "Sección guardada",
      description: "Tus respuestas han sido guardadas",
    })

    // Avanzar a la siguiente pestaña
    const tabs = ["parent-info", "child-history", "family-dynamics", "sleep-routine"]
    const currentIndex = tabs.indexOf(section)

    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1]
      localStorage.setItem(`survey_tab_${childId}`, nextTab)
      setActiveTab(nextTab)
    } else {
      // Si es la última sección, enviar todo el formulario
      handleSubmitSurvey()
    }
  }

  const handleSubmitSurvey = async () => {
    setIsSubmitting(true)
    try {
      // Enviar datos a la API
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childId,
          surveyData: formData
        }),
      })
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Error al enviar la encuesta');
      }

      // Limpiar los datos guardados en localStorage
      localStorage.removeItem(`survey_${childId}`)
      localStorage.removeItem(`survey_tab_${childId}`)

      toast({
        title: "Encuesta completada",
        description: responseData.message || "La información ha sido guardada correctamente.",
      })

      // Redirigir al dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la encuesta. Inténtalo de nuevo.",
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
              <ParentInfoForm 
                onSubmit={(data) => handleSectionSubmit("parentInfo", data)} 
                initialData={formData.parentInfo}
              />
            </TabsContent>

            <TabsContent value="child-history">
              <ChildHistoryForm 
                onSubmit={(data) => handleSectionSubmit("childHistory", data)} 
                initialData={formData.childHistory}
              />
            </TabsContent>

            <TabsContent value="family-dynamics">
              <FamilyDynamicsForm 
                onSubmit={(data) => handleSectionSubmit("familyDynamics", data)} 
                initialData={formData.familyDynamics}
              />
            </TabsContent>

            <TabsContent value="sleep-routine">
              <SleepRoutineForm
                onSubmit={(data) => handleSectionSubmit("sleepRoutine", data)}
                initialData={formData.sleepRoutine}
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
                const prevTab = tabs[currentIndex - 1]
                localStorage.setItem(`survey_tab_${childId}`, prevTab)
                setActiveTab(prevTab)
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
                const nextTab = tabs[currentIndex + 1]
                localStorage.setItem(`survey_tab_${childId}`, nextTab)
                setActiveTab(nextTab)
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

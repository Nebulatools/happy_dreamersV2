// Página para editar un niño existente
// Permite al usuario actualizar la información de un niño y su encuesta

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "next-auth/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ParentInfoForm } from "@/components/survey/parent-info-form"
import { ChildHistoryForm } from "@/components/survey/child-history-form"
import { FamilyDynamicsForm } from "@/components/survey/family-dynamics-form"
import { SleepRoutineForm } from "@/components/survey/sleep-routine-form"
import { Loader2, ArrowLeft } from "lucide-react"

// Formulario básico del niño
const childFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  lastName: z.string().min(2, {
    message: "El apellido debe tener al menos 2 caracteres.",
  }),
  birthDate: z.string().optional(),
})

type ChildFormValues = z.infer<typeof childFormSchema>

export default function EditChildPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string
  const { toast } = useToast()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [activeTab, setActiveTab] = useState("basic-info")
  
  // Estado para almacenar datos básicos
  const [basicInfo, setBasicInfo] = useState<ChildFormValues | null>(null)
  
  // Estado para almacenar las respuestas de cada sección de la encuesta
  const [surveyData, setSurveyData] = useState<Record<string, any>>({
    parentInfo: {},
    childHistory: {},
    familyDynamics: {},
    sleepRoutine: {},
  })

  // Formulario de información básica
  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
    },
  })

  // Cargar los datos iniciales del niño
  useEffect(() => {
    const fetchChild = async () => {
      try {
        setIsFetching(true)
        const response = await fetch(`/api/children/${childId}`)
        if (!response.ok) {
          throw new Error('Error al cargar los datos del niño')
        }
        const data = await response.json()
        
        // Establecer datos básicos
        const childBasicInfo = {
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
        }
        setBasicInfo(childBasicInfo)
        form.reset(childBasicInfo)
        
        // Establecer datos de la encuesta si existen
        if (data.surveyData) {
          setSurveyData({
            parentInfo: data.surveyData.parentInfo || {},
            childHistory: data.surveyData.childHistory || {},
            familyDynamics: data.surveyData.familyDynamics || {},
            sleepRoutine: data.surveyData.sleepRoutine || {},
          })
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del niño. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false)
      }
    }

    if (childId) {
      fetchChild()
    }
  }, [childId, form, toast])

  // Actualizar estado basicInfo automáticamente
  useEffect(() => {
    const subscription = form.watch((value) => {
      childFormSchema.safeParseAsync(value).then(result => {
        if (result.success) {
          setBasicInfo(result.data);
        }
      });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Función para actualizar el estado de la encuesta
  const handleSurveyDataChange = (section: string, data: any) => {
    setSurveyData(prev => ({
      ...prev,
      [section]: data,
    }))
  }

  // Enviar todo el formulario completo (datos básicos + encuesta)
  const handleSubmitComplete = async () => {
    if (!basicInfo || !session?.user?.id) {
      toast({
        title: "Error",
        description: "No se puede guardar la información sin los datos básicos o sesión",
        variant: "destructive",
      });
      return;
    }
    
    if (!basicInfo.firstName || !basicInfo.lastName) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa el nombre y apellido del niño",
        variant: "destructive",
      });
      setActiveTab("basic-info");
      return;
    }

    setIsLoading(true);
    
    try {
      // Usar directamente basicInfo y surveyData del estado
      const requestData = {
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName,
        birthDate: basicInfo.birthDate || "",
        surveyData: surveyData // Usar el estado completo
      };
      
      console.log("Enviando datos de actualización:", JSON.stringify(requestData, null, 2));
      
      const response = await fetch(`/api/children/${childId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log("Respuesta del servidor:", response.status, response.statusText);
      
      if (!response.ok) {
        const responseData = await response.json();
        console.error("Error en respuesta:", responseData);
        throw new Error(responseData.message || 'Error al actualizar el niño');
      }

      const responseData = await response.json();
      console.log("Datos de respuesta:", responseData);

      toast({
        title: "Actualización completada",
        description: `La información de ${basicInfo.firstName} ha sido actualizada correctamente.`,
      });

      // Forzar refresco completo para asegurar carga de datos nuevos
      window.location.href = `/dashboard/children/${childId}`;

    } catch (error: any) {
      console.error("Error al actualizar:", error);
      toast({
        title: "Error al actualizar",
        description: error?.message || "No se pudo completar la actualización. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Botones de navegación entre pestañas
  const renderTabNavigation = () => {
    const tabs = ["basic-info", "parent-info", "child-history", "family-dynamics", "sleep-routine"]
    const currentIndex = tabs.indexOf(activeTab)
    
    return (
      <div className="flex justify-between border-t p-4">
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => {
              if (currentIndex > 0) {
                const prevTab = tabs[currentIndex - 1]
                setActiveTab(prevTab)
              }
            }}
            disabled={currentIndex === 0 || isLoading}
          >
            Anterior
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (currentIndex < tabs.length - 1) {
                const nextTab = tabs[currentIndex + 1]
                setActiveTab(nextTab)
              }
            }}
            disabled={isLoading || currentIndex === tabs.length - 1}
          >
            Siguiente
          </Button>
        </div>
        
        <Button 
          onClick={handleSubmitComplete} 
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    )
  }

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando información del niño...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push(`/dashboard/children/${childId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al perfil
          </Button>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Niño</h1>
            <p className="text-muted-foreground">Modifica la información y la encuesta</p>
          </div>
        </div>
      </div>

      <Card className="pt-6">
        <CardHeader className="px-8">
          <CardTitle>Información del niño</CardTitle>
          <CardDescription>
            Actualiza la información básica y completa o modifica la encuesta para mejorar las recomendaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic-info">Información básica</TabsTrigger>
              <TabsTrigger value="parent-info">Padres</TabsTrigger>
              <TabsTrigger value="child-history">Historia</TabsTrigger>
              <TabsTrigger value="family-dynamics">Dinámica familiar</TabsTrigger>
              <TabsTrigger value="sleep-routine">Rutina de sueño</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic-info" className="pt-6">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del niño" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="Apellido del niño" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de nacimiento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>
                          La fecha de nacimiento nos ayuda a personalizar las recomendaciones según la edad del niño.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>
            
            <TabsContent value="parent-info" className="pt-6">
              <ParentInfoForm 
                onDataChange={(data) => handleSurveyDataChange("parentInfo", data)}
                initialData={surveyData.parentInfo}
              />
            </TabsContent>
            
            <TabsContent value="child-history" className="pt-6">
              <ChildHistoryForm 
                onDataChange={(data) => handleSurveyDataChange("childHistory", data)}
                initialData={surveyData.childHistory}
              />
            </TabsContent>
            
            <TabsContent value="family-dynamics" className="pt-6">
              <FamilyDynamicsForm 
                onDataChange={(data) => handleSurveyDataChange("familyDynamics", data)}
                initialData={surveyData.familyDynamics}
              />
            </TabsContent>
            
            <TabsContent value="sleep-routine" className="pt-6">
              <SleepRoutineForm 
                onDataChange={(data) => handleSurveyDataChange("sleepRoutine", data)}
                initialData={surveyData.sleepRoutine}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          {renderTabNavigation()}
        </CardFooter>
      </Card>
    </div>
  )
} 
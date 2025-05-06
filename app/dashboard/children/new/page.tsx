// Página para agregar un nuevo niño
// Permite al usuario registrar un nuevo hijo y completar la encuesta inicial

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

export default function NewChildPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
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
      console.error("Error: Información básica o sesión no disponible", { basicInfo, sessionUserId: session?.user?.id });
      toast({
        title: "Error",
        description: "No se puede guardar la información sin los datos básicos o sesión",
        variant: "destructive",
      });
      return;
    }
    
    if (!basicInfo.firstName || !basicInfo.lastName) {
      console.error("Error: Faltan datos básicos", { 
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName
      });
      toast({
        title: "Datos incompletos",
        description: "Por favor completa el nombre y apellido del niño",
        variant: "destructive",
      });
      setActiveTab("basic-info");
      return;
    }
    
    setIsLoading(true);
    console.log("Datos básicos a enviar:", basicInfo);
    console.log("Datos de encuesta a enviar:", surveyData);
    
    try {
      // Crear el niño con toda la información
      const requestData = {
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName,
        birthDate: basicInfo.birthDate || "",
        parentId: session.user.id,
        surveyData: surveyData // Usar el estado completo
      };
      
      console.log("Enviando datos a /api/children:", JSON.stringify(requestData));
      
      const response = await fetch('/api/children', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      console.log("Respuesta del servidor:", response.status, response.statusText);
      const responseData = await response.json();
      console.log("Datos de respuesta:", responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Error al registrar el niño con la encuesta');
      }

      toast({
        title: "Registro completado",
        description: `El niño ${basicInfo.firstName} ha sido registrado correctamente y vinculado a tu perfil. ID: ${responseData.id}`,
      });

      // Redirigir al dashboard
      router.push("/dashboard");

    } catch (error: any) {
      console.error("Error en handleSubmitComplete:", error);
      toast({
        title: "Error al registrar",
        description: error?.message || "No se pudo completar el registro. Inténtalo de nuevo.",
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
        
        <div className="space-x-2">
          {/* Botón Guardar (Registrar) siempre visible en la última pestaña */} 
          {activeTab === "sleep-routine" && (
            <Button 
              onClick={handleSubmitComplete} 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Guardando..." : "Registrar niño"}
            </Button>
          )}

          {/* Botón Siguiente (excepto en la última pestaña) */} 
          {activeTab !== "sleep-routine" && (
            <Button
              onClick={() => {
                // Ya no necesitamos guardar explícitamente aquí
                if (currentIndex < tabs.length - 1) {
                  const nextTab = tabs[currentIndex + 1]
                  setActiveTab(nextTab)
                }
              }}
              // Habilitar siguiente solo si la info básica está completa
              disabled={isLoading || !basicInfo || !basicInfo.firstName || !basicInfo.lastName}
            >
              Siguiente
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrar Nuevo Niño</h1>
            <p className="text-muted-foreground">Completa la información y la encuesta inicial</p>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-db');
                  const data = await response.json();
                  console.log("Prueba de conexión a MongoDB:", data);
                  toast({
                    title: data.status === "success" ? "Conexión exitosa" : "Error de conexión",
                    description: data.status === "success" 
                      ? `Conectado a MongoDB. Niños: ${data.childrenCount}`
                      : `Error: ${data.error}`,
                    variant: data.status === "success" ? "default" : "destructive",
                  });
                } catch (error) {
                  console.error("Error en prueba de conexión:", error);
                  toast({
                    title: "Error de conexión",
                    description: "No se pudo conectar a MongoDB. Revisa la consola para más detalles.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Probar Conexión MongoDB
            </Button>
          )}
        </div>
      </div>

      <Card className="pt-6">
        <CardHeader className="px-8">
          <CardTitle>Formulario de registro</CardTitle>
          <CardDescription>Por favor completa todos los campos para crear un perfil completo</CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 px-8">
            <TabsTrigger value="basic-info" disabled={isLoading}>Datos Básicos</TabsTrigger>
            <TabsTrigger value="parent-info" disabled={!basicInfo || isLoading}>Información Padres</TabsTrigger>
            <TabsTrigger value="child-history" disabled={!basicInfo || isLoading}>Historia Niño</TabsTrigger>
            <TabsTrigger value="family-dynamics" disabled={!basicInfo || isLoading}>Dinámica Familiar</TabsTrigger>
            <TabsTrigger value="sleep-routine" disabled={!basicInfo || isLoading}>Rutinas de Sueño</TabsTrigger>
          </TabsList>
          
          <CardContent className="px-8 pt-6">
            <TabsContent value="basic-info">
              <Form {...form}>
                <div className="space-y-6">
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
                        <FormLabel>Fecha de nacimiento <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            required
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value;
                              console.log("Fecha seleccionada:", value);
                              if (value) {
                                field.onChange(value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>Esta información nos ayudará a personalizar las recomendaciones</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </TabsContent>

            <TabsContent value="parent-info">
              {basicInfo && (
                <ParentInfoForm 
                  onDataChange={(data) => handleSurveyDataChange("parentInfo", data)}
                  initialData={surveyData.parentInfo}
                />
              )}
            </TabsContent>

            <TabsContent value="child-history">
              {basicInfo && (
                <ChildHistoryForm 
                  onDataChange={(data) => handleSurveyDataChange("childHistory", data)}
                  initialData={{
                    ...surveyData.childHistory,
                    // Pasar automáticamente los datos básicos a la historia del niño
                    child_name: basicInfo.firstName,
                    child_last_name: basicInfo.lastName,
                    birth_date: basicInfo.birthDate,
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="family-dynamics">
              {basicInfo && (
                <FamilyDynamicsForm 
                  onDataChange={(data) => handleSurveyDataChange("familyDynamics", data)}
                  initialData={surveyData.familyDynamics}
                />
              )}
            </TabsContent>

            <TabsContent value="sleep-routine">
              {basicInfo && (
                <SleepRoutineForm
                  onDataChange={(data) => handleSurveyDataChange("sleepRoutine", data)}
                  initialData={surveyData.sleepRoutine}
                  isSubmitting={isLoading}
                />
              )}
            </TabsContent>
          </CardContent>

          <CardFooter>
            {renderTabNavigation()}
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}

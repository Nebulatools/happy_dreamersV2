"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, Clock, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId: string;
  createdAt: string;
  surveyData?: {
    parentInfo?: any;
    childHistory?: any;
    familyDynamics?: any;
    sleepRoutine?: any;
  }
}

export default function ChildDetailPage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [child, setChild] = useState<Child | null>(null)

  useEffect(() => {
    const fetchChild = async () => {
      try {
        const response = await fetch(`/api/children?id=${childId}`)
        if (!response.ok) {
          throw new Error('Error al cargar los datos del niño')
        }
        const data = await response.json()
        setChild(data)
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del niño. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChild()
  }, [childId, toast])

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "N/A"
    
    const birth = new Date(birthDate)
    const now = new Date()
    
    let years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    
    if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
      years--
    }
    
    // Para niños menores de 1 año, mostrar meses
    if (years === 0) {
      let monthsAge = now.getMonth() - birth.getMonth()
      if (now.getDate() < birth.getDate()) {
        monthsAge--
      }
      if (monthsAge < 0) {
        monthsAge += 12
      }
      return `${monthsAge} ${monthsAge === 1 ? 'mes' : 'meses'}`
    }
    
    return `${years} ${years === 1 ? 'año' : 'años'}`
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es })
    } catch (error) {
      return "Fecha no disponible"
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando información del niño...</span>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Niño no encontrado</h1>
          <p className="text-muted-foreground">No se pudo encontrar la información del niño solicitado</p>
        </div>
      </div>
    )
  }

  const birthDateFormatted = child.birthDate ? formatDate(child.birthDate) : "No disponible"
  const age = child.birthDate ? calculateAge(child.birthDate) : "No disponible"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al dashboard
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/children/events?childId=${child._id}`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{child.firstName} {child.lastName}</h1>
          <p className="text-muted-foreground">
            {age} • Nacimiento: {birthDateFormatted}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => router.push(`/dashboard/children/${child._id}/events`)}
            className="flex items-center"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Ver eventos
          </Button>
          <Button 
            onClick={() => router.push(`/dashboard/event`)}
            variant="outline"
            className="flex items-center"
          >
            <Clock className="mr-2 h-4 w-4" />
            Registrar evento
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Información básica</TabsTrigger>
          <TabsTrigger value="parent-info">Padres</TabsTrigger>
          <TabsTrigger value="child-history">Historia</TabsTrigger>
          <TabsTrigger value="sleep-routine">Rutinas de sueño</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información básica</CardTitle>
              <CardDescription>Datos generales del niño</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Nombre completo</p>
                    <p className="text-lg">{child.firstName} {child.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Edad</p>
                    <p className="text-lg">{age}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Fecha de nacimiento</p>
                    <p className="text-lg">{birthDateFormatted}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Fecha de registro</p>
                    <p className="text-lg">{formatDate(child.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parent-info">
          <Card>
            <CardHeader>
              <CardTitle>Información de los padres</CardTitle>
              <CardDescription>Datos del padre y la madre</CardDescription>
            </CardHeader>
            <CardContent>
              {child.surveyData?.parentInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(child.surveyData.parentInfo).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm font-medium">{key.replaceAll('_', ' ')}</p>
                        <p className="text-lg">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay información disponible sobre los padres</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="child-history">
          <Card>
            <CardHeader>
              <CardTitle>Historia del niño</CardTitle>
              <CardDescription>Antecedentes y desarrollo</CardDescription>
            </CardHeader>
            <CardContent>
              {child.surveyData?.childHistory ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(child.surveyData.childHistory).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm font-medium">{key.replaceAll('_', ' ')}</p>
                        <p className="text-lg">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay información disponible sobre la historia del niño</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sleep-routine">
          <Card>
            <CardHeader>
              <CardTitle>Rutinas de sueño</CardTitle>
              <CardDescription>Hábitos y patrones de sueño</CardDescription>
            </CardHeader>
            <CardContent>
              {child.surveyData?.sleepRoutine ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(child.surveyData.sleepRoutine).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm font-medium">{key.replaceAll('_', ' ')}</p>
                        <p className="text-lg">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay información disponible sobre rutinas de sueño</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
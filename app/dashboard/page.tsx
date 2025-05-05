// Página principal del dashboard
// Muestra un resumen de la información del niño seleccionado

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Clock, Moon, Sun, Activity } from "lucide-react"
import Link from "next/link"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface Child {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  birthDate?: string;
  parentId: string;
  createdAt: Date;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    redirect("/auth/login")
  }

  // Consultar si el usuario tiene niños registrados
  const { db } = await connectToDatabase()
  const children = await db.collection("children")
    .find({ parentId: session.user.id })
    .toArray() as Child[]
  
  const hasChildren = children.length > 0

  if (!hasChildren) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Bienvenido a Happy Dreamers</h1>
          <p className="text-muted-foreground">Para comenzar, agrega a tu primer hijo</p>
        </div>
        <Link href="/dashboard/children/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Agregar niño
          </Button>
        </Link>
      </div>
    )
  }

  // Si tiene niños, mostrar el dashboard con el primer niño
  const selectedChild = children[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen del sueño y actividades de {selectedChild.firstName} {selectedChild.lastName}</p>
        </div>
        <Link href="/dashboard/event">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Registrar evento
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="day" className="space-y-4">
        <TabsList>
          <TabsTrigger value="day">Hoy</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mes</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas de sueño</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.5h</div>
                <p className="text-xs text-muted-foreground">+0.5h comparado con ayer</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despertares nocturnos</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-xs text-muted-foreground">-1 comparado con ayer</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo de siesta</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.5h</div>
                <p className="text-xs text-muted-foreground">Sin cambios respecto a ayer</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actividad física</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45min</div>
                <p className="text-xs text-muted-foreground">+15min comparado con ayer</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Patrón de sueño</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                  Gráfico de patrón de sueño
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Eventos recientes</CardTitle>
                <CardDescription>Últimos 5 eventos registrados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-1 bg-primary/10">
                      <Moon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">Hora de dormir</p>
                      <p className="text-xs text-muted-foreground">Hoy, 8:30 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-1 bg-primary/10">
                      <Sun className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">Siesta</p>
                      <p className="text-xs text-muted-foreground">Hoy, 2:00 PM - 3:30 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="rounded-full p-1 bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">Juego en el parque</p>
                      <p className="text-xs text-muted-foreground">Hoy, 11:00 AM - 11:45 AM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="week" className="space-y-4">
          <div className="h-[300px] w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
            Resumen semanal (Gráficos y estadísticas)
          </div>
        </TabsContent>
        <TabsContent value="month" className="space-y-4">
          <div className="h-[300px] w-full bg-muted rounded-md flex items-center justify-center text-muted-foreground">
            Resumen mensual (Gráficos y estadísticas)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

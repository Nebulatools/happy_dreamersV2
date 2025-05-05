// Página de pacientes (solo para administradores)
// Muestra una lista de todos los pacientes registrados

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

// Definir una interfaz para el tipo de paciente
interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  parentName?: string;
  lastVisit?: string;
  status?: string;
}

export default function PatientsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const patientsPerPage = 10

  useEffect(() => {
    // Cargar los niños desde la base de datos
    async function loadChildren() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/children')
        
        if (!response.ok) {
          throw new Error('Error al cargar los niños')
        }
        
        const data = await response.json()
        setPatients(data)
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los pacientes",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadChildren()
  }, [toast])

  // Filtrar pacientes según el término de búsqueda
  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.parentName && patient.parentName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage)

  // Obtener los pacientes para la página actual
  const currentPatients = filteredPatients.slice((currentPage - 1) * patientsPerPage, currentPage * patientsPerPage)

  const handleViewPatient = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona y visualiza la información de todos los pacientes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pacientes</CardTitle>
          <CardDescription>Todos los pacientes registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Padre/Madre</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Última visita</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Cargando pacientes...
                    </TableCell>
                  </TableRow>
                ) : currentPatients.length > 0 ? (
                  currentPatients.map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell className="font-medium">{patient.firstName} {patient.lastName}</TableCell>
                      <TableCell>{patient.parentName || "-"}</TableCell>
                      <TableCell>{calculateAge(patient.birthDate)}</TableCell>
                      <TableCell>{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : "Sin visitas"}</TableCell>
                      <TableCell>
                        <Badge variant={patient.status === "Activo" ? "default" : "secondary"}>
                          {patient.status || "Activo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewPatient(patient._id)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver paciente</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No se encontraron pacientes
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="text-sm">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Función para calcular la edad basada en la fecha de nacimiento
function calculateAge(birthDate?: string): string {
  if (!birthDate) return "-";
  
  const birth = new Date(birthDate);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  
  // Para niños menores de 1 año, mostrar meses
  if (years < 1) {
    let months = (now.getMonth() + 12 - birth.getMonth()) % 12;
    if (now.getDate() < birth.getDate()) {
      months--;
    }
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

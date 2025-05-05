// Página de pacientes (solo para administradores)
// Muestra una lista de todos los pacientes registrados

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Datos de ejemplo para los pacientes
const mockPatients = [
  {
    id: "1",
    name: "Ana García",
    parentName: "María García",
    age: "3 años",
    lastVisit: "2025-04-25",
    status: "Activo",
  },
  {
    id: "2",
    name: "Luis Pérez",
    parentName: "Carlos Pérez",
    age: "2 años",
    lastVisit: "2025-04-20",
    status: "Activo",
  },
  {
    id: "3",
    name: "Sofía Rodríguez",
    parentName: "Laura Rodríguez",
    age: "4 años",
    lastVisit: "2025-04-15",
    status: "Activo",
  },
  {
    id: "4",
    name: "Diego Martínez",
    parentName: "José Martínez",
    age: "1 año",
    lastVisit: "2025-04-10",
    status: "Inactivo",
  },
  {
    id: "5",
    name: "Valentina López",
    parentName: "Ana López",
    age: "5 años",
    lastVisit: "2025-04-05",
    status: "Activo",
  },
]

export default function PatientsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const patientsPerPage = 10

  // Filtrar pacientes según el término de búsqueda
  const filteredPatients = mockPatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.parentName.toLowerCase().includes(searchTerm.toLowerCase()),
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
                {currentPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.parentName}</TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>{new Date(patient.lastVisit).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={patient.status === "Activo" ? "default" : "secondary"}>{patient.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleViewPatient(patient.id)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver paciente</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {currentPatients.length === 0 && (
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

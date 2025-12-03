// Manejo de errores para la pagina de detalle del nino

"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log del error para debugging
    console.error("Error en pagina de detalle de nino:", error)
  }, [error])

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Navegacion */}
      <div className="mb-6">
        <Link href="/dashboard/patients">
          <Button variant="ghost" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Pacientes
          </Button>
        </Link>
      </div>

      {/* Card de error */}
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Error al cargar informacion</CardTitle>
          <CardDescription>
            No se pudo cargar la informacion del nino. Esto puede deberse a un
            problema de conexion o a que el nino no existe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensaje de error */}
          {error.message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground font-mono">
                {error.message}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Intentar nuevamente
            </Button>
            <Link href="/dashboard/patients">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                Volver a Pacientes
              </Button>
            </Link>
          </div>

          {/* Digest para soporte */}
          {error.digest && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              Codigo de error: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

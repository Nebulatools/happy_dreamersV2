// Cliente de la pagina de diagnosticos
// Muestra pantalla de seleccion y redirige solo cuando el admin
// selecciona un paciente activamente (no por persistencia de localStorage)

"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { useActiveChild } from "@/context/active-child-context"
import {
  ClipboardList,
  Loader2,
  ArrowUp,
} from "lucide-react"

export default function DiagnosticosClient() {
  const router = useRouter()
  const { activeChildId, isInitialized } = useActiveChild()
  // Ref para ignorar el valor persistido de localStorage al montar
  const hasInitializedRef = useRef(false)

  // Solo redirigir cuando el admin selecciona un nino DESPUES de montar
  // (no auto-redirigir con el valor persistido en localStorage)
  useEffect(() => {
    if (!isInitialized) return

    // Primera vez: registrar estado inicial sin redirigir
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      return
    }

    // Cambios posteriores: redirigir al panel del nino seleccionado
    if (activeChildId) {
      router.push(`/dashboard/diagnosticos/${activeChildId}`)
    }
  }, [activeChildId, isInitialized, router])

  // Loading mientras se inicializa el contexto
  if (!isInitialized) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Siempre mostrar pantalla de seleccion al entrar a /diagnosticos
  // La redireccion ocurre solo cuando el admin cambia la seleccion
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Panel de Diagnostico
        </h1>
        <p className="text-muted-foreground">
          Motor de validacion clinica para pacientes
        </p>
      </div>

      {/* Instruccion para seleccionar nino */}
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="relative">
            <ClipboardList className="h-16 w-16 mx-auto text-indigo-400 mb-6" />

            {/* Flecha animada apuntando al selector */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <ArrowUp className="h-8 w-8 text-indigo-500 animate-bounce" />
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-3">
            Selecciona un paciente
          </h3>
          <p className="text-muted-foreground mb-4">
            Usa el selector de pacientes en la barra superior para elegir
            el nino cuyo diagnostico deseas ver.
          </p>
          <div className="bg-indigo-50 rounded-lg p-4 text-sm text-indigo-700">
            <strong>Tip:</strong> El selector muestra todos los pacientes.
            Puedes buscar por nombre o email del padre.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

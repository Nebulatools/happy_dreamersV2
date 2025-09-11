"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useRouter } from "next/navigation"
import { useActiveChild } from "@/context/active-child-context"

export default function ContactoPage() {
  const router = useRouter()
  const { activeChildId } = useActiveChild()

  usePageHeaderConfig({
    title: "Contacto",
    showSearch: false,
    showChildSelector: true,
    showNotifications: true,
  })

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>¿Necesitas ayuda?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Usa el Asistente IA para resolver dudas y problemas comunes.</p>
          <Button size="sm" onClick={() => router.push("/dashboard/assistant")}>Abrir Asistente IA</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Encuesta de Sueño</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Completa la encuesta para recomendaciones personalizadas.</p>
          <Button size="sm" variant="outline" onClick={() => router.push(activeChildId ? `/dashboard/survey?childId=${activeChildId}` : "/dashboard/survey")}>Abrir Encuesta</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Escríbenos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Para soporte general: <a href="mailto:soporte@happydreamers.app" className="text-blue-600 underline">soporte@happydreamers.app</a></p>
          <p>• Incluye: correo, nombre del niño (o ID), descripción del problema y capturas si es posible.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documentación</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Integraciones de transcripción (Zoom/Drive/Gemini): ver guía técnica.</p>
          <Button size="sm" variant="outline" onClick={() => router.push("/docs/INTEGRATIONS-TRANSCRIPTS.md")}>Ver Documentación</Button>
        </CardContent>
      </Card>
    </div>
  )
}


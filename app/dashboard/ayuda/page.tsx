"use client"

import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePageHeaderConfig } from "@/context/page-header-context"
import { useActiveChild } from "@/context/active-child-context"
import { useRouter } from "next/navigation"

export default function AyudaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role || "parent"
  const { activeChildId } = useActiveChild()

  usePageHeaderConfig({
    title: "Ayuda",
    showSearch: false,
    showChildSelector: true,
    showNotifications: true,
  })

  const ParentHelp = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>¿Qué puedo hacer aquí?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Registrar Sueño (Dormir/Despertar/Siesta) y Alimentación.</p>
          <p>• Ver Calendario y Estadísticas de Sueño (7/30/90 días).</p>
          <p>• Activar Notificaciones y “Horario Silencioso”.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Guías rápidas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Alimentación: Pecho en minutos; Biberón en onzas (oz) se guarda en ml; Sólidos siempre “Despierto”.</p>
          <p>• Hora de fin (opcional) para Sueño/Siesta/Despertar nocturno en registro manual.</p>
          <p>• La tarjeta “Para Hoy” muestra las acciones del plan activo.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• No veo datos: selecciona un niño y registra eventos recientes.</p>
          <p>• No recibo notificaciones: verifica permisos del navegador y “Horario Silencioso”.</p>
          <p>• ¿Qué es p25–p75? Rango típico de horarios/duración (percentiles 25–75) y mediana.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Más ayuda</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Ver encuesta de sueño para recomendaciones personalizadas.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push(activeChildId ? `/dashboard/survey?childId=${activeChildId}` : "/dashboard/survey")}>Abrir Encuesta</Button>
            <Button size="sm" variant="outline" onClick={() => router.push("/dashboard/assistant")}>Asistente IA</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contactar soporte</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Si necesitas ayuda inmediata, puedes escribir al asistente o contactar a soporte de tu organización.</p>
          <div className="flex gap-2">
            <Button size="sm" className="" onClick={() => router.push("/dashboard/assistant")}>Abrir Asistente</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const AdminHelp = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Planes y Recomendaciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Plan 0 (survey+stats+RAG), Plan N (event-based), Plan N.1 (refinamiento por transcript).</p>
          <p>• Políticas: ajustes 30 min; transición 15–18m con 10–15 min; destete nocturno progresivo.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Integraciones Transcripciones</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Zoom: webhook (recording.completed) y poller S2S OAuth.</p>
          <p>• Google: Drive webhook/poller + Gemini. Ver documentación técnica.</p>
          <div>
            <Button size="sm" variant="outline" onClick={() => router.push("/docs/INTEGRATIONS-TRANSCRIPTS.md")}>Ver Docs</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Soporte y contacto</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Usa el Asistente IA para incidencias comunes o para guiar a familias.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push("/dashboard/assistant")}>Abrir Asistente</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Solución de Problemas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Insights: verifica permisos y eventos recientes (7–90 días).</p>
          <p>• Notificaciones: ObjectId correcto para user/child; revisa `notificationlogs`.</p>
          <p>• Webhooks: firma/token, canales activos, `consultation_sessions`/`reports`.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Operación</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-2">
          <p>• Configurar Vercel Cron para pollers de Drive/Zoom (con `CRON_SECRET`).</p>
          <p>• Revisar logs y métricas de latencia (fin de sesión → transcript → análisis).</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6 p-2">
      {role === "admin" ? <AdminHelp /> : <ParentHelp />}
    </div>
  )
}

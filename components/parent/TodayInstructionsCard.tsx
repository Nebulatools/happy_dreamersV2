"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"

interface TodayInstructionsCardProps {
  childId: string
}

type PlanSchedule = {
  bedtime?: string
  wakeTime?: string
  naps?: Array<{ time: string; duration?: number; description?: string }>
}

function toTodayDate(timeHHMM: string): Date {
  const [h, m] = timeHHMM.split(":").map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return d
}

function diffMinutes(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60))
}

export default function TodayInstructionsCard({ childId }: TodayInstructionsCardProps) {
  const { data: session } = useSession()
  const [schedule, setSchedule] = React.useState<PlanSchedule | null>(null)
  const [prevSchedule, setPrevSchedule] = React.useState<PlanSchedule | null>(null)
  const [version, setVersion] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!childId) return

    const load = async () => {
      try {
        // Plan activo
        const activeRes = await fetch(`/api/children/${childId}/active-plan`)
        if (activeRes.ok) {
          const active = await activeRes.json()
          setSchedule(active?.schedule || null)
          setVersion(active?.planNumber != null ? String(active.planNumber) : null)
        }

        // Últimos dos planes para detectar cambios
        if (session?.user?.id) {
          const listRes = await fetch(`/api/consultas/plans?childId=${childId}&userId=${session.user.id}`)
          if (listRes.ok) {
            const data = await listRes.json()
            const plans = (data?.plans || []).sort((a: any, b: any) => {
              // ordenar por planNumber, luego por createdAt
              if (a.planNumber !== b.planNumber) return a.planNumber - b.planNumber
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })
            if (plans.length >= 2) {
              const prev = plans[plans.length - 2]
              setPrevSchedule(prev?.schedule || null)
            }
          }
        }
      } catch (_) {
        // silencioso
      }
    }
    load()
  }, [childId, session?.user?.id])

  // Solo para padres (no admin)
  if (session?.user?.role === "admin") return null
  if (!schedule) return null

  const now = new Date()

  type Item = { id: string; label: string; time: string; minutesUntil: number; changed?: boolean; oldTime?: string; extra?: string }
  const items: Item[] = []

  if (schedule.wakeTime) {
    const t = schedule.wakeTime
    items.push({
      id: `wake-${t}`,
      label: "Despertar",
      time: t,
      minutesUntil: diffMinutes(toTodayDate(t), now),
      changed: !!(prevSchedule?.wakeTime && prevSchedule.wakeTime !== t && Math.abs(diffMinutes(toTodayDate(t), toTodayDate(prevSchedule.wakeTime))) >= 15),
      oldTime: prevSchedule?.wakeTime || undefined
    })
  }

  if (Array.isArray(schedule.naps)) {
    schedule.naps.forEach((n, idx) => {
      if (!n?.time) return
      items.push({
        id: `nap-${idx}`,
        label: n.description ? `Siesta: ${n.description}` : "Siesta",
        time: n.time,
        minutesUntil: diffMinutes(toTodayDate(n.time), now),
        changed: !!(prevSchedule?.naps?.[idx]?.time && prevSchedule.naps[idx].time !== n.time && Math.abs(diffMinutes(toTodayDate(n.time), toTodayDate(prevSchedule.naps[idx].time))) >= 15),
        oldTime: prevSchedule?.naps?.[idx]?.time,
        extra: n.duration ? `${n.duration} min` : undefined
      })
    })
  }

  if (schedule.bedtime) {
    const t = schedule.bedtime
    items.push({
      id: `bed-${t}`,
      label: "Acostarse",
      time: t,
      minutesUntil: diffMinutes(toTodayDate(t), now),
      changed: !!(prevSchedule?.bedtime && prevSchedule.bedtime !== t && Math.abs(diffMinutes(toTodayDate(t), toTodayDate(prevSchedule.bedtime))) >= 15),
      oldTime: prevSchedule?.bedtime || undefined
    })
  }

  // Orden por hora del día
  const ordered = items.sort((a, b) => toTodayDate(a.time).getTime() - toTodayDate(b.time).getTime())

  const proximity = (mins: number) => {
    if (mins <= 15 && mins >= -30) return <Badge variant="good" className="text-xs">Ahora</Badge>
    if (mins > 15 && mins <= 120) return <span className="text-xs text-amber-700">En {mins} min</span>
    if (mins < -30) return <span className="text-xs text-gray-500">Hoy</span>
    return null
  }

  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-700">
          Para Hoy {version ? <span className="text-gray-400 font-normal">(Plan {version})</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {ordered.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-gray-800">{it.time}</span>
                  {it.changed && (
                    <Badge variant="secondary" className="text-[10px]">Cambió</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-600 line-clamp-1">
                  {it.label}
                  {it.extra ? <span className="ml-1 text-gray-500">• {it.extra}</span> : null}
                  {it.changed && it.oldTime ? (
                    <span className="ml-2 text-amber-700">antes: {it.oldTime} → ahora: {it.time}</span>
                  ) : null}
                </div>
              </div>
              <div className="ml-2 shrink-0">
                {proximity(it.minutesUntil)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


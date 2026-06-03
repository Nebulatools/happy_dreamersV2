// Tools del asistente flotante de Happy Dreamers (tool-calling con el ai SDK v4).
// Replican las capacidades de Yose pero llamando DIRECTO a los servicios internos
// (sin API key), usando la sesión del usuario como actor.

import { tool } from "ai"
import { z } from "zod"
import { Db, ObjectId } from "mongodb"
import {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  EventServiceError,
} from "@/lib/events/event-service"
import { computeCurrentSleepState } from "@/lib/events/sleep-state"
import { processSleepStatistics, SleepEvent } from "@/lib/sleep-calculations"
import { getAccessibleChildren } from "@/lib/db/user-child-access"
import { getStartOfDayAsDate } from "@/lib/datetime"
import { labelES, clampNum, timeES, rangeES, isoFromWallClock } from "./format"
import { createLogger } from "@/lib/logger"

const logger = createLogger("assistant:tools")

export interface AssistantSideEffects {
  setActiveChild?: { id: string; name: string }
  eventsChanged?: boolean
}

export interface AssistantCtx {
  db: Db
  actor: { id: string; role?: string | null }
  childId: string | null
  childName: string | null
  timezone: string
  sideEffects: AssistantSideEffects
}

function iso(dateStr: string, timeStr: string, tz: string): string {
  return isoFromWallClock(dateStr, timeStr, tz)
}

function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
}

export function createAssistantTools(ctx: AssistantCtx) {
  const { db, actor, timezone } = ctx
  const cid = () => ctx.childId

  return {
    // ---------- REGISTRAR EVENTO ----------
    register_event: tool({
      description:
        "Registra un evento del niño activo: sleep, nap, wake, night_waking, feeding, medication o extra_activities. " +
        "Resuelve fechas relativas ('anoche','hoy','ayer') usando la fecha actual del sistema que se da en el contexto.",
      parameters: z.object({
        eventType: z.enum(["sleep", "nap", "wake", "night_waking", "feeding", "medication", "extra_activities"]),
        dateStr: z.string().describe("Fecha de inicio YYYY-MM-DD"),
        timeStr: z.string().describe("Hora de inicio HH:mm en 24h"),
        endDateStr: z.string().optional().describe("Fecha de fin YYYY-MM-DD (para sleep/nap/night_waking)"),
        endTimeStr: z.string().optional().describe("Hora de fin HH:mm"),
        emotionalState: z.enum(["tranquilo", "inquieto", "alterado", "neutral"]).optional(),
        sleepDelay: z.number().optional().describe("Minutos en dormirse, 0-180"),
        awakeDelay: z.number().optional().describe("Minutos despierto (night_waking), 0-180"),
        feedingType: z.enum(["breast", "bottle", "solids"]).optional(),
        babyState: z.enum(["awake", "asleep"]).optional(),
        feedingAmount: z.number().optional().describe("ml (biberón) o gr (sólidos)"),
        isNightFeeding: z.boolean().optional(),
        medicationName: z.string().optional(),
        medicationDose: z.string().optional(),
        activityDescription: z.string().optional(),
        activityDuration: z.number().optional().describe("minutos 5-180"),
        notes: z.string().optional(),
      }),
      execute: async (a) => {
        const childId = cid()
        if (!childId) return "NO_CHILD: no hay niño seleccionado; pide al usuario elegir uno."
        try {
          const startTime = iso(a.dateStr, a.timeStr, timezone)
          const endTime = a.endTimeStr ? iso(a.endDateStr || a.dateStr, a.endTimeStr, timezone) : undefined
          const data: any = {
            childId,
            eventType: a.eventType,
            startTime,
            endTime,
            emotionalState: a.emotionalState,
            notes: a.notes,
            sleepDelay: clampNum(a.sleepDelay, 0, 180),
            awakeDelay: clampNum(a.awakeDelay, 0, 180),
          }
          if (a.eventType === "feeding") {
            data.feedingType = a.feedingType
            data.babyState = a.feedingType === "solids" ? "awake" : a.babyState || "awake"
            data.feedingAmount = a.feedingAmount
            data.isNightFeeding = a.isNightFeeding ?? false
          }
          if (a.eventType === "medication") {
            data.medicationName = a.medicationName
            data.medicationDose = a.medicationDose
          }
          if (a.eventType === "extra_activities") {
            data.activityDescription = a.activityDescription
            data.activityDuration = clampNum(a.activityDuration, 5, 180)
          }
          const ev = await createEvent(db, actor, data)
          ctx.sideEffects.eventsChanged = true
          const when = endTime ? rangeES(startTime, endTime, timezone) : timeES(startTime, timezone)
          return `OK: registré ${labelES(a.eventType)} ${when}${a.emotionalState ? ` (${a.emotionalState})` : ""}. eventId=${ev._id}`
        } catch (e: any) {
          if (e instanceof EventServiceError) return `ERROR_DATOS: ${e.message}`
          logger.error("register_event", e)
          return `ERROR: no se pudo registrar (${e?.message || "desconocido"})`
        }
      },
    }),

    // ---------- LISTAR EVENTOS ----------
    list_events: tool({
      description: "Lista los últimos eventos registrados del niño activo (para 'qué le registré', 'historial').",
      parameters: z.object({ limit: z.number().optional().describe("cuántos, default 8") }),
      execute: async ({ limit }) => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const { events } = await listEvents(db, actor, childId)
          const recent = events.slice(-(limit && limit > 0 ? limit : 8)).reverse()
          if (!recent.length) return "No hay eventos registrados todavía."
          return recent
            .map((e: any, i: number) => {
              const when = e.endTime ? rangeES(e.startTime, e.endTime, timezone) : timeES(e.startTime, timezone)
              return `${i + 1}. ${labelES(e.eventType)} — ${when} [id=${e._id}]`
            })
            .join("\n")
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo listar"}`
        }
      },
    }),

    // ---------- EDITAR ÚLTIMO EVENTO ----------
    edit_last_event: tool({
      description:
        "Corrige el último evento (o el último de un tipo) del niño activo: cambia hora de inicio/fin, estado emocional, delays o notas.",
      parameters: z.object({
        eventType: z.enum(["sleep", "nap", "wake", "night_waking", "feeding", "medication", "extra_activities"]).optional(),
        startDateStr: z.string().optional(),
        startTimeStr: z.string().optional(),
        endDateStr: z.string().optional(),
        endTimeStr: z.string().optional(),
        emotionalState: z.enum(["tranquilo", "inquieto", "alterado", "neutral"]).optional(),
        sleepDelay: z.number().optional(),
        awakeDelay: z.number().optional(),
        notes: z.string().optional(),
      }),
      execute: async (a) => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const { events } = await listEvents(db, actor, childId)
          const pool = a.eventType ? events.filter((e: any) => e.eventType === a.eventType) : events
          const target = pool[pool.length - 1]
          if (!target) return "No encontré un evento para editar."
          const merged: any = {
            id: target._id,
            childId,
            eventType: target.eventType,
            startTime: a.startTimeStr ? iso(a.startDateStr || (target.startTime || "").slice(0, 10), a.startTimeStr, timezone) : target.startTime,
            endTime: a.endTimeStr ? iso(a.endDateStr || (target.startTime || "").slice(0, 10), a.endTimeStr, timezone) : target.endTime,
            emotionalState: a.emotionalState ?? target.emotionalState,
            sleepDelay: a.sleepDelay !== undefined ? clampNum(a.sleepDelay, 0, 180) : target.sleepDelay,
            awakeDelay: a.awakeDelay !== undefined ? clampNum(a.awakeDelay, 0, 180) : target.awakeDelay,
            notes: a.notes ?? target.notes,
            feedingType: target.feedingType,
            feedingAmount: target.feedingAmount,
            babyState: target.babyState,
            isNightFeeding: target.isNightFeeding,
            medicationName: target.medicationName,
            medicationDose: target.medicationDose,
            activityDescription: target.activityDescription,
            activityDuration: target.activityDuration,
            createdAt: target.createdAt,
          }
          await updateEvent(db, actor, merged)
          ctx.sideEffects.eventsChanged = true
          const when = merged.endTime ? rangeES(merged.startTime, merged.endTime, timezone) : timeES(merged.startTime, timezone)
          return `OK: actualicé ${labelES(target.eventType)} — ${when}.`
        } catch (e: any) {
          if (e instanceof EventServiceError) return `ERROR_DATOS: ${e.message}`
          return `ERROR: ${e?.message || "no se pudo editar"}`
        }
      },
    }),

    // ---------- BORRAR ÚLTIMO(S) (con confirmación) ----------
    delete_last_event: tool({
      description:
        "Borra el último evento (o los últimos N, o el último de un tipo) del niño activo. " +
        "SIEMPRE llama primero con confirmed=false para mostrar qué se borraría; solo borra cuando el usuario confirma (confirmed=true).",
      parameters: z.object({
        count: z.number().optional().describe("cuántos, default 1"),
        eventType: z.enum(["sleep", "nap", "wake", "night_waking", "feeding", "medication", "extra_activities"]).optional(),
        confirmed: z.boolean().optional().describe("true SOLO si el usuario ya confirmó"),
      }),
      execute: async (a) => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const { events } = await listEvents(db, actor, childId)
          const pool = a.eventType ? events.filter((e: any) => e.eventType === a.eventType) : events
          const n = Math.min(Math.max(a.count || 1, 1), 10)
          const targets = pool.slice(-n).reverse()
          if (!targets.length) return "No encontré eventos para borrar."
          const resumen = targets
            .map((e: any) => `${labelES(e.eventType)} ${e.endTime ? rangeES(e.startTime, e.endTime, timezone) : timeES(e.startTime, timezone)}`)
            .join(", ")
          if (!a.confirmed) {
            return `CONFIRMAR: vas a borrar ${targets.length} evento(s): ${resumen}. Pregunta al usuario si confirma antes de volver a llamar con confirmed=true.`
          }
          for (const e of targets) {
            await deleteEvent(db, actor, e._id.toString(), childId)
          }
          ctx.sideEffects.eventsChanged = true
          return `OK: borré ${targets.length} evento(s): ${resumen}.`
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo borrar"}`
        }
      },
    }),

    // ---------- ESTADÍSTICAS ----------
    get_stats: tool({
      description: "Estadísticas de sueño del niño activo (para '¿cómo durmió?', '¿cómo durmió esta semana?').",
      parameters: z.object({ fromDateStr: z.string().optional().describe("YYYY-MM-DD si se acota el período") }),
      execute: async ({ fromDateStr }) => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const { events } = await listEvents(db, actor, childId)
          const mapped: SleepEvent[] = events.map((e: any) => ({
            _id: e._id?.toString(),
            eventType: e.eventType,
            startTime: e.startTime,
            endTime: e.endTime,
            notes: e.notes,
            emotionalState: e.emotionalState,
            sleepDelay: e.sleepDelay,
            didNotSleep: e.didNotSleep,
          }))
          const from = fromDateStr ? getStartOfDayAsDate(fromDateStr, timezone) : undefined
          const s = processSleepStatistics(mapped, from)
          return JSON.stringify({
            sueno_promedio_h: s.avgSleepDuration,
            siesta_promedio_h: s.avgNapDuration,
            hora_dormir_prom: s.avgBedtime,
            hora_despertar_prom: s.avgWakeTime,
            despertares_totales: s.totalWakeups,
            despertares_por_noche: s.avgWakeupsPerNight,
            total_eventos: s.totalEvents,
          })
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudieron calcular estadísticas"}`
        }
      },
    }),

    // ---------- ESTADO ACTUAL ----------
    get_sleep_state: tool({
      description: "Estado de sueño actual del niño activo ('¿está dormido?', '¿sigue despierto?').",
      parameters: z.object({}),
      execute: async () => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const st = await computeCurrentSleepState(db, childId, { timezone })
          return JSON.stringify(st)
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo obtener el estado"}`
        }
      },
    }),

    // ---------- NIÑOS ----------
    list_children: tool({
      description: "Lista los niños del usuario (para '¿qué niños tengo?').",
      parameters: z.object({}),
      execute: async () => {
        try {
          const kids = await getAccessibleChildren(actor.id)
          if (!kids.length) return "No tienes niños registrados."
          return kids
            .map((c: any) => `${c.firstName} ${c.lastName}${c._id.toString() === cid() ? " (actual)" : ""}${c.archived ? " (archivado)" : ""}`)
            .join("\n")
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo listar niños"}`
        }
      },
    }),

    set_active_child: tool({
      description: "Cambia el niño activo por nombre ('cambia a Sofía', 'registra para Juan').",
      parameters: z.object({ childName: z.string().describe("nombre del niño") }),
      execute: async ({ childName }) => {
        try {
          const kids = await getAccessibleChildren(actor.id)
          const q = norm(childName)
          const match =
            kids.find((c: any) => norm(`${c.firstName} ${c.lastName}`).includes(q)) ||
            kids.find((c: any) => norm(c.firstName).includes(q))
          if (!match) {
            return `No encontré a "${childName}". Niños: ${kids.map((c: any) => c.firstName).join(", ")}`
          }
          const id = match._id.toString()
          const name = `${match.firstName} ${match.lastName}`.trim()
          ctx.childId = id
          ctx.childName = name
          ctx.sideEffects.setActiveChild = { id, name }
          return `OK: ahora trabajo con ${name}.`
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo cambiar de niño"}`
        }
      },
    }),

    // ---------- NOTIFICACIONES ----------
    create_notification: tool({
      description: "Crea o programa una notificación/recordatorio para el niño activo.",
      parameters: z.object({
        title: z.string(),
        message: z.string(),
        scheduledDateStr: z.string().optional().describe("YYYY-MM-DD si se programa"),
        scheduledTimeStr: z.string().optional().describe("HH:mm si se programa"),
        type: z.string().optional(),
      }),
      execute: async (a) => {
        const childId = cid()
        if (!childId) return "NO_CHILD"
        try {
          const scheduledFor =
            a.scheduledDateStr && a.scheduledTimeStr ? new Date(iso(a.scheduledDateStr, a.scheduledTimeStr, timezone)) : null
          await db.collection("notificationlogs").insertOne({
            _id: new ObjectId(),
            userId: new ObjectId(actor.id),
            childId: new ObjectId(childId),
            type: a.type || "custom",
            title: a.title.slice(0, 140),
            message: a.message.slice(0, 1000),
            status: scheduledFor ? "scheduled" : "sent",
            scheduledFor,
            source: "assistant",
            createdAt: new Date().toISOString(),
          } as any)
          return `OK: notificación creada${scheduledFor ? ` para ${timeES(scheduledFor.toISOString(), timezone)}` : ""}.`
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudo crear la notificación"}`
        }
      },
    }),

    list_notifications: tool({
      description: "Lista las notificaciones del niño activo.",
      parameters: z.object({}),
      execute: async () => {
        const childId = cid()
        try {
          const filter: any = { userId: new ObjectId(actor.id) }
          if (childId) filter.childId = new ObjectId(childId)
          const docs = await db.collection("notificationlogs").find(filter).sort({ createdAt: -1 }).limit(10).toArray()
          if (!docs.length) return "No hay notificaciones."
          return docs.map((n: any, i: number) => `${i + 1}. ${n.title || n.message}`).join("\n")
        } catch (e: any) {
          return `ERROR: ${e?.message || "no se pudieron listar"}`
        }
      },
    }),

    // ---------- CONSEJOS (RAG) ----------
    search_knowledge: tool({
      description:
        "Busca en la base de conocimiento de sueño infantil para responder DUDAS/consejos (no para registrar). Úsala cuando el usuario pregunte cómo mejorar algo, recomendaciones, etc.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        try {
          const { getMongoDBVectorStoreManager } = await import("@/lib/rag/vector-store-mongodb")
          const vs = getMongoDBVectorStoreManager()
          const docs = await vs.searchSimilar(query, 3)
          if (!docs?.length) return "Sin documentos relevantes; responde con conocimiento general y tono cálido."
          return docs.map((d: any) => d.pageContent).join("\n---\n").slice(0, 2500)
        } catch (e: any) {
          return "Sin documentos disponibles; responde con conocimiento general y tono cálido."
        }
      },
    }),
  }
}

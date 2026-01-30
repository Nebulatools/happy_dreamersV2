/**
 * Tests para processSleepSessions
 *
 * Verifica que processSleepSessions:
 * - Agrupa eventos sleep con sus night_wakings correctamente
 * - Detecta overlayEvents (feeding, medication) que ocurren durante el sueno
 * - Excluye overlayEvents de otherEvents para evitar duplicacion
 * - Maneja sesiones que cruzan dias correctamente
 */

import {
  processSleepSessions,
  Event,
  SleepSession,
} from "@/lib/utils/sleep-sessions"

// Helper para crear eventos de prueba
function createEvent(
  overrides: Partial<Event> & { _id: string; eventType: string }
): Event {
  return {
    childId: "child-123",
    emotionalState: "calm",
    startTime: "2026-01-20T08:00:00.000-06:00",
    ...overrides,
  }
}

describe("processSleepSessions", () => {
  describe("overlayEvents - feeding durante sueno", () => {
    it("detecta feeding que ocurre durante sesion de sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("feeding-1")
    })

    it("detecta multiples feedings durante una sesion", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T02:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-2",
          eventType: "feeding",
          startTime: "2026-01-20T05:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(2)
      expect(result.sessions[0].overlayEvents.map((e) => e._id)).toContain(
        "feeding-1"
      )
      expect(result.sessions[0].overlayEvents.map((e) => e._id)).toContain(
        "feeding-2"
      )
    })

    it("no incluye feeding que ocurre antes del sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "feeding-before",
          eventType: "feeding",
          startTime: "2026-01-19T20:00:00.000-06:00",
        }),
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.otherEvents).toHaveLength(1)
      expect(result.otherEvents[0]._id).toBe("feeding-before")
    })

    it("no incluye feeding que ocurre despues del sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-after",
          eventType: "feeding",
          startTime: "2026-01-20T08:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.otherEvents).toHaveLength(1)
      expect(result.otherEvents[0]._id).toBe("feeding-after")
    })

    it("excluye overlayEvents de otherEvents para evitar duplicacion", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-during",
          eventType: "feeding",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-after",
          eventType: "feeding",
          startTime: "2026-01-20T08:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      // feeding-during esta en overlayEvents, NO en otherEvents
      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("feeding-during")

      // feeding-after esta en otherEvents, NO en overlayEvents
      expect(result.otherEvents).toHaveLength(1)
      expect(result.otherEvents[0]._id).toBe("feeding-after")
    })
  })

  describe("overlayEvents - medication durante sueno", () => {
    it("detecta medication que ocurre durante sesion de sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "medication-1",
          eventType: "medication",
          startTime: "2026-01-20T04:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("medication-1")
      expect(result.sessions[0].overlayEvents[0].eventType).toBe("medication")
    })

    it("detecta mezcla de feeding y medication durante sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T02:00:00.000-06:00",
        }),
        createEvent({
          _id: "medication-1",
          eventType: "medication",
          startTime: "2026-01-20T04:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(2)
      const overlayTypes = result.sessions[0].overlayEvents.map(
        (e) => e.eventType
      )
      expect(overlayTypes).toContain("feeding")
      expect(overlayTypes).toContain("medication")
    })
  })

  describe("overlayEvents - exclusion de tipos", () => {
    it("NO incluye night_waking en overlayEvents (ya esta en nightWakings)", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "night-waking-1",
          eventType: "night_waking",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.sessions[0].nightWakings).toHaveLength(1)
      expect(result.sessions[0].nightWakings[0]._id).toBe("night-waking-1")
    })

    it("NO incluye nap en overlayEvents (es una sesion separada)", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "nap-1",
          eventType: "nap",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      // nap va a otherEvents porque no es overlay
      expect(result.otherEvents.find((e) => e._id === "nap-1")).toBeDefined()
    })

    it("NO incluye wake en overlayEvents", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "wake-1",
          eventType: "wake",
          startTime: "2026-01-20T07:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      // wake correspondiente al sleep es marcado como procesado
    })

    it("NO incluye otro sleep en overlayEvents", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "sleep-2",
          eventType: "sleep",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      // Ambos son sesiones separadas
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.sessions[1].overlayEvents).toHaveLength(0)
    })
  })

  describe("overlayEvents - extra_activities", () => {
    it("detecta extra_activities durante sueno", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "activity-1",
          eventType: "extra_activities",
          startTime: "2026-01-20T05:30:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("activity-1")
    })
  })

  describe("overlayEvents - sueno sin endTime (en progreso)", () => {
    it("incluye feeding que ocurre despues del inicio de sueno en progreso", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          // sin endTime = en progreso
        }),
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("feeding-1")
    })
  })

  describe("nightWakings - separacion de overlayEvents", () => {
    it("mantiene night_wakings en su campo y feeding en overlayEvents", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "night-waking-1",
          eventType: "night_waking",
          startTime: "2026-01-20T02:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T02:15:00.000-06:00",
        }),
        createEvent({
          _id: "night-waking-2",
          eventType: "night_waking",
          startTime: "2026-01-20T05:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions[0].nightWakings).toHaveLength(2)
      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("feeding-1")
    })
  })

  describe("sesiones multiples", () => {
    it("cada sesion tiene sus propios overlayEvents", () => {
      const events: Event[] = [
        // Siesta
        createEvent({
          _id: "nap-1",
          eventType: "nap",
          startTime: "2026-01-20T14:00:00.000-06:00",
          endTime: "2026-01-20T16:00:00.000-06:00",
        }),
        // Sueno nocturno (no procesado como sesion porque es nap, no sleep)
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-20T21:00:00.000-06:00",
          endTime: "2026-01-21T07:00:00.000-06:00",
        }),
        // Feeding durante sueno nocturno
        createEvent({
          _id: "feeding-night",
          eventType: "feeding",
          startTime: "2026-01-21T03:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      // Solo sleep se convierte en sesion, nap va a otherEvents
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].originalEvent._id).toBe("sleep-1")
      expect(result.sessions[0].overlayEvents).toHaveLength(1)
      expect(result.sessions[0].overlayEvents[0]._id).toBe("feeding-night")

      // nap esta en otherEvents
      expect(result.otherEvents.find((e) => e._id === "nap-1")).toBeDefined()
    })
  })

  describe("casos limite", () => {
    it("evento exactamente en el limite de inicio NO es overlay", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-at-start",
          eventType: "feeding",
          startTime: "2026-01-19T21:00:00.000-06:00", // exactamente igual
        }),
      ]

      const result = processSleepSessions(events)

      // No es overlay porque no es > startTime
      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.otherEvents.find((e) => e._id === "feeding-at-start")).toBeDefined()
    })

    it("evento exactamente en el limite de fin NO es overlay", () => {
      const events: Event[] = [
        createEvent({
          _id: "sleep-1",
          eventType: "sleep",
          startTime: "2026-01-19T21:00:00.000-06:00",
          endTime: "2026-01-20T07:00:00.000-06:00",
        }),
        createEvent({
          _id: "feeding-at-end",
          eventType: "feeding",
          startTime: "2026-01-20T07:00:00.000-06:00", // exactamente igual al fin
        }),
      ]

      const result = processSleepSessions(events)

      // No es overlay porque no es < endTime
      expect(result.sessions[0].overlayEvents).toHaveLength(0)
      expect(result.otherEvents.find((e) => e._id === "feeding-at-end")).toBeDefined()
    })

    it("maneja lista vacia de eventos", () => {
      const result = processSleepSessions([])

      expect(result.sessions).toHaveLength(0)
      expect(result.otherEvents).toHaveLength(0)
    })

    it("maneja eventos sin ningun sleep", () => {
      const events: Event[] = [
        createEvent({
          _id: "feeding-1",
          eventType: "feeding",
          startTime: "2026-01-20T08:00:00.000-06:00",
        }),
        createEvent({
          _id: "medication-1",
          eventType: "medication",
          startTime: "2026-01-20T09:00:00.000-06:00",
        }),
      ]

      const result = processSleepSessions(events)

      expect(result.sessions).toHaveLength(0)
      expect(result.otherEvents).toHaveLength(2)
    })
  })
})
